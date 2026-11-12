import { assertAuthoredRoute } from "./helpers/authoredRoute.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { Platform } from "../entities/Platform.js";
import { Player } from "../entities/Player.js";
import { applyGravity, carryPlayer, moveHorizontally, jump } from "../engine/Physics.js";
import { LevelManager } from "../levels/LevelManager.js";
import { levels } from "../levels/levels.js";
import { drawInteractivePlatforms } from "../rendering/PlatformRenderer.js";

const moving = (options = {}) => new Platform({ type: "moving", x: 100, y: 300, width: 120,
    height: 24, axis: "x", distance: 120, speed: 60, pause: 0.25, ...options });
function stand(platform, offset = 20) {
    const player = new Player({ x: platform.x + offset, feetY: platform.y });
    player.supportPlatform = platform;
    return player;
}
function tick(player, platforms, dt, direction = 0) {
    platforms.forEach((platform) => platform.update?.(dt));
    carryPlayer(player, 18000);
    const previousX = player.x;
    moveHorizontally(player, direction, 280, 18000, dt);
    applyGravity(player, 1800, platforms, dt, { previousX });
}

test("moving platforms pause and reverse at exact endpoints with configurable starts", () => {
    const platform = moving();
    platform.update(2); assert.equal(platform.x, 220);
    platform.update(0.1); assert.equal(platform.x, 220);
    platform.update(0.25); assert.ok(Math.abs(platform.x - 214) < 1e-7);
    const start = moving({ startProgress: 0.5, startDirection: -1 });
    assert.equal(start.x, 160);
    start.update(0.5); assert.equal(start.x, 130);
    assert.throws(() => moving({ speed: 0 }));
});

test("horizontal and vertical travel and grounded riding agree at 30/60/120 FPS", () => {
    for (const axis of ["x", "y"]) {
        const results = [];
        for (const fps of [30, 60, 120]) {
            const platform = moving({ axis, distance: axis === "y" ? -160 : 120 });
            const player = stand(platform);
            for (let i = 0; i < fps * 12; i++) {
                tick(player, [platform], 1 / fps);
                assert.equal(player.grounded, true);
                assert.equal(player.supportPlatform, platform);
                assert.ok(Math.abs(player.y + player.height - platform.y) < 1e-7);
                assert.ok(Math.abs(player.x - platform.x - 20) < 1e-7);
                assert.equal(player.velocityY, 0);
                assert.equal(player.isMoving, false, "riding does not fake a running animation");
            }
            results.push([platform.x, platform.y, player.x, player.y]);
        }
        results.forEach((value) => value.forEach((entry, index) => assert.ok(Math.abs(entry - results[0][index]) < 1e-6)));
    }
});

test("jumping detaches immediately and walking off an edge never carries twice", () => {
    for (const fps of [30, 60, 120]) {
        const platform = moving(), player = stand(platform);
        jump(player, 650);
        const oldX = player.x;
        tick(player, [platform], 1 / fps);
        assert.equal(player.supportPlatform, null);
        assert.equal(player.grounded, false);
        assert.equal(player.x, oldX);
        assert.ok(player.y + player.height < platform.y);
        const edge = stand(platform, platform.width - 0.1);
        tick(edge, [platform], 1 / fps, 1);
        assert.equal(edge.grounded, false);
        assert.equal(edge.supportPlatform, null);
        assert.ok(edge.y + edge.height > platform.y);
    }
});

test("falling onto moving tops attaches, including near an edge; upward jumps pass through", () => {
    for (const fps of [30, 60, 120]) for (const axis of ["x", "y"]) {
        const platform = moving({ axis, distance: axis === "y" ? -160 : 120 });
        const player = new Player({ x: 145, feetY: 270 });
        player.grounded = false; player.velocityY = 300;
        for (let i = 0; i < fps && !player.supportPlatform; i++) tick(player, [platform], 1 / fps);
        assert.equal(player.supportPlatform, platform);
        const edge = moving();
        const near = new Player({ x: edge.x - 31.5, feetY: edge.y - 1 });
        near.grounded = false; near.velocityY = 300;
        tick(near, [edge], 1 / fps);
        assert.equal(near.grounded, true);
        assert.ok(near.x + near.width > edge.x);
        const upward = new Player({ x: platform.x + 10, feetY: platform.y + 50 });
        jump(upward, 650);
        tick(upward, [platform], 1 / fps);
        assert.equal(upward.supportPlatform, null);
    }
});

test("riding and resets use world coordinates, with no dependency on camera position", () => {
    const platform = moving(), player = stand(platform);
    tick(player, [platform], 0.5);
    assert.equal(player.x, 150);
    platform.reset(); player.reset({ x: 120, feetY: 300 });
    assert.equal(platform.x, 100); assert.equal(platform.elapsed, 0);
    assert.equal(platform.deltaX, 0); assert.equal(platform.previousX, 100);
    assert.equal(player.supportPlatform, null);
});

const collapsing = (options = {}) => new Platform({ type: "collapsing", x: 100, y: 300,
    width: 120, height: 24, collapseDelay: 1, ...options });

test("landing triggers one collapse warning; continued standing never restarts its deadline", () => {
    for (const fps of [30, 60, 120]) {
        const platform = collapsing(), player = new Player({ x: 120, feetY: 299 });
        player.grounded = false; player.velocityY = 300;
        tick(player, [platform], 1 / fps);
        assert.equal(platform.state, "warning"); assert.equal(platform.warningTime, 0);
        for (let i = 0; i < fps - 1; i++) {
            tick(player, [platform], 1 / fps);
            assert.equal(platform.solid, true); assert.equal(player.grounded, true);
        }
        tick(player, [platform], 1 / fps);
        assert.equal(platform.state, "falling"); assert.equal(platform.solid, false);
        assert.equal(player.grounded, false); assert.equal(player.supportPlatform, null);
        assert.ok(player.y + player.height > platform.y);
        for (let i = 0; i < fps; i++) tick(player, [platform], 1 / fps);
        assert.equal(platform.state, "gone"); assert.equal(platform.solid, false);
        assert.ok(player.y > 540, "a vanished board is not an invisible floor");
    }
});

test("jumping just before disappearance is allowed; leaving never cancels the warning", () => {
    for (const fps of [30, 60, 120]) {
        const platform = collapsing(), player = stand(platform);
        platform.onLand();
        for (let i = 0; i < fps - 1; i++) tick(player, [platform], 1 / fps);
        jump(player, 650); tick(player, [platform], 1 / fps);
        assert.equal(platform.solid, false);
        assert.equal(player.grounded, false); assert.ok(player.velocityY < 0);
        assert.ok(player.y + player.height < platform.y);
    }
});

test("collapse delays are configurable and all temporary states reset", () => {
    const platform = collapsing({ collapseDelay: 1.5 });
    platform.onLand(); platform.update(1);
    assert.equal(platform.state, "warning");
    platform.reset(); assert.equal(platform.state, "stable"); assert.equal(platform.warningTime, 0);
    platform.onLand(); platform.update(1.5);
    assert.equal(platform.solid, false);
    platform.update(0.4); assert.equal(platform.state, "gone");
    platform.reset(); assert.equal(platform.state, "stable"); assert.equal(platform.solid, true);
    assert.equal(platform.elapsed, 0); assert.equal(platform.collapseTime, 0);
});

test("a collapsed board above safe terrain drops the player onto that terrain without a death effect", () => {
    // Isolated safe-floor case: live course bridges now span real pits.
    const platform = collapsing();
    const floor = { x: 0, y: 460, width: 1000, height: 80 };
    const player = stand(platform);
    for (let i = 0; i < 150; i++) tick(player, [platform, floor], 1 / 60);
    assert.equal(platform.state, "gone");
    assert.equal(player.grounded, true);
    assert.equal(player.y + player.height, 460);
    assert.equal(player.supportPlatform.type, undefined);
});

test("Level 2 runtime platforms reset after an attempt and leave enemy supports static", () => {
    const level = new LevelManager(levels[1]);
    assert.equal(level.platforms.filter((platform) => platform.type === "moving").length, 4);
    assert.equal(level.platforms.filter((platform) => platform.type === "collapsing").length, 2);
    for (const enemy of level.enemies) assert.ok(level.platforms.some((platform) => !platform.type &&
        platform.y === enemy.feetY && enemy.minX >= platform.x && enemy.maxX + enemy.width <= platform.x + platform.width));
    level.platforms.forEach((platform) => platform.onLand?.());
    level.updatePlatforms(2);
    assert.ok(level.platforms.some((platform) => platform.state === "gone"));
    level.restart();
    for (const platform of level.platforms.filter((entry) => entry.type)) {
        assert.equal(platform.elapsed, 0); assert.equal(platform.state, "stable");
        assert.equal(platform.solid, true); assert.equal(platform.deltaX, 0); assert.equal(platform.deltaY, 0);
        assert.equal(platform.x, platform.config.x); assert.equal(platform.y, platform.config.y);
    }
    assert.equal(level.player.supportPlatform, null);
    assert.ok(levels[1].platforms.every((platform) => platform.state === undefined), "runtime state must not leak into configuration");
    const first = new LevelManager(levels[0]);
    assert.ok(first.platforms.every((platform, index) => platform === levels[0].platforms[index]));
});

test("Level 2 remains completable with three coins and live platform/enemy behavior at all frame rates", () => {
    assertAuthoredRoute(levels[1]);
});

test("Level 2 horizontal crossings and the canopy lift can be boarded, ridden and exited", () => {
    for (const fps of [30, 60, 120]) for (const phase of [0, 1.2, 3.3]) {
        for (const id of ["grove-ferry", "grove-intro-ferry", "grove-lift"]) {
            const level = new LevelManager(levels[1]), {player, platforms} = level;
            level.updatePlatforms(phase);
            const ride = platforms.find(p => p.config?.id === id);
            const vertical = id === "grove-lift", intro = id === "grove-intro-ferry";
            player.reset({x:vertical?4790:intro?2820:7480,feetY:vertical?365:intro?330:365});
            let launched = false;
            for(let frame=0;frame<fps*9 && player.supportPlatform!==ride;frame++) {
                const ready = vertical ? ride.y>=340 : intro ? ride.x<=2920 : ride.x<=7590;
                if (!launched && ready && player.grounded) {jump(player,650);launched=true;}
                const stop = vertical ? 4940 : intro ? 2940 : Infinity;
                tick(player,platforms,1/fps,launched && player.x<stop?1:0);
            }
            assert.equal(player.supportPlatform,ride,`${id} boarding ${fps} FPS phase ${phase}`);
            const offset=player.x-ride.x, cycle=2*(Math.abs(ride.config.distance)/ride.config.speed+ride.config.pause);
            for(let i=0;i<Math.ceil(cycle*fps);i++) {
                tick(player,platforms,1/fps);assert.equal(player.supportPlatform,ride);
                assert.ok(Math.abs(player.x-ride.x-offset)<1e-6);
            }
            for(let i=0;i<fps*8 && (vertical?ride.y>261:intro?ride.x<2980:ride.x<7769);i++) tick(player,platforms,1/fps);
            // Walk to a generous takeoff point before leaving the canopy lift.
            if(vertical) for(let i=0;i<fps && player.x<4980;i++) tick(player,platforms,1/fps,1);
            jump(player,650);
            const stop=vertical?5150:intro?3150:8070;
            for(let i=0;i<fps*3&&!player.grounded;i++) tick(player,platforms,1/fps,player.x<stop?1:0);
            assert.equal(player.grounded,true);assert.ok(!player.supportPlatform.type);
            assert.ok(player.x>(vertical?5120:intro?2990:7880));
            if(vertical)assert.equal(player.supportPlatform.id,"l2-canopy");
        }
    }
});

test("warning/fall drawing is cosmetic, gone platforms stay invisible, and camera culling is safe", () => {
    const board = collapsing();
    board.onLand(); board.update(0.5);
    const before = JSON.stringify(board), calls = [];
    const ctx = new Proxy({ globalAlpha: 1 }, { get: (target, key) => target[key] ?? ((...args) => calls.push([key, ...args])) });
    drawInteractivePlatforms(ctx, [board], 0, 960);
    assert.equal(JSON.stringify(board), before);
    assert.ok(calls.some(([method, x, y]) => method === "lineTo" && y === board.height), "warning cracks are drawn");
    calls.length = 0;
    drawInteractivePlatforms(ctx, [board], 1000, 960); assert.equal(calls.length, 0);
    board.update(1); calls.length = 0;
    assert.equal(board.state, "gone");
    drawInteractivePlatforms(ctx, [board], 0, 960); assert.equal(calls.length, 0);
});

