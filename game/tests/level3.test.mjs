import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { level3 } from "../levels/Level3.js";
import { levels } from "../levels/levels.js";
import { LevelManager } from "../levels/LevelManager.js";
import { CoinManager } from "../levels/CoinManager.js";
import { LevelProgressManager } from "../progress/LevelProgressManager.js";
import { LocalProgressStore } from "../progress/LocalProgressStore.js";
import { jump } from "../engine/Physics.js";
import { stepLevel } from "../engine/stepLevel.js";
import { simulateRoute } from "../levels/design/simulateRoute.js";
import { GrasslandRenderer } from "../rendering/GrasslandRenderer.js";

const platformId = (p) => p?.id ?? p?.config?.id;

test("Deep Forest has five intentional sections, distinct coins and only existing enemy/platform behaviors", () => {
    assert.deepEqual(levels.map(l => l.id), [1, 2, 3, 4]);
    assert.equal(level3.stages.length, 5); assert.equal(level3.theme, "deep-forest");
    assert.equal(level3.audio.music, "deepForest");
    assert.deepEqual(level3.coins.map(c => c.id), [1, 2, 3].map(n => `level-3-coin-${n}`));
    assert.equal(level3.platforms.filter(p => p.type === "collapsing").length, 2);
    assert.ok(level3.platforms.some(p => p.type === "moving" && p.axis === "x"));
    assert.ok(level3.platforms.some(p => p.type === "moving" && p.axis === "y"));
    assert.ok(level3.enemies.every(e => e.stompable === (e.appearance === "slime")));
    assert.equal(level3.finish.platform.y, level3.groundY);
    assert.ok(level3.enemies.every(e => e.maxX < level3.stages.at(-1).start));
});

test("all-coin routes actually board the ferry and final moving/collapsing coin route at every frame rate", () => {
    const routes = JSON.parse(readFileSync(new URL("./fixtures/level3-routes.json", import.meta.url)));
    for (const route of routes) {
        const result = simulateRoute(level3, route);
        assert.equal(result.success, true);
        for (const id of ["l3-ferry", "l3-nest-bough", "l3-nest-crumble"]) assert.ok(result.visited.includes(id), `${route.fps} FPS: ${id}`);
        assert.equal(result.coinIds.length, 3);
    }
});

test("Deep Forest ferry can be boarded, ridden through reversal and exited from multiple phases", () => {
    for (const fps of [30, 60, 120]) for (const phase of [0, 1.7, 4.1]) {
        const level = new LevelManager(level3), p = level.player;
        level.updatePlatforms(phase);
        const ferry = level.platforms.find(p => platformId(p) === "l3-ferry");
        p.reset({ x: 6375, feetY: 335 });
        p.supportPlatform = level.platforms.find(p => platformId(p) === "l3-stream-dock");
        let launched = false;
        for (let frame = 0; frame < fps * 9 && p.supportPlatform !== ferry; frame++) {
            if (!launched && ferry.x < 6500) { jump(p, 650); launched = true; }
            assert.equal(stepLevel(level, launched ? 1 : 0, 1 / fps).death, null);
        }
        assert.equal(p.supportPlatform, ferry, `${fps} FPS phase ${phase}: board`);
        const offset = p.x - ferry.x;
        for (let i = 0; i < Math.ceil(fps * 7.1); i++) {
            assert.equal(stepLevel(level, 0, 1 / fps).death, null);
            assert.equal(p.supportPlatform, ferry);
            assert.ok(Math.abs(p.x - ferry.x - offset) < 1e-6);
        }
        for (let i = 0; i < fps * 8; i++) {
            const direction = p.x - ferry.x < 85 ? 1 : 0;
            assert.equal(stepLevel(level, direction, 1 / fps).death, null);
            if (ferry.x > 6640 && p.x - ferry.x >= 85) break;
        }
        jump(p, 650);
        for (let i = 0; i < fps * 2 && !p.grounded; i++) assert.equal(stepLevel(level, p.x < 6930 ? 1 : 0, 1 / fps).death, null);
        assert.equal(platformId(p.supportPlatform), "l3-ferry-exit");
    }
});

test("Deep Forest tree lift is boardable and reaches the upper branch from multiple phases", () => {
    for (const fps of [30, 60, 120]) for (const phase of [0, 1.4, 3.2]) {
        const level = new LevelManager(level3), p = level.player;
        level.updatePlatforms(phase);
        const lift = level.platforms.find(p => platformId(p) === "l3-tree-lift");
        p.reset({ x: 7500, feetY: 365 }); p.supportPlatform = level.platforms.find(p => platformId(p) === "l3-lift-step");
        let launched = false;
        for (let i = 0; i < fps * 9 && p.supportPlatform !== lift; i++) {
            if (!launched && lift.y >= 340) { jump(p, 650); launched = true; }
            assert.equal(stepLevel(level, launched && p.x < 7640 ? 1 : 0, 1 / fps).death, null);
        }
        assert.equal(p.supportPlatform, lift, `${fps} FPS phase ${phase}: board`);
        const offset = p.x - lift.x;
        for (let i = 0; i < fps * 6; i++) {
            assert.equal(stepLevel(level, 0, 1 / fps).death, null);
            assert.equal(p.supportPlatform, lift); assert.ok(Math.abs(p.x - lift.x - offset) < 1e-6);
        }
        for (let i = 0; i < fps * 6 && lift.y > 270; i++) stepLevel(level, 0, 1 / fps);
        jump(p, 650);
        for (let i = 0; i < fps * 2 && !p.grounded; i++) assert.equal(stepLevel(level, p.x < 7850 ? 1 : 0, 1 / fps).death, null);
        assert.equal(platformId(p.supportPlatform), "l3-lift-bough");
    }
});

test("new level uses completion-only coin persistence, unlocks Level 4 metadata and isolates accounts", () => {
    const disk = new Map(), store = new LocalProgressStore({ getItem: k => disk.get(k), setItem: (k, v) => disk.set(k, v) });
    const progress = new LevelProgressManager(store); levels.forEach(l => progress.registerLevel(l)); progress.setUser("A");
    assert.equal(progress.getLevel(3).unlocked, false);
    progress.completeLevel(1, []); progress.completeLevel(2, []);
    assert.equal(progress.getLevel(3).unlocked, true);
    const coins = new CoinManager(level3.coins);
    coins.pending.add(level3.coins[0].id); coins.discard();
    assert.deepEqual(progress.getLevel(3).coinIds, []);
    progress.completeLevel(3, [level3.coins[1].id]);
    const reloaded = new LevelProgressManager(store); levels.forEach(l => reloaded.registerLevel(l)); reloaded.setUser("A");
    assert.deepEqual(reloaded.getLevel(3).coinIds, [level3.coins[1].id]);
    assert.equal(reloaded.getLevel(4).unlocked, true); assert.equal(levels.some(l => l.id === 4), true);
    reloaded.completeLevel(3, level3.coins.map(c => c.id)); reloaded.completeLevel(3, []);
    assert.equal(reloaded.getLevel(3).fullyCompleted, true);
    assert.deepEqual(reloaded.totalCoins, { earned: 3, possible: 30 });
    reloaded.setUser("B"); assert.deepEqual(reloaded.getLevel(3).coinIds, []); assert.equal(reloaded.getLevel(3).unlocked, false);
});

test("both collapsing bridges warn, release riders without killing, and reset all temporary state", () => {
    for (const fps of [30, 60, 120]) for (const config of level3.platforms.filter(p => p.type === "collapsing")) {
        const level = new LevelManager(level3), p = level.player;
        const board = level.platforms.find(p => platformId(p) === config.id);
        p.reset({ x: board.x + 20, feetY: board.y - 1 }); p.grounded = false; p.velocityY = 300;
        stepLevel(level, 0, 1 / fps); assert.equal(board.state, "warning");
        for (let i = 0; i < Math.ceil(config.collapseDelay * fps) + 2; i++) assert.equal(stepLevel(level, 0, 1 / fps).death, null);
        assert.equal(board.solid, false); assert.equal(p.grounded, false);
        level.restart(); assert.equal(board.state, "stable"); assert.equal(board.warningTime, 0);
        assert.ok(level.platforms.filter(p => p.type).every(p => p.elapsed === 0));
    }
});

test("deeper foliage retains the same bright sky; branch anchors and bridges are cosmetic", () => {
    const colors = [], calls = [], ctx = new Proxy({ globalAlpha: 1 }, {
        set(o, k, v) { if (k === "fillStyle") colors.push(v); o[k] = v; return true; },
        get(o, k) { return o[k] ?? ((...a) => calls.push([k, ...a])); }
    });
    const renderer = new GrasslandRenderer(), before = JSON.stringify(level3);
    for (const camera of [0, 6000, 12500]) renderer.drawBackground(ctx, 960, 540, camera, 460, level3.theme);
    assert.equal(colors.filter(c => c === "#b9e1ef").length, 3);
    renderer.drawDecorations(ctx, level3.scenery, 460, 3000, 960);
    renderer.drawPlatforms(ctx, level3.platforms.filter(p => !p.type), 6100, 960);
    assert.ok(calls.some(c => c[0] === "strokeRect"));
    assert.equal(JSON.stringify(level3), before);
});
