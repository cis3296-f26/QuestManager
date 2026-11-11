import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { levels } from "../levels/levels.js";
import { LevelManager } from "../levels/LevelManager.js";
import { Exploration } from "../levels/Exploration.js";
import { stepLevel } from "../engine/stepLevel.js";
import { jump } from "../engine/Physics.js";
import { validateExploration } from "../levels/design/validateExploration.js";
import { simulateExploration } from "../levels/design/simulateExploration.js";
import { drawExplorationFoliage, drawDiscoveryNotice } from "../rendering/ExplorationRenderer.js";

const witnesses = JSON.parse(readFileSync(new URL("./fixtures/exploration-routes.json", import.meta.url)));

test("exploration routes have valid hints, real entrance/exit terrain and stable coin IDs", () => {
    assert.deepEqual(levels.map((level) => level.explorationAreas.length), [2, 3, 3]);
    for (const config of levels) {
        assert.deepEqual(validateExploration(config), []);
        assert.deepEqual(config.coins.map((coin) => coin.id), [1, 2, 3].map((n) => `level-${config.id}-coin-${n}`));
    }
});

test("each secret can be entered, earn its linked coin and reconnect at 30/60/120 FPS", () => {
    assert.equal(witnesses.length, levels.reduce((n, config) => n + config.explorationAreas.length * 3, 0));
    for (const config of levels) for (const area of config.explorationAreas) {
        const routes = witnesses.filter((route) => route.levelId === config.id && route.areaId === area.id);
        assert.deepEqual(routes.map((route) => route.fps), [30, 60, 120]);
        for (const route of routes) {
            const result = simulateExploration(config, route);
            assert.equal(result.success, true, `${area.id}, ${route.fps} FPS: ${JSON.stringify(result)}`);
            assert.ok(result.discovered.includes(area.id));
            assert.ok(result.exited.includes(area.id));
            if (area.coinId) assert.ok(result.coinIds.includes(area.coinId));
        }
    }
});

test("discovery requires landing inside the area, not simply running along the ground below it", () => {
    const level = new LevelManager(levels[0]);
    const area = level.config.explorationAreas[1], p = level.player;
    p.x = area.bounds.x + 25;
    p.y = 396;
    level.exploration.update(p, 1 / 60);
    assert.equal(level.exploration.discovered.size, 0);
    p.y = 301; p.grounded = false;
    level.exploration.update(p, 1 / 60);
    assert.equal(level.exploration.discovered.size, 0);
    p.supportPlatform = level.platforms.find((surface) => surface.id === area.discoveryPlatforms[0]);
    p.grounded = true;
    assert.deepEqual(level.exploration.update(p, 1 / 60), [area.id]);
    assert.deepEqual(level.exploration.update(p, 1 / 60), []);
    assert.equal(level.exploration.notice, area.title);
});

test("foliage reveals before entry and easing agrees across frame rates", () => {
    const area = levels[0].explorationAreas[1], results = [];
    for (const fps of [30, 60, 120]) {
        const exploration = new Exploration([area]);
        const p = { x: area.bounds.x - 90, y: area.bounds.y + 30, width: 32, height: 64, grounded: false };
        for (let i = 0; i < fps; i++) exploration.update(p, 1 / fps);
        assert.ok(exploration.reveal.get(area.id) > .99);
        assert.equal(exploration.discovered.size, 0);
        results.push(exploration.reveal.get(area.id));
        p.x = 0;
        for (let i = 0; i < fps; i++) exploration.update(p, 1 / fps);
        assert.ok(exploration.reveal.get(area.id) < .01);
    }
    results.forEach((value) => assert.ok(Math.abs(value - results[0]) < 1e-10));
});

test("death/R/replay restart clears discoveries, reconnections, notices and reveal state", () => {
    for (const config of levels) {
        const level = new LevelManager(config), before = JSON.stringify(config);
        level.exploration.discovered.add(config.explorationAreas[0].id);
        level.exploration.exited.add(config.explorationAreas[0].id);
        level.exploration.notice = "Found"; level.exploration.noticeTime = 2;
        level.exploration.reveal.set(config.explorationAreas[0].id, 1);
        level.restart();
        assert.equal(level.exploration.discovered.size, 0);
        assert.equal(level.exploration.exited.size, 0);
        assert.equal(level.exploration.noticeTime, 0);
        assert.ok([...level.exploration.reveal.values()].every((value) => value === 0));
        assert.equal(JSON.stringify(config), before);
    }
});

test("invalid reconnections, unknown reward/platform IDs and hidden camera bounds are rejected", () => {
    const config = structuredClone(levels[0]), area = config.explorationAreas[0];
    area.exit.x = 850;
    area.coinId = "extra-coin";
    area.discoveryPlatforms.push("missing-surface");
    area.bounds.y = 0;
    const errors = validateExploration(config);
    for (const pattern of [/reconnection terrain/, /Unknown exploration coin/, /Discovery platform/, /invalid bounds/]) assert.ok(errors.some((error) => pattern.test(error)));
    const route = { ...witnesses[0], start: { x: 0, feetY: 0 } };
    assert.throws(() => simulateExploration(levels[0], route), /declared entrance/);
});

test("new canopy bough can be boarded, ridden and exited from three phases at every frame rate", () => {
    for (const fps of [30, 60, 120]) for (const phase of [0, 1.2, 3.3]) {
        const level = new LevelManager(levels[1]), p = level.player;
        level.updatePlatforms(phase);
        p.reset({ x: 5550, feetY: 260 });
        const bough = level.platforms.find((platform) => platform.config?.id === "grove-canopy-bough");
        let crossing = false;
        for (let frame = 0; frame < fps * 7 && p.supportPlatform !== bough; frame++) {
            if (bough.x < 5640) crossing = true;
            assert.equal(stepLevel(level, crossing ? 1 : 0, 1 / fps).death, null);
        }
        assert.equal(p.supportPlatform, bough);
        const offset = p.x - bough.x;
        const cycle = 2 * (70 / 40 + .35);
        for (let frame = 0; frame < Math.ceil(cycle * fps); frame++) {
            assert.equal(stepLevel(level, 0, 1 / fps).death, null);
            assert.equal(p.supportPlatform, bough);
            assert.ok(Math.abs(p.x - bough.x - offset) < 1e-6);
        }
        jump(p, 650);
        for (let frame = 0; frame < fps * 2 && !p.grounded; frame++) assert.equal(stepLevel(level, p.x < 5870 ? 1 : 0, 1 / fps).death, null);
        assert.equal(p.supportPlatform?.id, "l2-canopy-exit");
    }
});

test("foliage and discovery rendering stay cosmetic and safely cull offscreen areas", () => {
    const exploration = new Exploration(levels[0].explorationAreas);
    const calls = [], ctx = new Proxy({ globalAlpha: 1, measureText: (text) => ({ width: text.length * 8 }) },
        { get: (object, key) => object[key] ?? ((...args) => calls.push([key, ...args])) });
    const before = JSON.stringify([...exploration.reveal]);
    drawExplorationFoliage(ctx, exploration, 0, 960);
    assert.equal(calls.length, 0);
    drawExplorationFoliage(ctx, exploration, 4200, 960);
    assert.ok(calls.some(([method]) => method === "ellipse"));
    exploration.notice = "Clover Hollow"; exploration.noticeTime = 1;
    drawDiscoveryNotice(ctx, exploration);
    assert.ok(calls.some(([method, text]) => method === "fillText" && text === "Found: Clover Hollow"));
    assert.equal(JSON.stringify([...exploration.reveal]), before);
});
