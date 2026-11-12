import test from "node:test";
import assert from "node:assert/strict";
import { GatePuzzle } from "../levels/GatePuzzle.js";
import { LevelManager } from "../levels/LevelManager.js";
import { level4 } from "../levels/Level4.js";
import { CoinManager } from "../levels/CoinManager.js";
import { jump } from "../engine/Physics.js";
import { stepLevel } from "../engine/stepLevel.js";
import { validateLevel } from "../levels/design/validateLevel.js";
const box=p=>({x:p.x,y:p.y,width:p.width,height:p.height});
const timed=()=>new GatePuzzle([{id:"s",x:50,y:444,width:64,height:16,mode:"plate",openDuration:3.5,gateIds:["g"]}],
    [{id:"g",x:300,y:100,width:28,height:184}]);
const stand=()=>({x:65,y:396,width:32,height:64,grounded:true,velocityY:0});

test("timed switches close on schedule at every rate; holding the button cannot hold the door open",()=>{
    for(const fps of [30,60,120]) {
        const puzzle=timed(),p=stand();puzzle.update(p,box(p));
        assert.equal(puzzle.gates[0].open,true);
        for(let i=0;i<fps*3.5;i++)puzzle.update(p,box(p),1/fps);
        assert.equal(puzzle.gates[0].open,false);assert.equal(puzzle.switches[0].active,false);
        assert.equal(puzzle.activationCount,1);assert.equal(puzzle.switches[0].remainingTime,0);
        for(let i=0;i<fps;i++)puzzle.update(p,box(p),1/fps);
        assert.equal(puzzle.activationCount,1);
    }
});

test("leaving and stepping again reopens an expired gate, or refreshes the current countdown",()=>{
    const puzzle=timed(),p=stand();puzzle.update(p,box(p));
    puzzle.update(p,box(p),2);assert.equal(puzzle.switches[0].remainingTime,1.5);
    p.grounded=false;p.y=330;puzzle.update(p,box(p),.1);
    const previous=box(p);p.y=396;p.grounded=true;puzzle.update(p,previous,.1);
    assert.equal(puzzle.activationCount,2);assert.equal(puzzle.gates[0].remainingTime,3.5);
    puzzle.update(p,box(p),4);assert.equal(puzzle.gates[0].open,false);
    p.x=140;puzzle.update(p,box(p));p.x=65;puzzle.update(p,{...box(p),x:140});
    assert.equal(puzzle.activationCount,3);assert.equal(puzzle.gates[0].open,true);
});

test("expiring in the doorway grants only clearance grace and never crushes or teleports the player",()=>{
    const puzzle=timed(),p=stand();puzzle.update(p,box(p));
    p.x=305;p.y=200;p.grounded=false;const before=box(p);
    puzzle.update(p,before,4);assert.equal(puzzle.gates[0].open,true);assert.deepEqual(box(p),before);
    p.x=345;puzzle.update(p,box(p),.1);assert.equal(puzzle.gates[0].open,false);
    p.x=400;puzzle.update(p,{...box(p),x:250},1/30);assert.equal(p.x,268,"reclosed wall stops a fast crossing");
});

test("restart clears every timed gate, countdown, contact latch and activation counter",()=>{
    const level=new LevelManager(level4),p=level.player,s=level.puzzle.switches[0];
    p.reset({x:s.x+10,feetY:460});level.puzzle.update(p,{...box(p),y:p.y-1});
    assert.equal(level.puzzle.gates[0].open,true);level.restart();
    assert.equal(level.puzzle.activationCount,0);
    assert.ok(level.puzzle.switches.every(s=>!s.active&&!s.wasPressed&&s.remainingTime===0));
    assert.ok(level.puzzle.gates.every(g=>!g.open&&g.remainingTime===0&&g.openTime===0));
});

test("the floor plate activates on walking contact, never from the runway above",()=>{
    for(const fps of [30,60,120]) {
        const level=new LevelManager({...level4,spawn:{x:12990,feetY:460}}),p=level.player;
        for(let i=0;i<fps/4;i++)assert.equal(stepLevel(level,1,1/fps).death,null);
        assert.equal(level.puzzle.activationCount,1);
        level.restart();p.reset({x:13040,feetY:365});
        p.supportPlatform=level.platforms.find(p=>p.id==="l4-vault-runway");
        for(let i=0;i<fps*4;i++)assert.equal(stepLevel(level,0,1/fps).death,null);
        assert.equal(level.puzzle.activationCount,0);assert.equal(level.puzzle.gates[0].open,false);
    }
});

// Only ordinary movement/jump inputs after starting at the declared lower entrance.
// Full-course witnesses in level4.test start at the actual level spawn.
function playVault(fps, delay=0, exitDelay=0) {
    const level=new LevelManager({...level4,spawn:{x:12990,feetY:460}}),coins=new CoinManager(level4.coins),p=level.player;
    let phase=0,wait=0,insideTime=null,landedTime=null,elapsed=0,exitWait=0;
    const visited=new Set();
    for(let frame=0;frame<fps*13;frame++) {
        let direction=0;
        if(phase===0){direction=1;if(level.puzzle.activationCount){phase=1;direction=0;}}
        if(phase===1){wait+=1/fps;if(wait>=delay){jump(p,650);phase=2;}}
        if(phase===2&&p.grounded){phase=3;landedTime=frame/fps;}
        if(phase===3){direction=-1;if(coins.pending.has("level-4-coin-3")){phase=4;direction=0;}}
        if(phase===4){exitWait+=1/fps;if(exitWait>=exitDelay)direction=1;}
        assert.equal(stepLevel(level,direction,1/fps).death,null);coins.update(p,1/fps);
        if(p.supportPlatform)visited.add(p.supportPlatform.id);
        if(insideTime===null&&p.x+p.width<=level.puzzle.gates[0].x)insideTime=frame/fps;
        elapsed=(frame+1)/fps;
        if(phase===4&&p.x>=13280&&p.grounded)break;
    }
    return {level,coins,elapsed,visited,insideTime,landedTime};
}

test("step → jump through runway → run LEFT reaches the protected coin with a forgiving timer at every rate",()=>{
    assert.ok(!level4.platforms.some(p=>["l4-vault-lower-step","l4-vault-upper-step"].includes(p.id)));
    const times=[];
    for(const fps of [30,60,120])for(const delay of [0,.5,1]) {
        const {level,coins,elapsed,visited,insideTime,landedTime}=playVault(fps,delay);
        assert.equal(coins.pending.has("level-4-coin-3"),true);
        assert.ok(visited.has("l4-vault-runway")&&visited.has("l4-vault"));
        assert.ok(landedTime>delay&&landedTime<delay+.65,"one direct jump lands on the runway");
        assert.ok(insideTime<3.5&&insideTime>landedTime,"gate crossed before deadline, after runway landing");
        assert.ok(elapsed<7);assert.ok(level.player.x>=13280,"exit rejoins lower main route");
        if(delay===0)times.push(insideTime);
    }
    assert.ok(Math.max(...times)-Math.min(...times)<.1);
});

test("the protected side always permits exit after timeout, but never entry from the closed side",()=>{
    for(const fps of [30,60,120]) {
        const {level,coins,elapsed}=playVault(fps,0,4);
        assert.equal(coins.pending.size,1);assert.ok(elapsed<10);
        assert.ok(level.player.x>=13280);assert.equal(level.puzzle.gates[0].open,false);
    }
});

test("closed chamber blocks normal jumping from below, left and right, including fast corner sweeps",()=>{
    for(const fps of [30,60,120]) {
        // Local perimeter probes, not substitutes for the full-input course routes.
        for(const [x,feetY,direction] of [[12400,460,0],[12490,460,0],[12600,460,0],
            [12690,365,-1],[12720,365,-1],[12250,300,1]]) {
            const level=new LevelManager({...level4,spawn:{x,feetY}}),p=level.player,coins=new CoinManager(level4.coins);
            for(let f=0;f<fps*2;f++) {
                if(p.grounded)jump(p,650);
                assert.equal(stepLevel(level,direction,1/fps).death,null);coins.update(p,1/fps);
            }
            assert.equal(coins.pending.size,0,`${fps}: no bypass from ${x}/${feetY}`);
            assert.equal(level.puzzle.activationCount,0);
        }
        const level=new LevelManager(level4),gate=level.puzzle.gates[0],p=level.player;
        for(const [from,to] of [[{x:12720,y:290},{x:12400,y:290}],
            [{x:12480,y:396},{x:12480,y:280}],[{x:12250,y:220},{x:12500,y:220}],
            [{x:12300,y:330},{x:12480,y:280}]]) {
            Object.assign(p,to,{velocityY:200,grounded:false});
            level.puzzle.update(p,{...from,width:32,height:64},1/fps);
            assert.ok(!(p.x+32>12364&&p.x<gate.x&&p.y+64>184&&p.y<365),"swept walls reject entry into the sealed interior");
        }
    }
});

test("expired attempt is blocked; returning to the floor plate refreshes it and a normal retry succeeds",()=>{
    for(const fps of [30,60,120]) {
        const level=new LevelManager({...level4,spawn:{x:12990,feetY:460}}),p=level.player;
        const until=(condition,direction)=>{
            for(let i=0;i<fps*4&&!condition();i++)assert.equal(stepLevel(level,direction,1/fps).death,null);
            assert.ok(condition(),"bounded normal-input waypoint must be reached");
        };
        until(()=>level.puzzle.activationCount>0,1);
        for(let i=0;i<fps*4;i++)assert.equal(stepLevel(level,0,1/fps).death,null);
        assert.equal(level.puzzle.gates[0].open,false);
        jump(p,650);until(()=>p.grounded,0);
        for(let i=0;i<fps*2;i++)assert.equal(stepLevel(level,-1,1/fps).death,null);
        assert.ok(p.x>=12668-1e-6,"expired door blocks the return dash");
        // Leave the right end of the runway, drop, and walk back onto the switch.
        until(()=>p.x>=13210,1);
        until(()=>p.grounded,0);
        until(()=>level.puzzle.switches[0].active,-1);
        assert.equal(level.puzzle.activationCount,2);
        jump(p,650);until(()=>p.grounded,0);
        const coins=new CoinManager(level4.coins);
        for(let i=0;i<fps*3&&!coins.pending.size;i++) {
            assert.equal(stepLevel(level,-1,1/fps).death,null);coins.update(p,1/fps);
        }
        assert.equal(coins.pending.has("level-4-coin-3"),true);
    }
});

test("approach-timed spikes hit a blind runner, but baiting on clear ground is safe at every frame rate",()=>{
    for(const fps of [30,60,120])for(const id of ["l4-middle-rock","l4-paired-rock","l4-exit-rock"]) {
        const def=level4.stalactites.find(r=>r.id===id),spawn={x:def.trigger.x-40,feetY:460};
        // Isolate the target lane timing; full-course witnesses retain every hazard.
        const rush=new LevelManager({...level4,spawn,stalactites:[def]});let death;
        for(let i=0;i<fps*2&&!death;i++)death=stepLevel(rush,1,1/fps).death;
        assert.equal(death,"stalactite",`${id}/${fps}: running without reacting must be a real threat`);
        const bait=new LevelManager({...level4,spawn,stalactites:[def]});const rock=bait.stalactites.find(r=>r.config.id===id);
        for(let i=0;i<fps*2&&rock.state==="hanging";i++)assert.equal(stepLevel(bait,1,1/fps).death,null);
        assert.equal(rock.state,"warning");assert.ok(bait.player.x+32<rock.x-100);
        for(let i=0;i<fps*2&&rock.state!=="spent";i++)assert.equal(stepLevel(bait,0,1/fps).death,null);
        assert.equal(rock.state,"spent");assert.equal(rock.warningCount,1);
    }
});

test("timed switch definitions validate their durations and retain all three saved coin IDs",()=>{
    assert.deepEqual(validateLevel(level4).errors,[]);
    for(const duration of [0,-1,Infinity,NaN]) {
        const config=structuredClone(level4);config.switches[0].openDuration=duration;
        assert.equal(validateLevel(config).valid,false);
    }
    assert.deepEqual(level4.coins.map(c=>c.id),[1,2,3].map(n=>`level-4-coin-${n}`));
    assert.equal(level4.switches[0].y+level4.switches[0].height,460);
    assert.ok(level4.stalactites.every(r=>r.x<11800||r.x>13500),"the timed vault race has no falling-spike ambush");
});
