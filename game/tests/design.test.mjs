import test from "node:test";
import assert from "node:assert/strict";
import { levels } from "../levels/levels.js";
import { validateLevel, jumpEnvelope } from "../levels/design/validateLevel.js";
import { platformReachability } from "../levels/design/platformReachability.js";
import { simulateRoute } from "../levels/design/simulateRoute.js";
import { LevelManager } from "../levels/LevelManager.js";
import { stepLevel } from "../engine/stepLevel.js";
import { assertAuthoredRoute } from "./helpers/authoredRoute.mjs";
import { readFileSync } from "node:fs";

test("section authoring preserves stable coin IDs and describes each route and encounter", () => {
    for (const level of levels) {
        const report = validateLevel(level);
        assert.deepEqual(report.errors, []);
        assert.deepEqual(level.coins.map((coin) => coin.id), [1, 2, 3].map((n) => `level-${level.id}-coin-${n}`));
        assert.deepEqual(level.platforms, level.stages.flatMap((stage) => stage.platforms));
        assert.deepEqual(level.enemies, level.stages.flatMap((stage) => stage.enemies ?? []));
        assert.equal(level.stages[0].start, 0);
        assert.equal(level.stages.at(-1).end, level.worldWidth);
        assert.ok(level.stages.every((stage) => stage.requiredRoute.length > 0));
        assert.ok(level.coins.slice(1).every((coin) => level.stages.some((stage) => stage.optionalRoutes.some((route) => route.coinId === coin.id))));
    }
});

test("validator rejects duplicate coins, unsupported patrols, bad references and broken section coverage", () => {
    const broken = structuredClone(levels[0]);
    broken.coins[1].id = broken.coins[0].id;
    broken.enemies[0].minX = 700;
    broken.stages[0].requiredRoute.push("missing-platform");
    broken.stages[1].start++;
    const report = validateLevel(broken);
    assert.equal(report.valid, false);
    for (const pattern of [/unique coins/, /Unsupported patrol/, /Unknown required platform/, /coverage/]) assert.ok(report.errors.some((error) => pattern.test(error)));
});

test("validator finds hidden coins, unsafe spawn, invalid motion paths and insufficient headroom", () => {
    const broken = structuredClone(levels[1]);
    broken.coins[1].y = 460;
    broken.spawn.x = 760;
    const ferry = broken.platforms.find((p) => p.id === "grove-ferry");
    ferry.distance = -broken.worldWidth;
    broken.platforms.find((p) => p.id === "l2-practice-1").y = 390;
    const report = validateLevel(broken);
    assert.equal(report.valid, false);
    for (const pattern of [/Coin overlaps/, /Spawn has no safe/, /leaves level bounds/, /headroom/]) assert.ok(report.errors.some((error) => pattern.test(error)), pattern.source);
});

test("jump measurements use unchanged integration at 30/60/120 FPS", () => {
    const envelopes = [30, 60, 120].map(jumpEnvelope);
    assert.ok(envelopes.every((e) => e.rise > 106 && e.rise < 116 && e.horizontalTravel >= 196 && e.horizontalTravel < 205));
    assert.ok(envelopes[0].rise < envelopes[2].rise, "discrete timestep differences must not be hidden");
});

test("every required and optional platform has a local physics route at each tested frame rate", () => {
    for (const level of levels) for (const fps of [30, 60, 120]) assert.deepEqual(platformReachability(level, fps).unreachable, []);
});

test("local graph identifies an impossible isolated platform instead of guessing it is reachable", () => {
    const level = structuredClone(levels[0]);
    level.platforms.push({ id: "unreachable", x: 9000, y: 20, width: 80, height: 24, role: "test" });
    assert.ok(platformReachability(level).unreachable.includes("unreachable"));
});

test("both complete three-coin routes survive live enemy/platform/hazard timing at all rates", () => {
    levels.forEach(assertAuthoredRoute);
});

test("both main routes reach the flag with zero coins at 30/60/120 FPS", () => {
    for (const config of levels) {
        const routes = JSON.parse(readFileSync(new URL(`./fixtures/level${config.id}-main-routes.json`, import.meta.url)));
        assert.deepEqual(routes.map((route) => route.fps), [30, 60, 120]);
        for (const route of routes) {
            const result = simulateRoute(config, route, { collection: "none" });
            assert.equal(result.success, true, `Level ${config.id}, ${route.fps} FPS: ${JSON.stringify(result)}`);
            assert.deepEqual(result.coinIds, []);
        }
    }
});

test("main-route objective never ignores an incidental pickup or weakens the three-coin proof", () => {
    const config = levels[0];
    const collecting = JSON.parse(readFileSync(new URL("./fixtures/level1-routes.json", import.meta.url)))[0];
    assert.equal(simulateRoute(config, collecting, { collection: "none" }).reason, "unexpected coin pickup");
    const avoiding = JSON.parse(readFileSync(new URL("./fixtures/level1-main-routes.json", import.meta.url)))[0];
    assert.equal(simulateRoute(config, avoiding).reason, "missing coins");
    assert.throws(() => simulateRoute(config, avoiding, { collection: "skip" }));
});

test("validation and route proofs never mutate authored definitions or persist attempt state", () => {
    const before = JSON.stringify(levels);
    levels.forEach(validateLevel);
    levels.forEach(assertAuthoredRoute);
    assert.equal(JSON.stringify(levels), before);
    assert.equal(levels.some((level) => "complete" in level), false);
});

test("route validation rejects missing jumps and cannot teleport across a pit or finish", () => {
    for (const level of levels) {
        const result = simulateRoute(level, { fps: 60, totalFrames: 1200, jumpFrames: [], inputs: [] });
        assert.equal(result.success, false);
        assert.equal(result.reason, "fall");
    }
});

test("shared runtime step preserves death priority, platform reset and camera-independent coordinates", () => {
    for (const config of levels) {
        const level = new LevelManager(config);
        const h = config.hazards[0];
        level.player.x = h.x;
        level.player.y = h.y - level.player.height + 10;
        assert.equal(stepLevel(level, 0, 1 / 60).death, "thorns");
        level.restart();
        const enemy = level.enemies[0];
        level.player.x = enemy.x;
        level.player.y = enemy.feetY - level.player.height;
        assert.equal(stepLevel(level, 0, 1 / 60).death, "enemy");
        level.restart();
        assert.equal(level.player.x, config.spawn.x);
        assert.ok(level.enemies.every((e) => e.active && e.x === e.startX));
        assert.ok(level.platforms.filter((p) => p.type).every((p) => p.elapsed === 0 && p.state === "stable"));
    }
});

