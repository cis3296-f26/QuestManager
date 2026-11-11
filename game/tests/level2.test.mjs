import test from "node:test";
import assert from "node:assert/strict";
import { level2 } from "../levels/Level2.js";
import { LevelManager } from "../levels/LevelManager.js";
import { CoinManager } from "../levels/CoinManager.js";
import { jump, moveHorizontally, applyGravity } from "../engine/Physics.js";
import { touchesHazard } from "../engine/Hazards.js";
import { followCamera } from "../engine/Camera.js";
import { LevelProgressManager } from "../progress/LevelProgressManager.js";
import { LocalProgressStore } from "../progress/LocalProgressStore.js";
import { levels } from "../levels/levels.js";
import { readFileSync } from "node:fs";

function simulateRoute({ start, stop, jumps, coin, feetY = 460 }, fps) {
    const level = new LevelManager(level2), coins = new CoinManager(level2.coins);
    const { player } = level;
    player.x = start;
    player.y = feetY - player.height;
    let nextJump = 0, camera = 0;
    for (let frame = 0; frame < fps * 12; frame++) {
        if (nextJump < jumps.length && player.x >= jumps[nextJump] && player.grounded) {
            jump(player, 650);
            nextJump++;
        }
        moveHorizontally(player, player.x < stop ? 1 : 0, 280, level2.worldWidth, 1 / fps);
        applyGravity(player, 1800, level2.platforms, 1 / fps);
        level.enemies.forEach((enemy) => enemy.update(1 / fps));
        assert.ok(player.y < 540, `fell at x=${player.x}, ${fps} FPS`);
        assert.equal(touchesHazard(player, level2.hazards), false, `thorns at x=${player.x}`);
        assert.equal(level.enemies.some((enemy) => enemy.touches(player)), false, `enemy at x=${player.x}, ${fps} FPS`);
        coins.update(player, 1 / fps);
        camera = followCamera(camera, player, level2.worldWidth, 960, 1 / fps);
        assert.ok(camera >= 0 && camera <= level2.worldWidth - 960);
        if (player.x >= stop && player.grounded) break;
    }
    assert.ok(player.x >= stop && player.grounded, "route must end with a safe landing");
    if (coin) assert.ok(coins.pending.has(coin), `coin ${coin} was not collected`);
    return level;
}

test("Level 2 has three distinct achievements, safe decoration placement and supported patrols", () => {
    assert.equal(level2.coins.length, 3);
    assert.equal(new Set(levels.flatMap((level) => level.coins.map((coin) => coin.id))).size, 6);
    for (const enemy of level2.enemies) {
        assert.ok(level2.platforms.some((platform) => platform.y === enemy.feetY &&
            enemy.minX >= platform.x && enemy.maxX + enemy.width <= platform.x + platform.width),
        "patrol cannot walk into a pit or beyond its ledge");
    }
    for (const decoration of level2.scenery) {
        const margin = decoration.type === "tree" ? 55 : decoration.type === "bush" ? 30 : 20;
        assert.ok(level2.platforms.some((platform) => platform.y === level2.groundY &&
            decoration.x - margin >= platform.x && decoration.x + margin <= platform.x + platform.width),
        `scenery overlaps a pit: ${decoration.type} at ${decoration.x}`);
    }
    assert.ok(level2.platforms.every((platform) => platform.y >= 210));
});

test("all three Level 2 coins and the finish climb are reachable at 30/60/120 FPS", () => {
    const routes = [
        { start: 80, stop: 550, jumps: [], coin: "level-2-coin-1" },
        { start: 4620, stop: 5560, jumps: [4670, 4840, 5040, 5320], coin: "level-2-coin-2" },
        { start: 15030, stop: 16030, jumps: [15100, 15250, 15450, 15800], coin: "level-2-coin-3" }
    ];
    for (const fps of [30, 60, 120]) {
        routes.forEach((route) => simulateRoute(route, fps));
        const finish = simulateRoute({ start: 17200, stop: 17940, jumps: [17260, 17420, 17630, 17820] }, fps);
        assert.equal(finish.checkCompletion(), true);
    }
});

test("every ground gap is crossable without a hidden floor, and missed jumps fall", () => {
    const ground = level2.platforms.filter((platform) => platform.y === level2.groundY);
    for (let i = 0; i < ground.length - 1; i++) {
        const edge = ground[i].x + ground[i].width, next = ground[i + 1].x;
        assert.ok(next - edge >= 130 && next - edge <= 190);
        // Isolate the ground jump from optional raised routes and enemy timing.
        for (const fps of [30, 60, 120]) {
            const level = new LevelManager(level2), player = level.player;
            player.x = edge - 24;
            jump(player, 650);
            for (let frame = 0; frame < fps; frame++) {
                moveHorizontally(player, 1, 280, level2.worldWidth, 1 / fps);
                applyGravity(player, 1800, ground, 1 / fps);
                assert.ok(player.y < 540);
            }
            assert.ok(player.grounded && player.x >= next - player.width);
        }
    }
    const level = new LevelManager(level2);
    level.player.x = 7750; // No optional ledge covers the 7700–7880 gap.
    for (let i = 0; i < 60; i++) applyGravity(level.player, 1800, level2.platforms, 1 / 60);
    assert.ok(level.player.y > 540);
});

test("Level 2 restarts reset elevated enemies; progress and coins stay independent between levels", () => {
    const level = new LevelManager(level2);
    level.enemies.forEach((enemy) => enemy.update(1));
    level.complete = true;
    level.restart();
    assert.equal(level.complete, false);
    assert.ok(level.enemies.every((enemy) => enemy.x === enemy.startX && enemy.walkTime === 0));
    const data = new Map();
    const store = new LocalProgressStore({ getItem: (key) => data.get(key), setItem: (key, value) => data.set(key, value) });
    const progress = new LevelProgressManager(store);
    levels.forEach((config) => progress.registerLevel(config));
    progress.setUser("test-user");
    assert.equal(progress.getLevel(2).unlocked, false);
    progress.completeLevel(1, []);
    assert.equal(progress.getLevel(2).unlocked, true, "unlock does not require perfect coin collection");
    progress.completeLevel(2, [level2.coins[1].id]);
    assert.deepEqual(progress.getLevel(1).coinIds, []);
    assert.deepEqual(progress.getLevel(2).coinIds, [level2.coins[1].id]);
    assert.deepEqual(progress.totalCoins, { earned: 1, possible: 30 });
    assert.equal(progress.getLevel(3).unlocked, true, "metadata prepares the next unlock without building Level 3");
});

test("continuous spawn-to-flag runs collect all three coins without dying at 30/60/120 FPS", () => {
    // Recorded input routes prove the authored course is traversable with live enemy timing.
    // These are repeatable test inputs, not in-game autoplay or a change to the controls.
    const routes = JSON.parse(readFileSync(new URL("./fixtures/level2-routes.json", import.meta.url)));
    for (const route of routes) {
        const level = new LevelManager(level2), coins = new CoinManager(level2.coins);
        const jumps = new Set(route.jumpFrames), dt = 1 / route.fps;
        let finished = false;
        for (let frame = 0; frame < route.totalFrames; frame++) {
            if (jumps.has(frame)) {
                assert.equal(level.player.grounded, true, "recorded jump must start on a real surface");
                jump(level.player, 650);
            }
            moveHorizontally(level.player, 1, 280, level2.worldWidth, dt);
            applyGravity(level.player, 1800, level2.platforms, dt);
            level.enemies.forEach((enemy) => enemy.update(dt));
            assert.ok(level.player.y < 540, `fell at ${frame / route.fps}s`);
            assert.equal(touchesHazard(level.player, level2.hazards), false);
            assert.equal(level.enemies.some((enemy) => enemy.touches(level.player)), false);
            coins.update(level.player, dt);
            if (level.checkCompletion()) { finished = true; break; }
        }
        assert.equal(finished, true, `flag unreachable at ${route.fps} FPS`);
        assert.equal(coins.pending.size, 3);
    }
});
