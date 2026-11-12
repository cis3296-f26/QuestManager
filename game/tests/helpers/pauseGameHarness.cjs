// Run the actual game entry point with a small DOM/auth boundary, without network or DB access.
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../../..");
const turn = () => new Promise((resolve) => setImmediate(resolve));

(async () => {
    const elements = new Map(), windowEvents = new Map(), disk = new Map();
    let document;
    const node = (id = "") => ({ id, hidden: false, disabled: false, open: false, children: [], handlers: new Map(),
        classList: { add() {}, toggle() {} }, setAttribute() {},
        replaceChildren(...children) { this.children = children; }, appendChild(child) { this.children.push(child); if (child.id) elements.set(child.id, child); },
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
    const window = { addEventListener: (key, handler) => windowEvents.set(key, handler),
        removeEventListener(key,handler) { if(windowEvents.get(key)===handler)windowEvents.delete(key); }, localStorage: {
        getItem: (key) => disk.get(key) ?? null, setItem: (key, value) => disk.set(key, value)
    } };
    if (process.env.QUESTMANAGER_TEST_AUDIO === "1") window.AudioContext = require("./fakeAudioContext.cjs").FakeAudioContext;
    const location = { value: "#level-1", get hash() { return this.value; }, set hash(value) { this.value = value; queueMicrotask(() => windowEvents.get("hashchange")?.()); } };
    let account = "pause-A", authCallback;
    const supabase = { auth: { onAuthStateChange(fn) { authCallback = fn; return { data: { subscription: { unsubscribe() {} } } }; },
        async getSession() { return { data: { session: account ? { user: { id: account } } : null } }; } } };
    const context = vm.createContext({ document, window, location, requestAnimationFrame() {}, console, performance, setTimeout, clearTimeout });
    const client = new vm.SyntheticModule(["supabase"], function () { this.setExport("supabase", supabase); }, { context });
    await client.link(() => {}); await client.evaluate();
    const cache = new Map();
    const resolve = (specifier, ref) => path.posix.normalize(path.posix.join(path.posix.dirname(ref.identifier), specifier));
    const load = (id) => {
        if (!cache.has(id)) cache.set(id, create(id === "game/rendering/AvatarRenderer.js"
            ? "export class AvatarRenderer {load(){} draw(){}}" :
            id === "game/dev/buildConfig.js" && process.env.QUESTMANAGER_TEST_DEV === "1"
                ? "export const developmentBuild = true;" : fs.readFileSync(path.join(root, id), "utf8"), id));
        return cache.get(id);
    };
    const linker = (specifier, ref) => load(resolve(specifier, ref));
    const create = (source, id) => new vm.SourceTextModule(source, { context, identifier: id,
        importModuleDynamically: async (specifier, ref) => {
            const target = resolve(specifier, ref);
            if (target.endsWith("supabaseClient.js")) return client;
            const module = load(target);
            if (module.status === "unlinked") await module.link(linker);
            if (module.status === "linked") await module.evaluate();
            return module;
        }
    });
    const source = fs.readFileSync(path.join(root, "game/game.js"), "utf8") +
        "\nglobalThis.api={level,pause,settings,audio,developer,keys,clock,gameLoop,restartLevel,startDeath,progress,get coins(){return coins},get camera(){return cameraX},get deathTime(){return deathTimeLeft},get map(){return worldMap},get playing(){return playing}};";
    const entry = create(source, "game/game.js");
    await entry.link(linker);
    await entry.evaluate(); await turn();
    const a = context.api, canvas = element("gameCanvas");
    const click = (id) => element(id).emit("click");
    const escapeDialog = () => element("pauseDialog").emit("cancel");
    const key = (code, extra = {}) => canvas.emit("keydown", { code, repeat: false, ...extra });
    let time = 0;
    const frame = (seconds = 1 / 60) => { time += seconds * 1000; a.audio.context?.advance(seconds); a.gameLoop(time); };
    const snapshot = () => JSON.stringify({ player: a.level.player, enemies: a.level.enemies, platforms: a.level.platforms, rocks: a.level.stalactites, puzzle: a.level.puzzle,
        coins: { time: a.coins.time, pending: [...a.coins.pending], saved: [...a.coins.saved], effects: a.coins.effects },
        reveal: [...a.level.exploration.reveal], notice: a.level.exploration.noticeTime, camera: a.camera });

    if (process.env.QUESTMANAGER_TEST_DEV === "1") {
        const dev = a.developer;
        assert.ok(dev); assert.equal(dev.enabled, false);
        const snapshotDisk = () => JSON.stringify([...disk].filter(([k]) => !k.includes("settings")));
        const baseline = snapshotDisk();
        const openTools = () => {
            key("Escape"); click("pauseSettings"); click("openDeveloperMode");
            assert.equal(a.pause.screen, "developer");
            if (!dev.enabled) {
                element("enableDeveloperTools").checked = true;
                element("enableDeveloperTools").emit("change");
            }
            click("openAdminTools"); assert.equal(a.pause.screen, "admin");
        };
        const toggle = (id, checked) => { element(id).checked = checked; element(id).emit("change"); };
        canvas.focus(); frame(); openTools();
        assert.equal(element("pauseMainPanel").hidden, true); assert.equal(element("adminToolsPanel").hidden, false);
        toggle("devFly", true); toggle("devHitboxes", true);
        const frozen = snapshot();canvas.focus();key("KeyW");key("KeyD");
        for (let i = 0; i < 20; i++) frame();assert.equal(snapshot(), frozen);assert.equal(a.keys.size, 0);
        escapeDialog();assert.equal(a.pause.screen, "developer");click("openAdminTools");click("adminClose");click("pauseResume");
        frame();const startY = a.level.player.y;key("KeyW");key("KeyD");
        for (let i = 0; i < 12; i++) frame();canvas.emit("keyup", { code: "KeyW" });canvas.emit("keyup", { code: "KeyD" });
        assert.ok(a.level.player.y < startY);assert.equal(a.level.developerAssisted, true);
        openTools();element("devLevel").value = "4";click("devLoad");await turn();
        assert.equal(a.level.config.id, 4);assert.equal(a.playing, true);assert.equal(a.progress.getLevel(4).unlocked, false);
        assert.equal(a.level.developerAssisted, true);assert.equal(snapshotDisk(), baseline);
        frame();openTools();element("devLocation").value = "level-4-coin-2";click("devTeleport");
        assert.ok(a.level.player.x > 3500 && a.level.player.x < 4100);assert.equal(a.pause.screen, "admin");
        assert.ok(a.level.player.x >= a.camera && a.level.player.x + 32 <= a.camera + 960, "teleport camera cut is visible before resume");
        element("devSpeed").value = "2";element("devSpeed").emit("change");assert.equal(dev.speed, 2);
        // Disable every assistance setting BEFORE the flag. The attempt must remain tainted.
        element("devSpeed").value = "1";element("devSpeed").emit("change");toggle("devFly", false);toggle("devHitboxes", false);
        click("adminClose");click("pauseResume");assert.equal(a.level.developerAssisted, true);
        a.coins.pending.add(a.level.config.coins[2].id);
        const finish = a.level.player;finish.x = a.level.flagX;finish.y = 460 - finish.height;finish.grounded = true;
        finish.supportPlatform = a.level.config.finish.platform;finish.velocityY = 0;frame();frame();await turn();
        assert.equal(element("levelCompleteDialog").open, true);
        assert.equal(element("completionSaveStatus").textContent, "TEST RUN — PROGRESS NOT SAVED");
        assert.equal(snapshotDisk(), baseline);assert.equal(a.progress.getLevel(4).completed, false);assert.equal(a.progress.getLevel(5).unlocked, false);
        element("levelCompleteDialog").returnValue = "replay";element("levelCompleteDialog").close();
        assert.equal(a.level.developerAssisted, true, "a locked-level bypass remains a test context on restart");
        a.map.openMap();await turn();a.map.openLevel(1);await turn();
        assert.equal(a.level.config.id, 1);a.restartLevel();assert.equal(a.level.developerAssisted, false);
        // A normal attempt after all cheats are disabled may save normally.
        const normal = a.level.player;a.coins.pending.add(a.level.config.coins[0].id);
        normal.x = a.level.flagX;normal.y = a.level.config.finish.platform.y - normal.height;normal.velocityY = 0;normal.grounded = true;normal.supportPlatform = a.level.config.finish.platform;
        canvas.focus();frame();frame();await turn();
        assert.equal(a.progress.getLevel(1).completed, true);assert.equal(a.progress.getLevel(1).coinIds.length, 1);
        assert.notEqual(snapshotDisk(), baseline);
        element("levelCompleteDialog").returnValue = "replay";element("levelCompleteDialog").close();
        frame();openTools();
        a.progress.completeLevel(2, ["level-2-coin-2"]);
        const beforeReset = snapshotDisk();
        click("devClearCurrentCoins"); assert.equal(element("devCoinResetConfirmation").hidden, false);
        assert.equal(snapshotDisk(), beforeReset, "opening confirmation must not clear coins");
        click("devCancelCoinReset"); assert.equal(snapshotDisk(), beforeReset);
        // A cancelled asynchronous identity verification must not clear anything.
        click("devClearCurrentCoins");click("devConfirmCoinReset");click("devCancelCoinReset");await turn();
        assert.equal(snapshotDisk(), beforeReset);
        click("devClearCurrentCoins");click("devConfirmCoinReset");await turn();
        assert.equal(a.progress.getLevel(1).coinIds.length, 0);assert.equal(a.coins.saved.size, 0);
        assert.equal(a.progress.getLevel(1).completed, true);assert.equal(a.progress.getLevel(2).coinIds.length, 1);
        assert.equal(a.level.developerAssisted, true);assert.equal(a.pause.screen, "admin");
        click("devClearAllCoins");click("devConfirmCoinReset");await turn();
        assert.equal(a.progress.totalCoins.earned, 0);assert.equal(a.progress.getLevel(2).completed, true);
        assert.equal(a.progress.getLevel(3).unlocked, true);
        // Esc also cancels an open confirmation, preserving all current data.
        const afterReset = snapshotDisk();click("devClearAllCoins");escapeDialog();
        assert.equal(element("devCoinResetConfirmation").hidden, true);click("devConfirmCoinReset");await turn();
        assert.equal(snapshotDisk(), afterReset);click("openAdminTools");
        toggle("devFly", true);
        click("devClearAllCoins");
        account = "developer-B";authCallback("SIGNED_IN", { user: { id: account } });await turn();
        assert.equal(dev.enabled, false);assert.equal(dev.fly, false);assert.equal(a.coins.pending.size, 0);
        assert.equal(a.progress.getLevel(1).completed, false);
        click("devConfirmCoinReset");await turn();assert.equal(a.progress.getLevel(1).completed, false);
        console.log("PASS development entry wiring: gated panels, pause, flight, locked bypass, safe teleport, sticky no-save completion, clean normal save and account reset.");
        a.audio.dispose();
        return;
    }
    assert.equal(a.developer, null);
    assert.ok(!cache.has("game/dev/installDeveloperTools.js"), "production never loads developer implementation");
    if (process.env.QUESTMANAGER_TEST_AUDIO === "1") {
        await a.audio.unlock();
        await a.audio.waitForMusic();
        const played = (name) => a.audio.context.sources.filter((source) => source.starts.length && source.buffer === a.audio.assets.effect(name)).length;
        a.restartLevel(); canvas.focus(); frame(); frame();
        const jumps = played("jump"); key("Space"); key("Space", { repeat: true }); key("KeyW");
        assert.equal(played("jump"), jumps + 1);
        const landings = played("land"); for (let i = 0; i < 70; i++) frame();
        assert.equal(played("land"), landings + 1);
        for (let i = 0; i < 10; i++) frame(); assert.equal(played("land"), landings + 1);
        a.restartLevel(); canvas.focus(); frame();
        const coin = a.level.config.coins[0], p = a.level.player;
        p.x = coin.x - 10; p.y = coin.y - 35; p.grounded = false; p.velocityY = 0;
        const pickups = played("coin"); frame(); frame(); assert.equal(played("coin"), pickups + 1);
        for (let i = 0; i < 10; i++) frame(); assert.equal(played("coin"), pickups + 1);
        a.progress.completeLevel(1, [coin.id]); a.restartLevel(); canvas.focus(); frame();
        p.x = coin.x - 10; p.y = coin.y - 35; p.grounded = false; p.velocityY = 0; frame(); frame();
        assert.equal(played("coin"), pickups + 1, "earned faded coins are silent");
        a.restartLevel(); canvas.focus(); frame(); const slime = a.level.enemies.find((enemy) => enemy.stompable);
        p.x = slime.x; p.y = slime.feetY - slime.height - p.height - 8; p.velocityY = 500; p.grounded = false;
        const stomps = played("stomp"); for (let i = 0; i < 10 && slime.active; i++) frame();
        assert.equal(played("stomp"), stomps + 1);
        const deaths = played("death"); a.startDeath("Audio test"); a.startDeath("Audio test");
        assert.equal(played("death"), deaths + 1); for (let i = 0; i < 50; i++) frame();
        p.x = a.level.flagX; p.y = a.level.config.finish.platform.y - p.height; p.velocityY = 0; p.grounded = true;
        p.supportPlatform = a.level.platforms.find((surface) => surface.id === a.level.config.finish.platform.id);
        const victories = played("victory"); frame(); await turn(); frame();
        assert.equal(played("victory"), victories + 1); assert.equal(a.audio.music, null);
        element("levelCompleteDialog").returnValue = "replay"; element("levelCompleteDialog").close();
        assert.equal(a.audio.scene, "grassland"); assert.ok(a.audio.music);
        console.log("PASS actual audio wiring: single jump, landing, pickup, stomp, death and victory; earned coins silent; replay music restored.");
    }
    for (const id of [1, 2, 3, 4]) {
        if (id > 1) { a.progress.completeLevel(id - 1, []); a.map.refresh(); a.map.openLevel(id); await turn(); }
        assert.equal(a.level.config.id, id);
        assert.equal(a.audio.scene, a.level.config.audio.music);
        if (id === 4 && process.env.QUESTMANAGER_TEST_AUDIO === "1") {
            const played = name => a.audio.context.sources.filter(source => source.starts.length && source.buffer === a.audio.assets.effect(name)).length;
            a.restartLevel(); canvas.focus(); frame(); frame();
            const p = a.level.player, rock = a.level.stalactites[0];
            const warnings = played("crack"), impacts = played("break");
            p.reset({ x: rock.x, feetY: 460 }); frame();
            assert.equal(played("crack"), warnings + 1);
            p.reset({ x: rock.x - 200, feetY: 460 });
            for (let i = 0; i < 130; i++) frame();
            assert.equal(played("break"), impacts + 1);
            assert.equal(played("crack"), warnings + 1);
            const switches = played("switch"), gates = played("gate");
            const switchConfig = a.level.puzzle.switches[0];
            p.reset({ x: switchConfig.x + 10, feetY: switchConfig.y + switchConfig.height - 1 });
            p.grounded = false; p.velocityY = 200;
            frame(); frame(); assert.equal(a.level.puzzle.gates[0].open, true);
            assert.equal(played("switch"), switches + 1); assert.equal(played("gate"), gates + 1);
        }
        for (const fps of [30, 60, 120]) {
            a.restartLevel(); canvas.focus(); frame(); frame(1 / fps);
            a.coins.pending.add(a.level.config.coins[1].id);
            const board = a.level.platforms.find((p) => p.type === "collapsing");
            if (board) board.onLand();
            if (id === 4) {
                Object.assign(a.level.stalactites[0], { state: "warning", warningTime: .2, warningCount: 1 });
                a.level.puzzle.switches[0].active = true; a.level.puzzle.gates[0].open = true;
            }
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
        assert.ok(a.level.stalactites.every(r => r.state === "hanging" && r.warningTime === 0));
        assert.ok(a.level.puzzle.gates.every(g => !g.open));
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
    // Exercise actual Level 4 save, coming-soon Next and replay wiring. Teleports
    // here set up the UI boundary; continuous route fixtures prove playability separately.
    a.restartLevel(); canvas.focus(); frame();
    a.coins.pending.add(a.level.config.coins[2].id);
    const finisher = a.level.player;
    finisher.x = a.level.flagX; finisher.y = a.level.config.finish.platform.y - finisher.height;
    finisher.grounded = true; finisher.velocityY = 0; finisher.supportPlatform = a.level.config.finish.platform;
    frame(); await turn();
    assert.equal(element("levelCompleteDialog").open, true);
    assert.equal(element("levelCompleteTitle").textContent, "Level 4 Complete!");
    assert.deepEqual([...a.progress.getLevel(4).coinIds], [a.level.config.coins[2].id]);
    assert.equal(a.progress.getLevel(5).unlocked, true);
    assert.equal(element("nextLevel").disabled, true);
    assert.match(element("nextLevel").textContent, /Coming soon/);
    element("levelCompleteDialog").returnValue = "replay"; element("levelCompleteDialog").close();
    assert.equal(a.level.complete, false); assert.equal(a.level.player.x, a.level.config.spawn.x);
    assert.equal(a.audio.scene, "cave");
    assert.ok(a.coins.saved.has(a.level.config.coins[2].id));
    console.log("PASS Level 4 completion, saved coins, replay and unavailable Level 5 wiring.");
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
    a.audio.dispose(); // Terminate pending score work when this browser fixture closes.
})().catch((error) => { console.error(error); process.exitCode = 1; });
