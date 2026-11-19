import test from "node:test";
import assert from "node:assert/strict";
import { GamePauseManager, GameClock } from "../engine/GamePauseManager.js";
import { GameSettings, SettingsPersistence, defaultSettings } from "../settings/GameSettings.js";
import { AudioPreferences } from "../settings/AudioPreferences.js";
import { PauseMenu } from "../ui/PauseMenu.js";
import { LevelManager } from "../levels/LevelManager.js";
import { CoinManager } from "../levels/CoinManager.js";
import { levels } from "../levels/levels.js";
import { stepLevel } from "../engine/stepLevel.js";
import { followCamera } from "../engine/Camera.js";
import { AvatarRenderer } from "../rendering/AvatarRenderer.js";
import { drawInteractivePlatforms } from "../rendering/PlatformRenderer.js";

function storage() {
    const data = new Map();
    return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}

test("one pause state handles Escape, settings, confirmations and duplicate opens", () => {
    let allowed = false, changes = 0;
    const pause = new GamePauseManager(() => allowed);
    pause.subscribe(() => changes++);
    assert.equal(pause.open(), false);
    allowed = true;
    assert.equal(pause.open(), true);
    assert.equal(pause.open(), false);
    assert.equal(pause.paused, true);
    pause.navigate("settings"); pause.escape();
    assert.equal(pause.screen, "main");
    for (const screen of ["restart", "map"]) {
        assert.equal(pause.navigate(screen), true);
        assert.equal(pause.navigate("settings"), false);
        pause.escape(); assert.equal(pause.screen, "main");
    }
    pause.escape();
    assert.equal(pause.paused, false);
    assert.equal(pause.escape(), false);
    assert.equal(changes, 8);
});

test("clock drops wall time on pause, focus loss and reset without a resume spike", () => {
    const clock = new GameClock();
    assert.equal(clock.frame(0, true), 0);
    assert.equal(clock.frame(10, true), .01);
    assert.equal(clock.frame(1000, false), null);
    assert.equal(clock.frame(100000, false), null);
    assert.equal(clock.frame(200000, true), 0);
    assert.equal(clock.frame(200010, true), .01);
    assert.equal(clock.frame(300000, true), 1 / 30);
    clock.reset(); assert.equal(clock.frame(400000, true), 0);
});

test("player, enemies, platform timers, coins, animations and camera freeze together at every frame rate", () => {
    for (const config of levels) for (const fps of [30, 60, 120]) {
        const level = new LevelManager(config), coins = new CoinManager(config.coins);
        const clock = new GameClock(), pause = new GamePauseManager();
        pause.subscribe(() => clock.reset());
        let camera = 0;
        const frame = (time) => {
            const dt = clock.frame(time, !pause.paused);
            if (dt === null || dt === 0) return;
            stepLevel(level, 0, dt); coins.update(level.player, dt);
            camera = followCamera(camera, level.player, config.worldWidth, 960, dt);
            level.player.animation.update(level.player, dt);
        };
        const board = level.platforms.find((p) => p.type === "collapsing");
        if (board) {
            level.player.reset({ x: board.x + 20, feetY: board.y });
            level.player.supportPlatform = board; board.onLand();
        }
        coins.pending.add(config.coins[0].id);
        frame(0); frame(1000 / fps);
        const snapshot = () => JSON.stringify({ player: level.player, enemies: level.enemies, platforms: level.platforms,
            coins: { pending: [...coins.pending], time: coins.time, effects: coins.effects }, camera,
            reveal: [...level.exploration.reveal], noticeTime: level.exploration.noticeTime });
        const before = snapshot();
        pause.open();
        for (let i = 1; i <= fps * 3; i++) frame(1000 + i * 1000 / fps);
        pause.navigate("settings"); frame(100000);
        assert.equal(snapshot(), before);
        pause.escape(); pause.escape(); frame(200000);
        assert.equal(snapshot(), before, "first resumed frame must remain identical");
        frame(200000 + 1000 / fps);
        assert.equal(coins.pending.size, 1);
        assert.ok(coins.time > 1 / fps);
        if (board) assert.ok(board.warningTime < .1, "paused seconds must not expire collapse warning");
    }
});

test("settings survive refresh, remain isolated by account and never use progress storage keys", () => {
    const disk = storage(), settings = new GameSettings(new SettingsPersistence(disk));
    settings.update({ masterVolume: 25 }); // Guest preferences have their own namespace.
    settings.setUser("account-A"); assert.equal(settings.values.masterVolume, 80);
    settings.update({ masterVolume: 45, muted: true, showControls: false, reduceMotion: true });
    settings.setUser("account-B"); assert.deepEqual(settings.values, defaultSettings);
    settings.update({ musicVolume: 10 });
    const refreshed = new GameSettings(new SettingsPersistence(disk));
    assert.equal(refreshed.values.masterVolume, 25);
    refreshed.setUser("account-A"); assert.equal(refreshed.values.masterVolume, 45);
    assert.equal(refreshed.values.muted, true); assert.equal(refreshed.values.reduceMotion, true);
    refreshed.setUser("account-B"); assert.equal(refreshed.values.musicVolume, 10);
    assert.ok([...disk.data.keys()].every((key) => key.startsWith("questmanager:game-settings:v1:")));
    assert.notEqual(new SettingsPersistence(disk).key("guest"), new SettingsPersistence(disk).key(null));
});

test("corrupt, incompatible and unavailable storage use safe, whitelisted defaults", () => {
    const disk = storage(), store = new SettingsPersistence(disk);
    disk.data.set(store.key("broken"), "invalid JSON");
    const settings = new GameSettings(store);
    settings.setUser("broken"); assert.deepEqual(settings.values, defaultSettings);
    settings.update({ masterVolume: -10, musicVolume: 500, effectsVolume: NaN, muted: "yes", unknown: 99 });
    assert.deepEqual(settings.values, { ...defaultSettings, masterVolume: 0, musicVolume: 100 });
    disk.data.set(store.key("future"), JSON.stringify({ version: 99, values: { masterVolume: 1 } }));
    settings.setUser("future"); assert.deepEqual(settings.values, defaultSettings);
    const denied = new GameSettings(new SettingsPersistence({ getItem() { throw Error(); }, setItem() { throw Error(); } }));
    denied.setUser("A"); denied.update({ effectsVolume: 40 });
    denied.setUser("B"); assert.equal(denied.values.effectsVolume, 80);
    denied.setUser("A"); assert.equal(denied.values.effectsVolume, 40);
    assert.equal(denied.persistent, false);
});

test("audio adapter composes master/channel gain and mute without starting playback", () => {
    const settings = new GameSettings(), audio = new AudioPreferences(settings);
    const music = {}, effects = {};
    const disconnect = audio.connect(music, "music"); audio.connect(effects);
    settings.update({ masterVolume: 50, musicVolume: 40, effectsVolume: 20 });
    assert.equal(music.volume, .2); assert.equal(effects.volume, .1);
    settings.update({ muted: true }); assert.equal(music.volume, 0); assert.equal(effects.muted, true);
    settings.update({ muted: false }); assert.equal(music.volume, .2);
    disconnect(); settings.update({ musicVolume: 100 }); assert.equal(music.volume, .2);
    assert.throws(() => audio.volumeFor("unknown")); audio.dispose();
});

function menuHarness() {
    const nodes = new Map(), document = { activeElement: null, getElementById(id) {
        if (!nodes.has(id)) nodes.set(id, { hidden: false, listeners: {}, open: false,
            addEventListener(type, handler) { this.listeners[type] = handler; },
            focus() { document.activeElement = this; }, showModal() { this.open = true; this.opens = (this.opens ?? 0) + 1; },
            close() { this.open = false; this.listeners.close?.(); } });
        return nodes.get(id);
    } };
    const pause = new GamePauseManager(), settings = new GameSettings(new SettingsPersistence(storage()));
    let restarts = 0, exits = 0;
    new PauseMenu({ document, pause, settings, onRestart: () => restarts++, onMap: () => exits++,
        returnFocus: () => document.getElementById("canvas").focus() });
    const click = (id) => document.getElementById(id).listeners.click();
    const escape = () => { let prevented = false; document.getElementById("pauseDialog").listeners.cancel({ preventDefault() { prevented = true; } }); assert.equal(prevented, true); };
    return { document, pause, settings, click, escape, node: (id) => document.getElementById(id), restarts: () => restarts, exits: () => exits };
}

test("menu focus, Escape/back navigation and duplicate overlays use one native dialog", () => {
    const h = menuHarness();
    h.click("pauseButton"); assert.equal(h.document.activeElement, h.node("pauseResume"));
    h.click("pauseButton"); assert.equal(h.node("pauseDialog").opens, 1);
    h.click("pauseSettings"); assert.equal(h.document.activeElement, h.node("masterVolume"));
    h.escape(); assert.equal(h.pause.screen, "main"); assert.equal(h.node("pauseSettingsPanel").hidden, true);
    h.escape(); assert.equal(h.pause.paused, false); assert.equal(h.document.activeElement, h.node("canvas"));
});

test("confirmation Cancel/Escape preserve state; confirm invokes the chosen action once", () => {
    const h = menuHarness();
    h.click("pauseButton"); h.click("pauseRestart");
    assert.equal(h.document.activeElement, h.node("pauseCancel"));
    assert.match(h.node("pauseDescription").textContent, /haven't been saved/);
    h.click("pauseCancel"); assert.equal(h.restarts(), 0); assert.equal(h.pause.screen, "main");
    h.click("pauseWorldMap"); h.escape(); assert.equal(h.exits(), 0);
    h.click("pauseRestart"); h.click("pauseConfirm"); h.click("pauseConfirm");
    assert.equal(h.restarts(), 1); assert.equal(h.node("pauseDialog").open, false);
    h.click("pauseButton"); h.click("pauseWorldMap"); h.click("pauseConfirm");
    assert.equal(h.exits(), 1);
});

test("settings sliders and toggles update in place without losing input focus", () => {
    const h = menuHarness(); h.click("pauseButton"); h.click("pauseSettings");
    h.node("masterVolume").listeners.input({ target: { value: "36" } });
    assert.equal(h.settings.values.masterVolume, 36); assert.equal(h.node("masterVolumeValue").textContent, "36%");
    assert.equal(h.document.activeElement, h.node("masterVolume"));
    h.node("showControls").listeners.change({ target: { checked: false } });
    assert.equal(h.node("controlsReference").hidden, true);
    h.node("muted").listeners.change({ target: { checked: true } });
    assert.equal(h.settings.values.muted, true); assert.equal(h.pause.paused, true);
    h.click("settingsBack"); assert.equal(h.pause.screen, "main");
});

test("Reduce Motion removes only render transforms and keeps collapse warning cracks", () => {
    const level = new LevelManager(levels[1]), p = level.player;
    Object.assign(p.animation.pose, { lift: 5, tilt: .2, xScale: .9, yScale: 1.1 });
    const calls = [], ctx = new Proxy({ globalAlpha: 1 }, { get: (o, key) => o[key] ?? ((...args) => calls.push([key, ...args])) });
    const before = JSON.stringify(p);
    new AvatarRenderer().draw(ctx, p, { reduceMotion: true });
    assert.equal(calls.find(([key]) => key === "rotate")[1], 0);
    assert.deepEqual(calls.find(([key]) => key === "translate").slice(1), [p.x + p.width / 2, p.y + p.height]);
    assert.equal(JSON.stringify(p), before);
    const board = level.platforms.find((platform) => platform.type === "collapsing");
    board.onLand(); board.update(.4); calls.length = 0;
    const boardBefore = JSON.stringify(board);
    drawInteractivePlatforms(ctx, [board], board.x - 100, 960, { reduceMotion: true });
    assert.ok(calls.some(([key, x, y]) => key === "lineTo" && y === board.height));
    assert.equal(JSON.stringify(board), boardBefore);
});
