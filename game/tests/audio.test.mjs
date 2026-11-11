import test from "node:test";
import assert from "node:assert/strict";
import fake from "./helpers/fakeAudioContext.cjs";
import { AudioManager } from "../audio/AudioManager.js";
import { createSynthAssets } from "../audio/SynthAssets.js";
import { GameAudioEvents } from "../audio/GameAudioEvents.js";
import { GameSettings } from "../settings/GameSettings.js";
import { LevelManager } from "../levels/LevelManager.js";
import { CoinManager } from "../levels/CoinManager.js";
import { levels } from "../levels/levels.js";
import { stepLevel } from "../engine/stepLevel.js";
import { jump } from "../engine/Physics.js";
const { FakeAudioContext } = fake;
const fakeAssets = () => ({ effect: (name) => name === "missing" ? null : { duration: .2, name },
    music: (name) => name === "missing" ? null : { duration: 24, name }, clear() {} });
async function manager() {
    const context = new FakeAudioContext(), settings = new GameSettings();
    const audio = new AudioManager(settings, { contextFactory: () => context, assetsFactory: fakeAssets });
    audio.setScene("grassland", { gameplay: true }); await audio.unlock();
    return { context, settings, audio };
}
const activeMusic = (context) => context.sources.filter((source) => source.loop && !source.stopped && source.starts.length);

test("audio initializes only on unlock and maintains a single scene music source", async () => {
    let created = 0;
    const context = new FakeAudioContext(), audio = new AudioManager(new GameSettings(), { contextFactory: () => { created++; return context; }, assetsFactory: fakeAssets });
    audio.setScene("map"); assert.equal(created, 0); assert.equal(audio.play("jump"), false);
    await audio.unlock(); await audio.unlock(); assert.equal(created, 1);
    assert.equal(activeMusic(context).length, 1); assert.equal(audio.music.buffer.name, "map");
    audio.setScene("map"); assert.equal(activeMusic(context).length, 1);
    audio.setScene("forest", { gameplay: true });
    assert.equal(activeMusic(context).length, 1); assert.equal(audio.music.buffer.name, "forest");
    audio.setScene("grassland", { gameplay: true }); assert.equal(activeMusic(context).length, 1);
});

test("pause/background silence effects and resume the same music offset, not paused wall time", async () => {
    const { audio, context } = await manager();
    context.advance(5); audio.play("jump"); audio.setPaused(true);
    assert.equal(activeMusic(context).length, 0); assert.equal(audio.effects.size, 0);
    assert.equal(audio.play("coin"), false); context.advance(100);
    audio.setActive(false); audio.setPaused(false); assert.equal(activeMusic(context).length, 0);
    audio.setActive(true); assert.equal(audio.music.source.starts[0].offset, 5);
    context.advance(2); audio.setPaused(true); context.advance(50); audio.setPaused(false);
    assert.equal(audio.music.source.starts[0].offset, 7);
    audio.setScene("grassland", { gameplay: true, restart: true }); assert.equal(audio.music.source.starts[0].offset, 0);
});

test("existing settings control channel gain, immediate mute and restored levels", async () => {
    const { audio, settings } = await manager();
    settings.update({ masterVolume: 50, musicVolume: 40, effectsVolume: 20 });
    assert.equal(audio.musicGain.gain.value, .2); assert.equal(audio.effectsGain.gain.value, .1);
    settings.update({ muted: true }); assert.equal(audio.musicGain.gain.value, 0); assert.equal(audio.effectsGain.gain.value, 0);
    settings.update({ muted: false }); assert.equal(audio.musicGain.gain.value, .2); assert.equal(audio.effectsGain.gain.value, .1);
});

test("death/damage and victory are single cues, stop music and cannot overlap gameplay effects", async () => {
    const { audio, context } = await manager();
    audio.play("jump"); audio.die("thorns"); audio.die("enemy");
    assert.equal(activeMusic(context).length, 0); assert.equal(audio.effects.size, 1);
    assert.equal([...audio.effects][0].name, "damage"); assert.equal(audio.play("stomp"), false);
    audio.setScene("forest", { gameplay: true, restart: true }); audio.complete(); audio.complete();
    assert.equal(audio.effects.size, 1); assert.equal([...audio.effects][0].name, "victory");
    audio.setScene("map"); assert.equal(audio.effects.size, 0); assert.equal(activeMusic(context).length, 1);
    assert.equal(audio.play("footstep"), false);
});

test("effects are bounded, duplicate calls throttled, finished sources cleaned and disposal releases listeners", async () => {
    const { audio, context } = await manager();
    assert.equal(audio.play("jump"), true); assert.equal(audio.play("jump"), false);
    for (let i = 0; i < 20; i++) audio.play("coin"); assert.equal(audio.effects.size, 8);
    context.advance(1); assert.equal(audio.effects.size, 0);
    const listeners = new Map(), target = { addEventListener(key, value) { listeners.set(key, value); }, removeEventListener(key) { listeners.delete(key); } };
    audio.listenForUnlock(target); audio.listenForUnlock(target); assert.equal(listeners.size, 2);
    audio.dispose(); assert.equal(listeners.size, 0); assert.equal(context.state, "closed");
    assert.equal(await audio.unlock(), false); assert.equal(audio.play("coin"), false);
});

test("autoplay rejection, unsupported audio, missing sounds and synthesis failures do not throw", async () => {
    const blocked = new FakeAudioContext(); blocked.resume = async () => { throw Error("gesture needed"); };
    const audio = new AudioManager(new GameSettings(), { contextFactory: () => blocked, assetsFactory: fakeAssets });
    audio.setScene("grassland", { gameplay: true }); assert.equal(await audio.unlock(), false);
    assert.equal(audio.play("jump"), false);
    blocked.resume = async () => { blocked.state = "running"; }; assert.equal(await audio.unlock(), true);
    audio.setScene("missing", { gameplay: true }); assert.equal(audio.music, null); assert.equal(audio.play("missing"), false);
    const absent = new AudioManager(new GameSettings(), { contextFactory: () => null }); assert.equal(await absent.unlock(), false);
    const broken = new AudioManager(new GameSettings(), { contextFactory: () => new FakeAudioContext(), assetsFactory() { throw Error("unavailable"); } });
    assert.equal(await broken.unlock(), false);
});

test("unlock races never play stale effects or the previous scene, including a pause during unlock", async () => {
    let resolve;
    const context = new FakeAudioContext(); context.resume = () => new Promise((done) => { resolve = () => { context.state = "running"; done(); }; });
    const audio = new AudioManager(new GameSettings(), { contextFactory: () => context, assetsFactory: fakeAssets });
    audio.setScene("grassland", { gameplay: true }); const unlocking = audio.unlock(); audio.play("jump");
    audio.setScene("forest", { gameplay: true }); audio.setPaused(true); resolve(); await unlocking;
    assert.equal(audio.effects.size, 0); assert.equal(audio.music, undefined);
    audio.setPaused(false); assert.equal(audio.music.buffer.name, "forest");
});

test("a first-gesture effect can play after successful unlock without starting multiple tracks", async () => {
    const context = new FakeAudioContext(), audio = new AudioManager(new GameSettings(), { contextFactory: () => context, assetsFactory: fakeAssets });
    audio.setScene("grassland", { gameplay: true }); const unlocking = audio.unlock(); audio.play("jump"); await unlocking;
    assert.equal(audio.effects.size, 1); assert.equal([...audio.effects][0].name, "jump"); assert.equal(activeMusic(context).length, 1);
});

test("original synthesized assets are cached, quiet, finite, distinct and click-free at loop seams", () => {
    const assets = createSynthAssets(new FakeAudioContext());
    const durations = [];
    for (const key of ["map", "grassland", "forest", "deepForest"]) {
        const buffer = assets.music(key), samples = buffer.getChannelData(0);
        assert.equal(assets.music(key), buffer); assert.ok(buffer.duration > 20 && buffer.duration < 27);
        let peak = 0, energy = 0;
        for (const sample of samples) { assert.ok(Number.isFinite(sample)); peak = Math.max(peak, Math.abs(sample)); energy += sample * sample; }
        assert.ok(peak < .25); assert.ok(Math.sqrt(energy / samples.length) < .05);
        assert.ok(Math.abs(samples[0] - samples.at(-1)) < .002); durations.push(buffer.duration);
    }
    assert.equal(new Set(durations).size, 4);
    const peak = (buffer) => buffer.getChannelData(0).reduce((n, value) => Math.max(n, Math.abs(value)), 0);
    assert.ok(peak(assets.effect("footstep")) < peak(assets.effect("jump")) / 2);
    for (const key of ["jump", "land", "footstep", "coin", "stomp", "death", "damage", "crack", "break", "victory"]) assert.ok(peak(assets.effect(key)) < .3);
    assert.equal(assets.music("missing"), null); assert.equal(assets.effect("missing"), null);
});

test("game event transitions trigger coins, landings, footsteps and platform cues once at every rate", () => {
    for (const fps of [30, 60, 120]) {
        const calls = [], audio = { play: (name) => calls.push(name), stopEffect() {} };
        const events = new GameAudioEvents(audio), level = new LevelManager(levels[1]), coins = new CoinManager(level.config.coins);
        const board = level.platforms.find((p) => p.type === "collapsing");
        level.player.reset({ x: board.x + 20, feetY: board.y - 1 }); level.player.grounded = false; level.player.velocityY = 300;
        for (let frame = 0; frame < fps * 2; frame++) {
            const before = events.capture(level, coins), result = stepLevel(level, 0, 1 / fps);
            if (frame === 0) coins.pending.add(level.config.coins[0].id);
            events.after(before, level, coins, result);
        }
        assert.equal(calls.filter((name) => name === "coin").length, 1);
        assert.equal(calls.filter((name) => name === "crack").length, 1);
        assert.equal(calls.filter((name) => name === "break").length, 1);
        assert.equal(calls.filter((name) => name === "land").length, 2, "board landing and subsequent safe-ground landing only");
        level.restart(); events.reset(); calls.length = 0;
        for (let frame = 0; frame < fps; frame++) { const before = events.capture(level, coins); const result = stepLevel(level, 1, 1 / fps); events.after(before, level, coins, result); }
        assert.ok(calls.filter((name) => name === "footstep").length >= 3);
        const count = calls.length; jump(level.player, 650); events.jump();
        for (let frame = 0; frame < Math.floor(fps / 3); frame++) { const before = events.capture(level, coins); const result = stepLevel(level, 1, 1 / fps); events.after(before, level, coins, result); }
        assert.equal(calls.slice(count).filter((name) => name === "jump").length, 1);
        assert.equal(calls.slice(count).filter((name) => name === "footstep").length, 0);
    }
});

test("failed device sources cannot leak effects or throw during cleanup", async () => {
    const { audio, context } = await manager();
    context.createBufferSource = () => ({ connect() {}, start() { throw Error("device lost"); },
        stop() { throw Error("device lost"); }, disconnect() { throw Error("device lost"); } });
    assert.doesNotThrow(() => audio.setScene("forest", { gameplay: true }));
    assert.equal(audio.music, null);
    assert.equal(audio.play("jump"), false); assert.equal(audio.effects.size, 0);
    assert.doesNotThrow(() => audio.dispose());
});

test("slow or rejected unlocks discard old first-gesture sounds", async () => {
    let release, clock = 0;
    const context = new FakeAudioContext();
    context.resume = () => new Promise((resolve) => { release = () => { context.state = "running"; resolve(); }; });
    const audio = new AudioManager(new GameSettings(), { contextFactory: () => context, assetsFactory: fakeAssets, now: () => clock });
    audio.setScene("grassland", { gameplay: true });
    const unlocking = audio.unlock(); audio.play("jump"); clock = 201; release(); await unlocking;
    assert.equal(audio.effects.size, 0); assert.equal(activeMusic(context).length, 1);
    audio.dispose();
});
