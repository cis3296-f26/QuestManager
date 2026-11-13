import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { level4 } from "../levels/Level4.js";
import { levels } from "../levels/levels.js";
import { LevelManager } from "../levels/LevelManager.js";
import { CoinManager } from "../levels/CoinManager.js";
import { LevelProgressManager } from "../progress/LevelProgressManager.js";
import { LocalProgressStore } from "../progress/LocalProgressStore.js";
import { jump } from "../engine/Physics.js";
import { stepLevel } from "../engine/stepLevel.js";
import { CaveRenderer } from "../rendering/CaveRenderer.js";
import { GrasslandRenderer } from "../rendering/GrasslandRenderer.js";
import { drawCaveMechanics } from "../rendering/CaveMechanicsRenderer.js";
import { drawInteractivePlatforms } from "../rendering/PlatformRenderer.js";
import { drawEnemy } from "../rendering/EnemyRenderer.js";
const id=p=>p?.id??p?.config?.id;
const routes=suffix=>JSON.parse(readFileSync(new URL(`./fixtures/level4-${suffix}.json`,import.meta.url)));

function play(route) {
    const level=new LevelManager(level4),coins=new CoinManager(level4.coins),jumps=new Set(route.jumpFrames),visited=new Set();
    let timedEntry=false;
    for(let frame=0;frame<route.totalFrames;frame++) {
        if(jumps.has(frame)){assert.equal(level.player.grounded,true);jump(level.player,650);}
        const direction=route.inputs.find(i=>frame>=i.from&&frame<i.to)?.direction??1;
        const beforeRight=level.player.x+level.player.width;
        assert.equal(stepLevel(level,direction,1/route.fps).death,null);
        const gate=level.puzzle.gates[0];
        if(beforeRight>gate.x&&level.player.x+level.player.width<=gate.x&&
            level.player.y+level.player.height===365&&gate.remainingTime>0)timedEntry=true;
        coins.update(level.player,1/route.fps);
        if(level.player.supportPlatform)visited.add(id(level.player.supportPlatform));
    }
    assert.equal(level.checkCompletion(),true);
    return {level,coins,visited,timedEntry};
}

test("Crystal Cave has five purposeful sections, three stable coins and no content beyond Level 6",()=>{
    assert.deepEqual(levels.map(l=>l.id),[1,2,3,4,5,6]);
    assert.equal(level4.theme,"cave");assert.equal(level4.audio.music,"cave");
    assert.deepEqual(level4.stages.map(s=>s.id),["entrance","passages","falling-rocks","chamber","exit"]);
    assert.deepEqual(level4.coins.map(c=>c.id),[1,2,3].map(n=>`level-4-coin-${n}`));
    assert.equal(level4.explorationAreas.length,2);assert.equal(level4.gates.length,1);assert.equal(level4.switches.length,1);
    assert.equal(level4.stages[0].stalactites,undefined);assert.equal(level4.stages.at(-1).enemies,undefined);
    assert.ok(level4.stalactites.length>=10);
    assert.ok(level4.stalactites.every(r=>r.warningDuration>=.6&&r.warningDuration<=1.2));
    assert.ok(level4.enemies.every(e=>e.minX>850));
});

test("all-coin routes ride the ferry and beat the timed vault; main routes skip both secrets",()=>{
    for(const suffix of ["routes","main-routes"])for(const route of routes(suffix)) {
        const {level,coins,visited,timedEntry}=play(route),all=suffix==="routes";
        assert.equal(coins.pending.size,all?3:0);
        assert.ok(visited.has("l4-ferry"),`${route.fps} ${suffix}: must ride across the chasm`);
        // Timed gates have closed again by the finish; use actual activation and
        // the runway and protected-floor visits to establish that the puzzle was solved.
        assert.equal(level.puzzle.gates[0].open,false);assert.equal(level.puzzle.switches[0].active,false);
        assert.equal(level.puzzle.activationCount>0,all);assert.equal(timedEntry,all,"all-coin route must cross leftward through the timed door, not bypass the enclosure");
        if(all){assert.ok(visited.has("l4-vault-runway")&&visited.has("l4-vault"));assert.equal(level.exploration.discovered.size,2);}
        else assert.equal(level.exploration.discovered.size,0);
        assert.ok(level.stalactites.every(r=>r.warningCount===1));
        level.restart();coins.discard();
        assert.equal(coins.pending.size,0);assert.ok(level.stalactites.every(r=>r.warningCount===0));assert.equal(level.puzzle.gates[0].open,false);
    }
});

test("ground below the sealed optional vault remains a coin-free main-route bypass",()=>{
    for(const fps of [30,60,120]) {
        const level=new LevelManager({...level4,spawn:{x:12310,feetY:460}}),p=level.player,coins=new CoinManager(level4.coins);
        for(let i=0;i<fps*2;i++) {
            assert.equal(stepLevel(level,1,1/fps).death,null);coins.update(p,1/fps);
        }
        assert.ok(p.x>12800);assert.equal(coins.pending.size,0);
        assert.equal(level.puzzle.activationCount,0);assert.equal(level.puzzle.gates[0].open,false);
    }
});

test("cave ferry can be boarded, carried through reversal and exited at multiple phases",()=>{
    for(const fps of [30,60,120])for(const phase of [0,1.7,4.1]) {
        const level=new LevelManager(level4),p=level.player;level.updatePlatforms(phase);
        const ferry=level.platforms.find(p=>id(p)==="l4-ferry");
        p.reset({x:10685,feetY:365});p.supportPlatform=level.platforms.find(p=>id(p)==="l4-ferry-dock");
        let launched=false;
        for(let i=0;i<fps*10&&p.supportPlatform!==ferry;i++) {
            if(!launched&&ferry.x<10830){jump(p,650);launched=true;}
            assert.equal(stepLevel(level,launched?1:0,1/fps).death,null);
        }
        assert.equal(p.supportPlatform,ferry,`${fps} phase ${phase}: boarding`);
        const offset=p.x-ferry.x;
        for(let i=0;i<fps*8;i++){assert.equal(stepLevel(level,0,1/fps).death,null);assert.equal(p.supportPlatform,ferry);assert.ok(Math.abs(p.x-ferry.x-offset)<1e-6);}
        for(let i=0;i<fps*9;i++) {
            assert.equal(stepLevel(level,p.x-ferry.x<95?1:0,1/fps).death,null);
            if(ferry.x>11015&&p.x-ferry.x>=95)break;
        }
        jump(p,650);
        for(let i=0;i<fps*2&&!p.grounded;i++)assert.equal(stepLevel(level,p.x<11265?1:0,1/fps).death,null);
        assert.equal(id(p.supportPlatform),"l4-ferry-landing");
    }
});

test("cracked slab warns above a real pit; a last-moment jump reaches the approach shelf without opening the door",()=>{
    for(const fps of [30,60,120]) {
        const level=new LevelManager(level4),p=level.player,board=level.platforms.find(p=>id(p)==="l4-vault-crumble");
        const stand=()=>{p.reset({x:board.x+board.width-45,feetY:board.y});p.supportPlatform=board;board.onLand();};
        stand();let death;
        for(let i=0;i<fps*3&&!death;i++)death=stepLevel(level,0,1/fps).death;
        assert.equal(death,"fall");level.restart();stand();
        for(let i=0;i<Math.floor(fps*(board.config.collapseDelay-.1));i++)assert.equal(stepLevel(level,0,1/fps).death,null);
        jump(p,650);
        for(let i=0;i<fps*2&&!p.grounded;i++)assert.equal(stepLevel(level,p.x<12255?1:0,1/fps).death,null);
        assert.equal(id(p.supportPlatform),"l4-switch-shelf");assert.equal(level.puzzle.gates[0].open,false);
    }
});

test("Level 4 coins save only at completion, preserve older achievements across refresh, and isolate users",()=>{
    const disk=new Map(),storage={getItem:k=>disk.get(k),setItem:(k,v)=>disk.set(k,v)};
    const open=()=>{const p=new LevelProgressManager(new LocalProgressStore(storage));levels.forEach(l=>p.registerLevel(l));p.setUser("cave-A");return p;};
    const progress=open();
    for(const config of levels.slice(0,3))progress.completeLevel(config.id,[config.coins[0].id]);
    const before=JSON.stringify(progress.data.levels);
    const coins=new CoinManager(level4.coins);coins.pending.add(level4.coins[2].id);coins.discard();
    assert.equal(JSON.stringify(open().data.levels),before);assert.equal(progress.getLevel(4).unlocked,true);
    progress.completeLevel(4,[level4.coins[0].id,level4.coins[1].id]);
    const reloaded=open();assert.equal(reloaded.getLevel(4).coinIds.length,2);assert.equal(reloaded.getLevel(5).unlocked,true);
    assert.equal(levels.some(l=>l.id===7),false);
    for(const config of levels.slice(0,3))assert.deepEqual(reloaded.getLevel(config.id).coinIds,[config.coins[0].id]);
    reloaded.completeLevel(4,[level4.coins[2].id]);reloaded.completeLevel(4,[]);
    assert.equal(open().getLevel(4).fullyCompleted,true);assert.deepEqual(open().totalCoins,{earned:6,possible:30});
    reloaded.setUser("cave-B");assert.equal(reloaded.getLevel(4).unlocked,false);assert.deepEqual(reloaded.getLevel(4).coinIds,[]);
});

test("cave art has clear light terrain edges and distinct creatures without mutating gameplay",()=>{
    const colors=[],ctx=new Proxy({globalAlpha:1},{set(o,k,v){if(k==="fillStyle")colors.push(v);o[k]=v;return true;},get(o,k){return o[k]??(()=>{});}});
    const level=new LevelManager(level4),before=JSON.stringify(level),cave=new CaveRenderer(),terrain=new GrasslandRenderer();
    for(const camera of [0,3200,6300,10500,12200,15000]) {
        cave.drawBackground(ctx,960,540,camera,460);cave.drawDecorations(ctx,level4.scenery,460,camera,960);
        terrain.drawPlatforms(ctx,level.platforms.filter(p=>!p.type),camera,960);
        drawInteractivePlatforms(ctx,level.platforms,camera,960);drawCaveMechanics(ctx,level,camera,960,{reduceMotion:true});
        level.enemies.forEach(e=>drawEnemy(ctx,e,camera,960));
    }
    assert.ok(colors.includes("#d0c7d7"));assert.ok(colors.includes("#71d7d0"));assert.ok(!colors.includes("#b9e1ef"));
    assert.equal(JSON.stringify(level),before);
});
