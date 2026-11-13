import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {levels} from "../levels/levels.js";
import {level5} from "../levels/Level5.js";
import {LevelManager} from "../levels/LevelManager.js";
import {CoinManager} from "../levels/CoinManager.js";
import {LevelProgressManager} from "../progress/LevelProgressManager.js";
import {LocalProgressStore} from "../progress/LocalProgressStore.js";
import {simulateRoute} from "../levels/design/simulateRoute.js";
import {validateLevel} from "../levels/design/validateLevel.js";
import {jump} from "../engine/Physics.js";
import {stepLevel} from "../engine/stepLevel.js";
import {DesertRenderer,drawWind} from "../rendering/DesertRenderer.js";
import {GrasslandRenderer} from "../rendering/GrasslandRenderer.js";
import {drawEnemy} from "../rendering/EnemyRenderer.js";
import {drawInteractivePlatforms} from "../rendering/PlatformRenderer.js";
import {drawExplorationFoliage} from "../rendering/ExplorationRenderer.js";
import {arrangeMusic} from "../audio/MusicScores.js";
const hash=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const routes=suffix=>JSON.parse(readFileSync(new URL(`./fixtures/level5-${suffix}.json`,import.meta.url)));
const id=p=>p?.id??p?.config?.id;

test("Sunscorched Dunes has five distinct terrain sections and stable three-coin IDs, without filler length",()=>{
    assert.deepEqual(levels.map(l=>l.id),[1,2,3,4,5,6]);assert.equal(level5.name,"Sunscorched Dunes");
    assert.deepEqual(level5.stages.map(s=>s.id),["arrival","canyon","oasis","ridge","ruins"]);
    assert.ok(level5.worldWidth>=20000&&level5.worldWidth<=24000);
    assert.ok(levels.slice(0,4).every(l=>l.worldWidth<level5.worldWidth));assert.deepEqual(validateLevel(level5).errors,[]);
    assert.ok(new Set(level5.platforms.filter(p=>p.terrain).map(p=>p.y)).size>=6);
    assert.deepEqual(level5.coins.map(c=>c.id),[1,2,3].map(n=>`level-5-coin-${n}`));
    assert.equal(level5.windZones.length,8);assert.equal(level5.platforms.filter(p=>p.type==="collapsing").length,4);
    assert.equal(level5.switches.length,0);assert.equal(level5.gates.length,0);
    assert.equal(level5.stages[2].windZones,undefined);assert.equal(level5.stages[2].enemies,undefined);
    for(const area of level5.explorationAreas)assert.ok(!level5.hazards.some(h=>
        area.entrance.x<h.x+h.width&&area.entrance.x+area.entrance.width>h.x&&
        area.entrance.y<h.y+h.height&&area.entrance.y+area.entrance.height>h.y),"declared entrance must be a safe observation point");
    assert.equal(level5.stages[4].enemies,undefined);assert.equal(level5.stages[4].hazards,undefined);
});

test("full normal-input routes visit all three detours and both cracked platforms; lower main routes need neither",()=>{
    for(const suffix of ["routes","main-routes"])for(const route of routes(suffix)) {
        const all=suffix==="routes",r=simulateRoute(level5,route,{collection:all?"all":"none",mainRoute:!all});
        assert.equal(r.success,true,`${route.fps}/${suffix}: ${JSON.stringify(r)}`);
        assert.equal(r.coinIds.length,all?3:0);if(all)assert.ok(r.discovered.length>=3);else assert.equal(r.discovered.length,0);
        for(const name of ["l5-alcove","l5-oasis-window","l5-crack-west","l5-crack-east","l5-windward-cache"])
            assert.equal(r.visited.includes(name),all,`${route.fps}: purposeful route through ${name}`);
        for(const name of ["l5-canyon-ferry","l5-bridge-crack-a","l5-bridge-crack-b"])assert.ok(r.visited.includes(name));
        if(all)for(const area of ["l5-sandstone-alcove","l5-oasis-overlook","l5-ridge-cache"]){assert.ok(r.discovered.includes(area));assert.ok(r.exited.includes(area));}
        else {assert.ok(r.visited.includes("l5-arrival-arch"));assert.ok(r.visited.includes("l5-scorpion-bank"));}
    }
});

test("lower terrain cannot jump through the floor to take the hard coin or board its upper ledge",()=>{
    for(const fps of [30,60,120])for(const x of [15700,15800,15890,16050,16100])for(const direction of [-1,0,1]) {
        const l=new LevelManager({...level5,spawn:{x,feetY:460}}),p=l.player,c=new CoinManager(level5.coins);
        stepLevel(l,0,1/fps);jump(p,650);
        for(let f=0;f<fps&&!p.grounded;f++) {const r=stepLevel(l,direction,1/fps);if(r.death)break;c.update(p,1/fps);}
        assert.equal(c.pending.has("level-5-coin-3"),false);assert.notEqual(id(p.supportPlatform),"l5-windward-cache");
    }
});

test("scorpions are deadly from the side and above, patrol only supported banks, and reset on retry",()=>{
    for(const fps of [30,60,120])for(const def of level5.enemies) {
        const l=new LevelManager(level5),p=l.player,e=l.enemies.find(e=>e.startX===def.startX);
        for(let f=0;f<fps*8;f++){e.update(1/fps);assert.ok(e.x>=def.minX&&e.x<=def.maxX);}
        assert.equal(e.stompable,false);p.reset({x:e.x,feetY:e.feetY});
        assert.equal(stepLevel(l,0,1/fps).death,"enemy");l.restart();
        assert.ok(l.enemies.every(e=>e.active&&e.x===e.startX&&e.walkTime===0));
        const enemy=l.enemies.find(e=>e.startX===def.startX);
        p.reset({x:enemy.x,feetY:enemy.feetY-enemy.height-2});p.grounded=false;p.velocityY=500;
        assert.equal(stepLevel(l,0,1/fps).death,"enemy");
    }
});

test("cracked ridge shelves warn, fail over danger and reset along with gust clocks and pending coins",()=>{
    for(const fps of [30,60,120]) {
        const l=new LevelManager(level5),p=l.player,c=new CoinManager(level5.coins),board=l.platforms.find(p=>id(p)==="l5-crack-east");
        p.reset({x:board.x+20,feetY:board.y});p.supportPlatform=board;let death=null;
        for(let f=0;f<fps*4&&!death;f++)death=stepLevel(l,0,1/fps).death;
        assert.equal(death,"fall");assert.ok(!board.solid);assert.ok(l.wind.time>1);
        c.pending.add(level5.coins[2].id);l.restart();c.discard();
        assert.equal(l.wind.time,0);assert.equal(l.wind.velocity,0);assert.equal(c.pending.size,0);
        assert.ok(l.platforms.filter(p=>p.type).every(p=>p.state==="stable"&&p.warningTime===0));
    }
});

test("Level 5 saves union only completed attempts, preserve Levels 1–4, isolate users and unlock Level 6",()=>{
    const disk=new Map(),storage={getItem:k=>disk.get(k),setItem:(k,v)=>disk.set(k,v)};
    const load=()=>{const p=new LevelProgressManager(new LocalProgressStore(storage));levels.forEach(l=>p.registerLevel(l));p.setUser("desert-A");return p;};
    const p=load();for(const level of levels.slice(0,4))p.completeLevel(level.id,level.coins.map(c=>c.id));
    const earlier=JSON.stringify(p.data.levels);assert.equal(p.getLevel(5).unlocked,true);
    const c=new CoinManager(level5.coins);c.pending.add(level5.coins[0].id);c.discard();
    assert.equal(JSON.stringify(load().data.levels),earlier);
    p.completeLevel(5,level5.coins.map(c=>c.id),{developerAssisted:true});assert.equal(load().getLevel(5).completed,false);
    p.completeLevel(5,[level5.coins[0].id]);const fresh=load();
    assert.equal(fresh.getLevel(6).unlocked,true);assert.equal(levels.some(l=>l.id===7),false);
    fresh.completeLevel(5,[level5.coins[1].id,level5.coins[2].id]);fresh.completeLevel(5,[]);
    assert.equal(load().getLevel(5).fullyCompleted,true);assert.deepEqual(load().totalCoins,{earned:15,possible:30});
    for(const config of levels.slice(0,4))assert.deepEqual(load().getLevel(config.id).coinIds,config.coins.map(c=>c.id));
    fresh.setUser("desert-B");assert.equal(fresh.getLevel(5).unlocked,false);assert.deepEqual(fresh.getLevel(5).coinIds,[]);
});

test("desert art uses its own readable palette without changing terrain, enemy or wind state",()=>{
    const colors=[],ctx=new Proxy({globalAlpha:1},{set(o,k,v){if(k==="fillStyle")colors.push(v);o[k]=v;return true;},get:(o,k)=>o[k]??(()=>{})});
    const l=new LevelManager(level5),before=JSON.stringify(l),desert=new DesertRenderer(),terrain=new GrasslandRenderer();
    for(const camera of [0,4200,10600,15000,20600]) {
        desert.drawBackground(ctx,960,540,camera,460,level5.theme,level5.landscape);desert.drawDecorations(ctx,level5.scenery,460,camera,960);
        terrain.drawPlatforms(ctx,l.platforms.filter(p=>!p.type),camera,960);drawInteractivePlatforms(ctx,l.platforms,camera,960);
        drawExplorationFoliage(ctx,l.exploration,camera,960);drawWind(ctx,l.wind,camera,960,{reduceMotion:true});
        l.enemies.forEach(e=>drawEnemy(ctx,e,camera,960));
    }
    assert.ok(colors.includes("#76b6b5")&&colors.includes("#f5d99a")&&colors.includes("#c78650"));
    assert.equal(JSON.stringify(l),before);
});

test("earlier level configurations and all five earlier music arrangements retain their exact baseline",()=>{
    const baseline=JSON.parse(readFileSync(new URL("./fixtures/pre-desert-baseline.json",import.meta.url)));
    assert.deepEqual(levels.slice(0,4).map(hash),baseline.levels);
    for(const [key,value] of Object.entries(baseline.music))assert.equal(hash(arrangeMusic(key)),value,key);
});
