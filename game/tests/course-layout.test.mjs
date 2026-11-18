import test from "node:test";
import assert from "node:assert/strict";
import { levels } from "../levels/levels.js";
import { LevelManager } from "../levels/LevelManager.js";
import { stepLevel } from "../engine/stepLevel.js";
import { readFileSync } from "node:fs";
import { simulateRoute } from "../levels/design/simulateRoute.js";
import { jump } from "../engine/Physics.js";

const id = p => p.id ?? p.config?.id;

test("Levels 1–5 opening detours each contain one broad ledge and the easy coin directly above it", () => {
    for (const config of levels.filter(l=>l.id<=5)) {
        const detour = config.stages[0].optionalRoutes[0];
        assert.equal(detour.platforms.length, 1, "no empty opening staircase");
        const ledge = config.platforms.find(p => p.id === detour.platforms[0]), coin = config.coins[0];
        assert.ok(ledge.width >= 160);
        assert.ok(coin.x > ledge.x + 20 && coin.x < ledge.x + ledge.width - 20);
        assert.equal(coin.y, ledge.y - 30);
        assert.equal(coin.id, `level-${config.id}-coin-1`);
    }
});

test("simplified bypasses end beyond their danger and do not require decorative recovery steps", () => {
    for (const [index, bridgeId, enemyId] of [[0,"l1-bypass-1","l1-first-mushroom"],
        [0,"l1-mushroom-bridge","l1-ridge-mushroom"], [0,"l1-east-bridge","l1-sunlit-mushroom"],
        [0,"l1-gold-bridge","l1-gold-mushroom"], [1,"l2-lookout-2","l2-lookout-mushroom"]]) {
        const bridge = levels[index].platforms.find(p => p.id === bridgeId), enemy = levels[index].enemies.find(e => e.id === enemyId);
        assert.ok(bridge.x + bridge.width > enemy.maxX + enemy.width, `${bridgeId}: clear patrol before dropping`);
    }
    const lookout = levels[1].platforms.find(p => p.id === "l2-lookout-2");
    const thorns = levels[1].hazards.find(h => h.id === "l2-lookout-thorns-hazard");
    assert.ok(lookout.x < thorns.x && lookout.x + lookout.width > thorns.x + thorns.width);
});

test("timed course bridges span real pits: waiting falls, leaving before collapse reaches a safe exit", () => {
    for (const [index, boardId, exitId] of [[1,"grove-crumble-4030","l2-fern-exit"], [2,"l3-heart-crumble","l3-heart-landing"]]) {
        const config = levels[index];
        for (const fps of [30,60,120]) {
            const level = new LevelManager(config), board = level.platforms.find(p => id(p) === boardId), p = level.player;
            const stand = () => { p.reset({ x: board.x + board.width - 45, feetY: board.y }); p.supportPlatform = board; board.onLand(); };
            assert.ok(!level.platforms.some(q => q.y === config.groundY && q.x < board.x + board.width && q.x + q.width > board.x), "no safe floor under the timer challenge");
            stand(); let death = null;
            for (let i=0;i<fps*3&&!death;i++) death = stepLevel(level,0,1/fps).death;
            assert.equal(death,"fall");
            level.restart(); stand();
            for(let i=0;i<Math.floor(fps*(board.config.collapseDelay-.1));i++) assert.equal(stepLevel(level,0,1/fps).death,null);
            jump(p,650);
            const exit = level.platforms.find(q => id(q) === exitId);
            for(let i=0;i<fps*2&&!p.grounded;i++) assert.equal(stepLevel(level,p.x<exit.x+35?1:0,1/fps).death,null);
            assert.equal(id(p.supportPlatform),exitId, `${boardId} escape at ${fps} FPS`);
        }
    }
});

test("Deep Forest lift reaches a branch across a real ravine rather than duplicating a safe floor", () => {
    const config = levels[2];
    assert.ok(!config.platforms.some(p => p.y === config.groundY && p.x < 8060 && p.x+p.width > 7740));
    const branch = config.platforms.find(p => p.id === "l3-lift-bough");
    assert.ok(branch.x >= 7740 && branch.x+branch.width <= 8060);
    for(const fps of [30,60,120]) {
        const level = new LevelManager(config);level.player.reset({x:7750,feetY:460});let death;
        for(let i=0;i<fps&&!death;i++)death=stepLevel(level,0,1/fps).death;
        assert.equal(death,"fall");
    }
});


test("both Deep Forest routes use the lift and timed ravine bridge instead of walking underneath", () => {
    for(const suffix of ["routes", "main-routes"]) {
        const routes=JSON.parse(readFileSync(new URL(`./fixtures/level3-${suffix}.json`,import.meta.url)));
        for(const route of routes) {
            const main=suffix==="main-routes";
            const result=simulateRoute(levels[2],route,{collection:main?"none":"all",mainRoute:main});
            assert.equal(result.success,true);
            assert.ok(result.visited.includes("l3-tree-lift"), `${suffix} ${route.fps} FPS lift`);
            assert.ok(result.visited.includes("l3-heart-crumble"), `${suffix} ${route.fps} FPS bridge`);
        }
    }
});
