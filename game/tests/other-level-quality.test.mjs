import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { levels } from "../levels/levels.js";
import { LevelManager } from "../levels/LevelManager.js";
import { stepLevel } from "../engine/stepLevel.js";
import { jump } from "../engine/Physics.js";
import { simulateRoute } from "../levels/design/simulateRoute.js";
import { GrasslandRenderer } from "../rendering/GrasslandRenderer.js";
import { CaveRenderer } from "../rendering/CaveRenderer.js";
import { validateLevel } from "../levels/design/validateLevel.js";
const baseline=JSON.parse(readFileSync(new URL("./fixtures/other-quality-scope.json",import.meta.url)));
const hash=v=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
const id=p=>p?.id??p?.config?.id;
const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;

test("cave revisions preserve Levels 1–3, the approved cave entrance, coin IDs, moving/collapse definitions and flags",()=>{
    assert.equal(hash(levels[0]),baseline.level1);
    for(const ref of baseline.others) {
        const config=levels.find(l=>l.id===ref.id);
        assert.deepEqual(config.coins.map(c=>c.id),ref.coins);
        if(ref.id===4)assert.equal(hash(config.stages[0]),ref.entrance,"approved cave entrance changed");
        else assert.equal(hash(config.stages.slice(1)),ref.laterStages,`Level ${ref.id}: later gameplay changed`);
        assert.equal(hash(config.platforms.filter(p=>p.type)),ref.moving);
        assert.equal(hash(config.finish),ref.finish);
    }
});

test("entrances have different terrain/coin choices rather than the same early y365 shelf",()=>{
    assert.deepEqual(levels.slice(1).map(l=>l.coins[0].y),[305,270,470]);
    for(const config of levels.slice(1)) {
        const stage=config.stages[0];assert.ok(stage.platforms.filter(p=>p.terrain).length>=4);
        assert.ok(new Set(stage.platforms.filter(p=>p.terrain).map(p=>p.y)).size>=3);
        assert.deepEqual(validateLevel(config).errors,[]);
    }
    const cave=levels[3];assert.equal(cave.platforms.find(p=>p.id==="l4-first-coin").y,500);
    assert.ok(cave.coins[0].y>cave.groundY,"coin sits in a lower alcove, not another floating shelf");
});

test("required new crossings accept varied takeoffs and do not require passing through earth at any tested rate",()=>{
    for(const [index,leftId,rightId]of [[1,"l2-start","l2-first-landing"],[1,"l2-intro-dell","l2-intro-bank"],
        [2,"l3-start","l3-root-bank"],[2,"l3-entrance-east","l3-entrance-return"],
        [3,"l4-start","l4-entrance-bank"],[3,"l4-first-coin","l4-entrance-east"],[3,"l4-entrance-east","l4-bat-bank"]]) {
        for(const fps of [30,60,120])for(const offset of [8,16,24]) {
            const level=new LevelManager(levels[index]),p=level.player;
            const left=level.platforms.find(p=>p.id===leftId),right=level.platforms.find(p=>p.id===rightId);
            p.reset({x:left.x+left.width-p.width-offset,feetY:left.y});p.supportPlatform=left;jump(p,650);
            for(let frame=0;frame<fps*2&&!p.grounded;frame++) {
                assert.equal(stepLevel(level,1,1/fps).death,null,`${leftId} ${fps} FPS offset ${offset}`);
                assert.ok(!level.platforms.filter(q=>q.terrain).some(q=>overlaps(p,q)),"crossing cannot phase through earth");
            }
            assert.equal(id(p.supportPlatform),rightId,`${leftId} → ${rightId}, ${fps} FPS, ${offset}`);
        }
    }
});

test("optional forest boughs can be entered at several takeoffs, then exited onto safe lower terrain",()=>{
    for(const [index,sourceId,branchId,returnId]of [[1,"l2-first-landing","l2-practice-1","l2-intro-dell"],
        [2,"l3-root-bank","l3-intro-branch-1","l3-entrance-east"]])for(const fps of [30,60,120])for(const offset of [8,16,24]) {
        const level=new LevelManager(levels[index]),p=level.player,source=level.platforms.find(p=>p.id===sourceId),branch=level.platforms.find(p=>p.id===branchId);
        p.reset({x:source.x+source.width-p.width-offset,feetY:source.y});p.supportPlatform=source;jump(p,650);
        for(let frame=0;frame<fps*2&&!p.grounded;frame++)assert.equal(stepLevel(level,1,1/fps).death,null);
        assert.equal(id(p.supportPlatform),branchId);
        // Stop at the branch edge, then walk off. The nearby slime is intentionally
        // still active: this tests its real approach timing rather than removing it.
        p.x=branch.x+branch.width-8;
        for(let frame=0;frame<fps*2;frame++) {
            assert.equal(stepLevel(level,1,1/fps).death,null);
            if(p.grounded&&id(p.supportPlatform)!==branchId)break;
        }
        assert.equal(id(p.supportPlatform),returnId);
    }
});

test("intro slimes leave recovery after a worst-position stomp instead of forcing a fall into the next gap",()=>{
    for(const [index,edge]of [[1,1500],[2,1700],[3,1740]])for(const fps of [30,60,120]) {
        const level=new LevelManager(levels[index]),p=level.player,slime=level.enemies.find(e=>e.stompable);
        slime.x=slime.maxX;slime.direction=-1;p.reset({x:slime.x,feetY:slime.feetY-slime.height-8});p.grounded=false;p.velocityY=500;
        let stomped=false;
        for(let frame=0;frame<fps*2;frame++) {
            const result=stepLevel(level,1,1/fps);assert.equal(result.death,null);stomped||=result.stomped.includes(slime);
            if(stomped&&p.grounded)break;
        }
        assert.equal(stomped,true);assert.equal(p.grounded,true);assert.ok(edge-p.x-p.width>=24);
    }
});

test("cave alcove is optional: all-coin proofs use it while zero-coin proofs use the stone crossing",()=>{
    for(const suffix of ["routes","main-routes"])for(const config of levels.slice(1)) {
        const routes=JSON.parse(readFileSync(new URL(`./fixtures/level${config.id}-${suffix}.json`,import.meta.url)));
        for(const route of routes) {
            const all=suffix==="routes",r=simulateRoute(config,route,{collection:all?"all":"none",mainRoute:!all});
            assert.equal(r.success,true,`${config.id}/${route.fps}/${suffix}: ${JSON.stringify(r)}`);
            const detour={2:"l2-practice-1",3:"l3-intro-branch-1",4:"l4-first-coin"}[config.id];
            assert.equal(r.visited.includes(detour),all);
            if(config.id===4&&!all)assert.ok(r.visited.includes("l4-entrance-arch"));
        }
    }
});

test("cave's first bat leaves a visible safe corridor beneath its whole patrol",()=>{
    const c=levels[3],bat=c.enemies.find(e=>e.flying),bank=c.platforms.find(p=>p.id==="l4-bat-bank");
    assert.ok(bank.y-64-bat.feetY>=24);
    for(const fps of [30,60,120]) {
        const level=new LevelManager(c),p=level.player;p.reset({x:bank.x+15,feetY:bank.y});p.supportPlatform=bank;
        for(let frame=0;frame<fps*.9;frame++)assert.equal(stepLevel(level,1,1/fps).death,null);
    }
});

test("new terrain is unavailable inside the real opening pits; lower alcove remains a visible safe floor",()=>{
    for(const [index,x]of [[1,560],[1,1540],[2,540],[2,1740],[3,460],[3,1090],[3,1780]])for(const fps of [30,60,120]) {
        const level=new LevelManager(levels[index]);level.player.reset({x,feetY:500});let death;
        for(let i=0;i<fps&&!death;i++)death=stepLevel(level,0,1/fps).death;
        assert.equal(death,"fall");
    }
    const level=new LevelManager(levels[3]);level.player.reset({x:900,feetY:500});
    assert.equal(stepLevel(level,0,1/60).death,null);assert.equal(level.player.grounded,true);
});

test("forest and cave presentation data changes drawing, without mutating collisions or authored state",()=>{
    for(const config of levels.slice(1)) {
        const calls=[],ctx=new Proxy({globalAlpha:1},{get:(o,k)=>o[k]??((...a)=>calls.push([k,...a]))});
        const before=JSON.stringify(config),grass=new GrasslandRenderer(),renderer=config.theme==="cave"?new CaveRenderer():grass;
        for(const camera of [0,500,4000,11000]) {
            renderer.drawBackground(ctx,960,540,camera,460,config.theme,config.landscape);
            renderer.drawDecorations(ctx,config.scenery,460,camera,960);grass.drawPlatforms(ctx,config.platforms.filter(p=>!p.type),camera,960);
        }
        assert.equal(JSON.stringify(config),before);assert.ok(calls.some(c=>c[0]==="quadraticCurveTo"));
    }
});
