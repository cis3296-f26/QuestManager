import { assertAuthoredRoute } from "./helpers/authoredRoute.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { level2 } from "../levels/Level2.js";
import { LevelManager } from "../levels/LevelManager.js";
import { jump, moveHorizontally, applyGravity } from "../engine/Physics.js";
import { LevelProgressManager } from "../progress/LevelProgressManager.js";
import { LocalProgressStore } from "../progress/LocalProgressStore.js";
import { levels } from "../levels/levels.js";

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
    assertAuthoredRoute(level2);
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
    assertAuthoredRoute(level2);
});
