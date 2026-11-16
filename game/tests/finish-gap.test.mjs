import test from "node:test";
import assert from "node:assert/strict";
import { level1 } from "../levels/Level1.js";
import { LevelManager } from "../levels/LevelManager.js";
import { stepLevel } from "../engine/stepLevel.js";
import { jump } from "../engine/Physics.js";
import { movement } from "../engine/Movement.js";

test("Level 1 finish entrance is an open pit that causes a fall, and can be jumped at all frame rates", () => {
    const left = level1.platforms.find(p => p.id === "l1-gold-recovery");
    const right = level1.platforms.find(p => p.id === "l1-finish-ground");
    const edge = left.x + left.width;
    assert.equal(edge, 14500);
    assert.equal(right.x - edge, 140);
    assert.equal(level1.platforms.some(p => p.x < right.x && p.x + p.width > edge), false,
        "no invisible platform may bridge the pit");
    for (const fps of [30, 60, 120]) {
        const falling = new LevelManager(level1);
        falling.player.reset({ x: edge + 40, feetY: level1.groundY });
        let death;
        for (let i = 0; i < fps && !death; i++) death = stepLevel(falling, 0, 1 / fps).death;
        assert.equal(death, "fall");
        const crossing = new LevelManager(level1);
        crossing.player.reset({ x: edge - 60, feetY: level1.groundY });
        crossing.player.supportPlatform = left;
        jump(crossing.player, movement.jumpStrength);
        let landed = false;
        for (let i = 0; i < fps; i++) {
            assert.equal(stepLevel(crossing, 1, 1 / fps).death, null);
            if (crossing.player.grounded && crossing.player.x >= right.x) { landed = true; break; }
        }
        assert.equal(landed, true, `pit is jumpable at ${fps} FPS`);
    }
});
