import test from "node:test";
import assert from "node:assert/strict";
import { levels } from "../levels/levels.js";
import { treeBounds, validateTreeSpacing } from "../rendering/SceneryGeometry.js";
import { GrasslandRenderer } from "../rendering/GrasslandRenderer.js";
import { validateLevel } from "../levels/design/validateLevel.js";

test("all foreground trees, including platform supports, have full silhouette spacing", () => {
    for (const level of levels) assert.deepEqual(validateTreeSpacing(level.scenery, level.groundY), []);
    const config = structuredClone(levels[2]);
    config.scenery.push({ type: "tree", x: 8950, scale: 1.55 });
    assert.ok(validateLevel(config).errors.some(e => /8950.*8980|8980.*8950/.test(e)));
});

test("tree bounds account for scale, crown lobes and wide supporting limbs", () => {
    assert.deepEqual(treeBounds({ type: "tree", x: 100, scale: 2 }), { x: 0, y: 204, width: 196, height: 256 });
    const branch = treeBounds({ type: "branch-tree", x: 8980, top: 359, reach: 240 });
    assert.equal(branch.x, 8735); assert.equal(branch.x + branch.width, 9225);
    assert.equal(branch.y, 215); assert.equal(branch.y + branch.height, 460);
    assert.equal(treeBounds({type:"flowers",x:10}),null);
});

test("tree culling uses full branches, so spacing does not cause camera-edge popping", () => {
    const calls=[], ctx=new Proxy({}, {get:(o,k)=>o[k]??((...a)=>calls.push([k,...a]))});
    const tree={type:"branch-tree",x:-220,top:359,reach:240}, renderer=new GrasslandRenderer();
    renderer.drawDecorations(ctx,[tree],460,0,960);
    assert.ok(calls.some(c=>c[0]==="stroke"),"visible branch tip must render even when its trunk is offscreen");
    calls.length=0;renderer.drawDecorations(ctx,[tree],460,30,960);
    assert.equal(calls.some(c=>c[0]==="stroke"),false);
});
