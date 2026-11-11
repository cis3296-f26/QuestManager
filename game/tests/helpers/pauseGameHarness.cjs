// Run the actual game entry point with a small DOM/auth boundary, without network or DB access.
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../../..");
const turn = () => new Promise((resolve) => setImmediate(resolve));

(async () => {
    const elements = new Map(), windowEvents = new Map(), disk = new Map();
    let document;
    const node = (id = "") => ({ id, hidden: false, disabled: false, open: false, children: [], handlers: new Map(),
        classList: { add() {}, toggle() {} }, setAttribute() {},
        replaceChildren(...children) { this.children = children; }, appendChild(child) { this.children.push(child); },
        querySelector() { return null; },
        addEventListener(type, handler) { this.handlers.set(type, [...(this.handlers.get(type) ?? []), handler]); },
        emit(type, extra = {}) { const event = { target: this, preventDefault() { this.prevented = true; }, ...extra }; for (const fn of this.handlers.get(type) ?? []) fn(event); return event; },
        focus() { document.activeElement = this; }, showModal() { this.open = true; this.focus(); },
        close() { if (this.open) { this.open = false; this.emit("close"); } }
    });
    const nodes = Array.from({ length: 10 }, (_, i) => Object.assign(node(), { dataset: { level: String(i + 1) } }));
    document = { activeElement: null, getElementById(id) { if (!elements.has(id)) elements.set(id, node(id)); return elements.get(id); }, createElement: () => node(), querySelectorAll: () => nodes };
    const element = (id) => document.getElementById(id);
    const ctx = new Proxy({ globalAlpha: 1, measureText: (text) => ({ width: text.length * 8 }) }, { get: (o, key) => o[key] ?? (() => {}) });
    Object.assign(element("gameCanvas"), { width: 960, height: 540, getContext: () => ctx });
    const window = { addEventListener: (key, handler) => windowEvents.set(key, handler), localStorage: {
        getItem: (key) => disk.get(key) ?? null, setItem: (key, value) => disk.set(key, value)
    } };
    const location = { value: "#level-1", get hash() { return this.value; }, set hash(value) { this.value = value; queueMicrotask(() => windowEvents.get("hashchange")?.()); } };
    let account = "pause-A", authCallback;
    const supabase = { auth: { onAuthStateChange(fn) { authCallback = fn; return { data: { subscription: { unsubscribe() {} } } }; },
        async getSession() { return { data: { session: account ? { user: { id: account } } : null } }; } } };
    const context = vm.createContext({ document, window, location, requestAnimationFrame() {}, console });
    const client = new vm.SyntheticModule(["supabase"], function () { this.setExport("supabase", supabase); }, { context });
    await client.link(() => {}); await client.evaluate();
    const create = (source, id) => new vm.SourceTextModule(source, { context, identifier: id, importModuleDynamically: async () => client });
    const source = fs.readFileSync(path.join(root, "game/game.js"), "utf8") +
        "\nglobalThis.api={level,pause,settings,keys,clock,gameLoop,restartLevel,startDeath,progress,get coins(){return coins},get camera(){return cameraX},get deathTime(){return deathTimeLeft},get map(){return worldMap},get playing(){return playing}};";
    const entry = create(source, "game/game.js"), cache = new Map();
    await entry.link((specifier, ref) => {
        const id = path.posix.normalize(path.posix.join(path.posix.dirname(ref.identifier), specifier));
        if (!cache.has(id)) cache.set(id, create(id === "game/rendering/AvatarRenderer.js"
            ? "export class AvatarRenderer {load(){} draw(){}}" : fs.readFileSync(path.join(root, id), "utf8"), id));
        return cache.get(id);
    });
    await entry.evaluate(); await turn();
    const a = context.api, canvas = element("gameCanvas");
    const click = (id) => element(id).emit("click");
    const escapeDialog = () => element("pauseDialog").emit("cancel");
    const key = (code, extra = {}) => canvas.emit("keydown", { code, repeat: false, ...extra });
    let time = 0;
    const frame = (seconds = 1 / 60) => { time += seconds * 1000; a.gameLoop(time); };
    const snapshot = () => JSON.stringify({ player: a.level.player, enemies: a.level.enemies, platforms: a.level.platforms,
        coins: { time: a.coins.time, pending: [...a.coins.pending], saved: [...a.coins.saved], effects: a.coins.effects },
        reveal: [...a.level.exploration.reveal], notice: a.level.exploration.noticeTime, camera: a.camera });
    for (const id of [1, 2]) {
        if (id === 2) { a.progress.completeLevel(1, []); a.map.refresh(); a.map.openLevel(2); await turn(); }
        assert.equal(a.level.config.id, id);
        for (const fps of [30, 60, 120]) {
            a.restartLevel(); canvas.focus(); frame(); frame(1 / fps);
            a.coins.pending.add(a.level.config.coins[1].id);
            const board = a.level.platforms.find((p) => p.type === "collapsing");
            if (board) board.onLand();
            key("Escape"); assert.equal(a.pause.screen, "main");
            const before = snapshot();
            // Deliberately retain canvas focus here: the explicit pause gate must freeze independently of the DOM.
            canvas.focus(); key("KeyR"); key("KeyD"); key("KeyW");
            for (let i = 0; i < fps; i++) frame(1 / fps);
            frame(100);
            assert.equal(snapshot(), before); assert.equal(a.keys.size, 0);
            click("pauseSettings"); escapeDialog();
            assert.equal(a.pause.screen, "main");
            escapeDialog(); assert.equal(a.pause.paused, false); assert.equal(document.activeElement, canvas);
            frame(100); assert.equal(snapshot(), before, "resume must not consume paused wall time");
            frame(1 / fps); assert.notEqual(snapshot(), before); assert.equal(a.coins.pending.size, 1);
            if (board) assert.ok(board.warningTime < .1);
        }
        key("Escape"); click("pauseRestart");
        const pending = [...a.coins.pending]; click("pauseCancel"); assert.deepEqual([...a.coins.pending], pending);
        click("pauseRestart"); key("KeyR"); assert.equal(a.pause.screen, "restart"); click("pauseConfirm");
        assert.equal(a.level.player.x, a.level.config.spawn.x); assert.equal(a.coins.pending.size, 0);
        assert.ok(a.level.enemies.every((e) => e.x === e.startX));
        assert.ok(a.level.platforms.filter((p) => p.type).every((p) => p.elapsed === 0 && p.state === "stable"));
        a.coins.pending.add(a.level.config.coins[2].id);
        key("Escape"); click("pauseWorldMap"); click("pauseCancel"); assert.equal(a.coins.pending.size, 1);
        click("pauseWorldMap"); click("pauseConfirm"); await turn();
        assert.equal(a.playing, false); assert.equal(a.coins.pending.size, 0); assert.equal(a.pause.paused, false);
        canvas.focus(); key("Escape"); assert.equal(a.pause.paused, false);
        a.map.openLevel(id); await turn(); canvas.focus();
        // Header navigation must use the same confirmation path.
        click("backToMap"); assert.equal(a.pause.screen, "map"); escapeDialog(); click("pauseResume");
    }
    a.startDeath("Test transition"); canvas.focus(); key("Escape"); assert.equal(a.pause.paused, false);
    for (let i = 0; i < 50; i++) frame();
    assert.equal(a.deathTime, 0);
    a.level.complete = true; element("levelCompleteDialog").showModal();
    canvas.focus(); key("Escape"); assert.equal(a.pause.paused, false); key("KeyR"); assert.equal(a.level.complete, true);
    element("levelCompleteDialog").close(); a.restartLevel(); canvas.focus();
    const x = a.level.player.x, input = node("unrelated-text-input"); input.focus();
    key("KeyR", { target: input }); key("Escape", { target: input }); frame(100);
    assert.equal(a.level.player.x, x); assert.equal(a.pause.paused, false);
    canvas.focus(); frame(); key("Escape"); click("pauseSettings");
    element("masterVolume").emit("input", { target: { value: "35" } });
    element("muted").emit("change", { target: { checked: true } });
    account = "pause-B"; authCallback("SIGNED_IN", { user: { id: account } }); await turn();
    assert.equal(a.pause.paused, false); assert.equal(a.settings.values.masterVolume, 80); assert.equal(a.settings.values.muted, false);
    assert.equal(a.coins.pending.size, 0); assert.equal(a.playing, false, "different account must unlock Level 2 for itself");
    account = "pause-A"; authCallback("SIGNED_IN", { user: { id: account } });
    assert.equal(a.settings.values.masterVolume, 35); assert.equal(a.settings.values.muted, true);
    console.log("PASS actual game wiring: frame freeze/resume at 30/60/120 FPS, menu shortcuts, confirmations, map, focus, completion/death and account changes.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
