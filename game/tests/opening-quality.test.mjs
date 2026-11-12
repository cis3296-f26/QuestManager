import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { levels } from "../levels/levels.js";
import { LevelManager } from "../levels/LevelManager.js";
import { simulateRoute } from "../levels/design/simulateRoute.js";
import { stepLevel } from "../engine/stepLevel.js";
import { jump } from "../engine/Physics.js";
import { GrasslandRenderer } from "../rendering/GrasslandRenderer.js";
import { treeBounds } from "../rendering/SceneryGeometry.js";
import { validateLevel } from "../levels/design/validateLevel.js";
const level1=levels[0],opening=level1.stages[0];
const baseline=JSON.parse(readFileSync(new URL("./fixtures/opening-scope-baseline.json",import.meta.url)));
const hash=v=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
const id=p=>p?.id??p?.config?.id;
const recorder=()=>{
    const calls=[],ctx=new Proxy({globalAlpha:1},{set(o,k,v){calls.push(["set",k,v]);o[k]=v;return true;},get(o,k){return o[k]??((...args)=>calls.push([k,...args]));}});
    return {ctx,calls};
};

test("quality pass is restricted to Level 1 opening; later content and every saved coin ID are unchanged",()=>{
    for(const ref of baseline.unmodifiedLevels)assert.equal(hash(levels.find(l=>l.id===ref.id)),ref.hash,`Level ${ref.id} changed`);
    assert.equal(hash(level1.stages.slice(1)),baseline.laterLevel1);
    assert.equal(hash(level1.scenery.filter(d=>d.x>=2040)),baseline.laterScenery);
    assert.equal(hash(level1.coins.slice(1)),baseline.laterCoins);
    assert.deepEqual(level1.coins.map(c=>c.id),baseline.ids);
    assert.equal(opening.end,2040);assert.equal(level1.worldWidth,16000);
});

test("Levels 2–4 retain identical grass/terrain drawing commands at representative camera positions",()=>{
    for(const ref of baseline.traces) {
        const config=levels.find(l=>l.id===ref.id),r=new GrasslandRenderer(),{ctx,calls}=recorder();
        r.drawBackground(ctx,960,540,ref.camera,460,config.theme,config.openingLandscape);
        r.drawDecorations(ctx,config.scenery,460,ref.camera,960);
        r.drawPlatforms(ctx,config.platforms.filter(p=>!p.type),ref.camera,960);
        assert.equal(hash(calls),ref.hash,`Level ${ref.id} at camera ${ref.camera}: changed rendering`);
    }
});

test("opening forms a descending landform, optional supported branch, separate slime encounter and two real pits",()=>{
    const terrain=opening.platforms.filter(p=>p.terrain);
    assert.equal(terrain.length,6);assert.equal(new Set(terrain.map(p=>p.y)).size,5);
    assert.ok(terrain.every(p=>p.y+p.height===540));
    for(const [from,to] of [[terrain[0],terrain[1]],[terrain[1],terrain[2]]]) {
        assert.equal(from.x+from.width,to.x);assert.ok(to.y>from.y,"adjoining banks descend under existing physics");
    }
    for(const [left,right] of [[900,1020],[1690,1830]])assert.ok(!opening.platforms.some(p=>p.terrain&&p.x<right&&p.x+p.width>left));
    const oak=level1.scenery.find(d=>d.type==="branch-tree"&&d.x===500);
    const branch=opening.platforms.find(p=>p.id==="l1-practice-1");
    assert.equal(oak.top,branch.y+branch.height);assert.equal(oak.baseY,410);
    assert.equal(treeBounds(oak).y+treeBounds(oak).height,410);
    const bank=terrain.find(p=>p.id==="l1-descent-bank");
    assert.ok(bank.y-64-branch.y-branch.height>=10,"keep visible headroom below the optional branch");
    const slime=opening.enemies[0];assert.ok(slime.minX>=1380);assert.ok(1690-(slime.maxX+slime.width)>=170);
});

test("each required opening gap accepts different takeoff timings at 30/60/120 FPS",()=>{
    for(const fps of [30,60,120])for(const [leftId,rightId] of [["l1-dell","l1-first-landing"],["l1-slime-dell","l1-exit-bank"]])for(const offset of [8,16,24]) {
        const level=new LevelManager(level1),p=level.player,left=level.platforms.find(p=>p.id===leftId),right=level.platforms.find(p=>p.id===rightId);
        p.reset({x:left.x+left.width-p.width-offset,feetY:left.y});p.supportPlatform=left;jump(p,650);
        for(let frame=0;frame<fps*2&&!p.grounded;frame++) {
            assert.equal(stepLevel(level,1,1/fps).death,null,`${fps} FPS ${leftId}, offset ${offset}`);
            assert.ok(!opening.platforms.filter(p=>p.terrain).some(q=>overlaps(p,q)),"successful jump cannot phase through earth");
        }
        assert.equal(id(p.supportPlatform),rightId);
    }
});

test("walking off the optional oak branch returns to the dell with room to prepare for the pit",()=>{
    for(const fps of [30,60,120]) {
        const level=new LevelManager(level1),p=level.player,branch=level.platforms.find(p=>p.id==="l1-practice-1");
        p.reset({x:580,feetY:branch.y});p.supportPlatform=branch;
        for(let frame=0;frame<fps*2;frame++) {
            assert.equal(stepLevel(level,1,1/fps).death,null);
            if(id(p.supportPlatform)==="l1-dell")break;
        }
        assert.equal(id(p.supportPlatform),"l1-dell");assert.ok(900-p.x-p.width>=100,"no forced instant jump after branch drop");
    }
});

test("stomping the slime at the right end of its patrol leaves a ground recovery before the next pit",()=>{
    for(const fps of [30,60,120]) {
        const level=new LevelManager(level1),p=level.player,slime=level.enemies[0];
        slime.x=slime.maxX;slime.direction=-1;
        p.reset({x:slime.x,feetY:slime.feetY-slime.height-8});p.grounded=false;p.velocityY=500;
        let stomped=false;
        for(let frame=0;frame<fps*2;frame++) {
            const result=stepLevel(level,1,1/fps);assert.equal(result.death,null);
            stomped||=result.stomped.includes(slime);
            if(stomped&&p.grounded)break;
        }
        assert.equal(stomped,true);assert.equal(id(p.supportPlatform),"l1-slime-dell");
        assert.ok(1690-p.x-p.width>=24,"bounce cannot force an immediate pit fall");
    }
});

test("opening pits have no invisible floor, and a missing jump produces the normal fall death",()=>{
    for(const fps of [30,60,120])for(const x of [940,1740]) {
        const level=new LevelManager(level1);level.player.reset({x,feetY:460});let death;
        for(let frame=0;frame<fps&&!death;frame++)death=stepLevel(level,0,1/fps).death;
        assert.equal(death,"fall");
    }
});

test("terrace headroom validation protects the lower route under the overlook",()=>{
    assert.equal(validateLevel(level1).valid,true);
    const malformed=structuredClone(level1);malformed.platforms.find(p=>p.id==="l1-practice-1").y=330;
    assert.ok(validateLevel(malformed).errors.some(e=>/terrace headroom/.test(e)));
});

test("opening landscape is cosmetic, fades out by x2040 and does not change later Level 1 backgrounds",()=>{
    const renderer=new GrasslandRenderer(),before=JSON.stringify(level1);
    const a=recorder(),b=recorder();
    renderer.drawBackground(a.ctx,960,540,2040,460,level1.theme,level1.openingLandscape);
    renderer.drawBackground(b.ctx,960,540,2040,460,level1.theme);
    assert.equal(hash(a.calls),hash(b.calls));
    for(const camera of [0,1100,1600,2039])renderer.drawBackground(a.ctx,960,540,camera,460,level1.theme,level1.openingLandscape);
    assert.equal(JSON.stringify(level1),before);
});

test("continuous all-coin witnesses use the oak; zero-coin witnesses leave that route optional",()=>{
    for(const suffix of ["routes","main-routes"]) {
        const routes=JSON.parse(readFileSync(new URL(`./fixtures/level1-${suffix}.json`,import.meta.url)));
        for(const route of routes) {
            const all=suffix==="routes",result=simulateRoute(level1,route,{collection:all?"all":"none",mainRoute:!all});
            assert.equal(result.success,true,`${route.fps} ${suffix}: ${JSON.stringify(result)}`);
            assert.equal(result.visited.includes("l1-practice-1"),all);
        }
    }
});
