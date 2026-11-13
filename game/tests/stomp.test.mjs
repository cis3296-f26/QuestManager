import { assertAuthoredRoute } from "./helpers/authoredRoute.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { Enemy } from "../entities/Enemy.js";
import { Player } from "../entities/Player.js";
import { bounce, applyGravity, moveHorizontally } from "../engine/Physics.js";
import { sweepAABB } from "../engine/Collision.js";
import { resolveEnemyInteractions } from "../engine/EnemyInteractions.js";
import { drawEnemy } from "../rendering/EnemyRenderer.js";
import { LevelManager } from "../levels/LevelManager.js";
import { levels } from "../levels/levels.js";

const enemyAt = (options = {}) => new Enemy({ startX: 100, minX: 0, maxX: 1000,
    width: 32, height: 24, speed: 0, appearance: "slime", stompable: true, ...options }, options.feetY ?? 200);
const playerAt = (x, feetY, velocityY = 0) => {
    const player = new Player({ x, feetY });
    player.velocityY = velocityY;
    player.grounded = false;
    return player;
};
function step(player, enemies, dt, { direction = 0, speed = 280, platforms = [] } = {}) {
    const previous = { x: player.x, y: player.y, width: player.width, height: player.height };
    moveHorizontally(player, direction, speed, 22000, dt);
    applyGravity(player, 1800, platforms, dt);
    enemies.forEach((enemy) => enemy.update(dt));
    return resolveEnemyInteractions(player, previous, enemies, { dt, gravity: 1800, platforms });
}

test("descending onto a configured slime defeats it and gives a smaller bounce at 30/60/120 FPS", () => {
    for (const fps of [30, 60, 120]) {
        const enemy = enemyAt(), player = playerAt(100, 145, 250);
        let result;
        for (let frame = 0; frame < fps && enemy.active; frame++) {
            result = step(player, [enemy], 1 / fps);
            assert.equal(result.deadly, false);
        }
        assert.equal(enemy.state, "defeated");
        assert.equal(result.stomped.length, 1);
        assert.ok(player.velocityY < 0 && player.velocityY >= -420);
        assert.equal(player.grounded, false);
        assert.ok(player.y + player.height <= enemy.feetY - enemy.height);
        player.animation.update(player, 1 / fps, { dead: false, complete: false });
        assert.equal(player.animation.state, "jump");
        assert.equal(enemy.touches(playerAt(100, 200)), false);
    }
});

test("side and upward slime contacts kill; mushrooms kill from above, side and below", () => {
    for (const fps of [30, 60, 120]) {
        for (const stompable of [true, false]) {
            const options = { stompable, appearance: stompable ? "slime" : "mushroom" };
            const side = enemyAt(options), walking = playerAt(66, 200);
            assert.equal(step(walking, [side], 1 / fps, { direction: 1, speed: 600 }).deadly, true);
            assert.equal(side.active, true);
            const underside = enemyAt(options), upward = playerAt(100, 64 + 201, -1000);
            assert.equal(step(upward, [underside], 1 / fps).deadly, true);
            assert.equal(underside.active, true);
            const embedded = enemyAt(options), upperSide = playerAt(100, 182, -100);
            assert.equal(step(upperSide, [embedded], 1 / fps).deadly, true,
                "starting in the upper part of an enemy is not a top crossing");
        }
        const mushroom = enemyAt({ stompable: false, appearance: "mushroom" });
        const descending = playerAt(100, 170, 800);
        assert.equal(step(descending, [mushroom], 1 / fps).deadly, true);
        assert.equal(mushroom.active, true);
    }
});

test("fast player or enemy movement cannot tunnel through an enemy", () => {
    for (const fps of [30, 60, 120]) {
        const slime = enemyAt(), falling = playerAt(100, 130, 15000);
        const result = step(falling, [slime], 1 / fps);
        assert.equal(result.deadly, false);
        assert.equal(slime.active, false);
        assert.ok(falling.velocityY < 0);
        const side = enemyAt(), runner = playerAt(0, 200);
        assert.equal(step(runner, [side], 1 / fps, { direction: 1, speed: 30000 }).deadly, true);
        const incoming = enemyAt({ startX: 0, speed: 30000 });
        assert.equal(step(playerAt(100, 200), [incoming], 1 / fps).deadly, true);
        assert.equal(incoming.active, true);
    }
});

test("a later diagonal side graze or exact corner is not a stomp", () => {
    for (const dx of [120, 136]) {
        const enemy = enemyAt(); enemy.update(0);
        const player = playerAt(dx, 202, 1000);
        const previous = { x: 0, y: 150 - 64, width: 32, height: 64 };
        assert.equal(resolveEnemyInteractions(player, previous, [enemy],
            { dt: 1 / 30, gravity: 1800, platforms: [] }).deadly, true);
        assert.equal(enemy.active, true);
    }
    assert.equal(sweepAABB({ x: 0, y: 0, width: 32, height: 64 },
        { x: 0, y: 0, width: 32, height: 64 },
        { x: 100, y: 176, width: 32, height: 24 },
        { x: 100, y: 176, width: 32, height: 24 }), null);
});

test("fast patrol boundary stops are included when checking top contact", () => {
    const enemy = enemyAt({ startX: 0, minX: 0, maxX: 100, speed: 30000 });
    enemy.update(1 / 30);
    const previous = { x: 60, y: 150 - 64, width: 32, height: 64 };
    const player = playerAt(60, 182, 900);
    const result = resolveEnemyInteractions(player, previous, [enemy], { dt: 1 / 30, gravity: 1800, platforms: [] });
    assert.equal(result.deadly, false);
    assert.equal(result.stomped.length, 0, "enemy moved away before the feet reached its head");
    assert.equal(enemy.active, true);
});

test("first contact wins regardless of enemy order; a simultaneous mushroom remains deadly", () => {
    for (const reverse of [false, true]) {
        const upper = enemyAt(), lower = enemyAt({ feetY: 235 });
        const player = playerAt(100, 145, 3000);
        const result = step(player, reverse ? [lower, upper] : [upper, lower], 1 / 30);
        assert.equal(result.deadly, false);
        assert.equal(upper.active, false);
        assert.equal(lower.active, true);
        const slime = enemyAt(), mushroom = enemyAt({ stompable: false, appearance: "mushroom" });
        assert.equal(step(playerAt(100, 170, 800), reverse ? [mushroom, slime] : [slime, mushroom], 1 / 30).deadly, true);
        assert.equal(slime.active, true);
    }
});

test("bounce keeps horizontal movement and integrates unused frame time", () => {
    const contact = enemyAt(); contact.update(0);
    const crossing = playerAt(110, 182, 500);
    const result = resolveEnemyInteractions(crossing,
        { x: 100, y: 170 - 64, width: 32, height: 64 }, [contact],
        { dt: 1 / 30, gravity: 1800, platforms: [] });
    assert.equal(result.deadly, false);
    assert.equal(crossing.x, 110);
    assert.ok(Math.abs(crossing.velocityY - (-390)) < 1e-6);
    assert.ok(Math.abs(crossing.y + crossing.height - 169.5) < 1e-6);
    const player = playerAt(100, 176, 200);
    player.facing = -1;
    bounce(player, 176);
    assert.equal(player.velocityY, -420);
    assert.equal(player.x, 100);
    assert.equal(player.facing, -1);
    assert.equal(player.grounded, false);
    const apexes = [];
    for (const fps of [30, 60, 120]) {
        const p = playerAt(100, 176); bounce(p, 176);
        let apex = 176;
        for (let i = 0; i < fps / 2; i++) {
            moveHorizontally(p, 1, 280, 22000, 1 / fps);
            applyGravity(p, 1800, [], 1 / fps);
            apex = Math.min(apex, p.y + p.height);
        }
        apexes.push(apex);
        assert.ok(p.x > 230, "horizontal controls continue during the bounce");
        assert.ok(176 - apex > 35 && 176 - apex < 55, "bounce is smaller than the normal jump");
    }
    assert.ok(Math.max(...apexes) - Math.min(...apexes) < 6);
});

test("a second enemy is checked against the new bounce path, not the original falling path", () => {
    const run = (raised) => {
        const slime = enemyAt({ startX: 90 });
        const mushroom = enemyAt({ startX: 180, stompable: false, appearance: "mushroom", feetY: raised ? 164 : 200 });
        [slime, mushroom].forEach((enemy) => enemy.update(0));
        const player = playerAt(240, 220, 2000);
        return resolveEnemyInteractions(player, { x: 0, y: 150 - 64, width: 32, height: 64 },
            [mushroom, slime], { dt: 1 / 30, gravity: 1800, platforms: [] });
    };
    assert.equal(run(false).deadly, false, "the bounce clears the later ground mushroom");
    assert.equal(run(true).deadly, true, "an elevated mushroom can still hit the bouncing player");
});

test("defeat rendering squashes from the feet and fades without mutating gameplay state", () => {
    const enemy = enemyAt(); enemy.defeat(); enemy.update(enemy.defeatDuration / 2);
    const calls = [], before = JSON.stringify(enemy);
    const ctx = new Proxy({ globalAlpha: 1 }, {
        get(target, key) { return key in target ? target[key] : (...args) => calls.push([key, ...args]); }
    });
    drawEnemy(ctx, enemy);
    assert.ok(calls.some(([method, x, y]) => method === "translate" && x === 116 && y === 200));
    assert.ok(calls.some(([method, x, y]) => method === "scale" && Math.abs(x - 1.1) < 1e-9 && Math.abs(y - 0.55) < 1e-9));
    assert.equal(ctx.globalAlpha, 0.5);
    assert.equal(JSON.stringify(enemy), before);
});

test("defeat is harmless immediately, freezes patrols, shrinks then disappears, and resets fully", () => {
    for (const fps of [30, 60, 120]) {
        const enemy = enemyAt({ speed: 80 });
        enemy.update(0.2); enemy.defeat();
        const x = enemy.x, walkTime = enemy.walkTime;
        assert.equal(enemy.touches(playerAt(x, 200)), false);
        assert.equal(enemy.defeat(), false, "no duplicate defeat");
        for (let i = 0; i < fps; i++) enemy.update(1 / fps);
        assert.equal(enemy.x, x); assert.equal(enemy.walkTime, walkTime);
        assert.equal(enemy.state, "removed");
        let calls = 0;
        drawEnemy(new Proxy({}, { get: () => () => calls++ }), enemy);
        assert.equal(calls, 0, "removed enemies do not render");
        enemy.reset();
        assert.equal(enemy.x, enemy.startX); assert.equal(enemy.direction, 1);
        assert.equal(enemy.state, "active"); assert.equal(enemy.defeatTime, 0);
        assert.equal(enemy.walkTime, 0); assert.equal(enemy.stompable, true);
    }
});

test("all levels configure slime/guardian stomps, and level restarts/replays restore every enemy", () => {
    for (const config of levels) {
        assert.ok(config.enemies.every((enemy) => enemy.stompable === (["slime","cave-slime","guardian"].includes(enemy.appearance))));
        for (const fps of config.enemies.some(e=>e.stompable) ? [30, 60, 120] : []) {
            const attempt = new LevelManager(config), slime = attempt.enemies.find((enemy) => enemy.stompable);
            const player = attempt.player;
            player.x = slime.x;
            player.y = slime.feetY - slime.height - player.height - 8;
            player.velocityY = 500;
            player.grounded = false;
            for (let i = 0; i < fps && slime.active; i++) {
                const contact = step(player, attempt.enemies, 1 / fps, { platforms: config.platforms });
                assert.equal(contact.deadly, false);
            }
            assert.equal(slime.state, "defeated");
            assert.ok(player.velocityY < 0);
        }
        const level = new LevelManager(config);
        for (const enemy of level.enemies) if (enemy.stompable) enemy.defeat();
        level.complete = true;
        level.restart(); // Shared path for death, R and Replay Level.
        assert.equal(level.complete, false);
        assert.ok(level.enemies.every((enemy) => enemy.active && enemy.x === enemy.startX && enemy.walkTime === 0));
    }
    assert.equal(enemyAt({ stompable: false }).defeat(), false, "appearance does not control stompability");
    assert.equal(enemyAt({ appearance: "mushroom", stompable: true }).defeat(), true, "configuration controls behavior");
});

test("Level 2 remains completable with all three coins and swept enemy interactions enabled", () => {
    assertAuthoredRoute(levels[1]);
});

