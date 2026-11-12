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

test("leaving and restomping reopens an expired gate, or refreshes the current countdown",()=>{
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

test("the actual cave button ignores walking and upward contact; only landing on it activates it",()=>{
    for(const fps of [30,60,120]) {
        const level=new LevelManager(level4),p=level.player,s=level.puzzle.switches[0];
        p.reset({x:s.x+10,feetY:460});
        for(let i=0;i<fps/2;i++)assert.equal(stepLevel(level,0,1/fps).death,null);
        assert.equal(level.puzzle.activationCount,0);
        jump(p,650);let landed=false;
        for(let i=0;i<fps&&!landed;i++) {
            assert.equal(stepLevel(level,0,1/fps).death,null);
            if(!p.grounded)assert.equal(level.puzzle.activationCount,0);
            landed=p.grounded;
        }
        assert.equal(landed,true);assert.equal(level.puzzle.activationCount,1);
        assert.equal(level.puzzle.gates[0].open,true);
        for(let i=0;i<fps*4;i++)assert.equal(stepLevel(level,0,1/fps).death,null);
        assert.equal(level.puzzle.gates[0].open,false);assert.equal(level.puzzle.activationCount,1);
        jump(p,650);
        for(let i=0;i<fps;i++)assert.equal(stepLevel(level,0,1/fps).death,null);
        assert.equal(level.puzzle.activationCount,2);
    }
});

// Real jump/landing inputs, no invincibility or hazard removal. The test starts
// beside the lower switch; separate full-course witnesses start at normal spawn.
function playVault(fps, activate=true) {
    const level=new LevelManager({...level4,spawn:{x:12990,feetY:460}}),coins=new CoinManager(level4.coins),p=level.player;
    let phase=activate?0:1,jumped=false,elapsed=0;
    const visited=new Set();
    for(let frame=0;frame<fps*7;frame++) {
        let direction=0,doJump=false;
        if(phase===0){direction=p.x<13040?1:0;
            if(!jumped&&p.grounded){doJump=true;jumped=true;}
            if(level.puzzle.switches[0].active){phase=1;jumped=false;}}
        if(phase===1){direction=-1;if(!jumped&&p.grounded){doJump=true;jumped=true;}
            if(jumped&&p.grounded&&p.supportPlatform?.id==="l4-vault-lower-step"){phase=2;jumped=false;}}
        if(phase===2){direction=p.x>12825?-1:0;if(p.x<=12825&&p.grounded){phase=3;jumped=false;}}
        if(phase===3){direction=-1;if(!jumped&&p.grounded){doJump=true;jumped=true;}
            if(jumped&&p.grounded&&p.supportPlatform?.id==="l4-vault-upper-step"){phase=4;jumped=false;}}
        if(phase===4){direction=1;if(!jumped&&p.grounded){doJump=true;jumped=true;}}
        if(doJump)jump(p,650);
        assert.equal(stepLevel(level,direction,1/fps).death,null);coins.update(p,1/fps);
        if(p.supportPlatform)visited.add(p.supportPlatform.id);
        elapsed=(frame+1)/fps;
        if(!activate&&phase===3&&p.x<=12728.1)break;
        if(coins.pending.has("level-4-coin-3"))break;
    }
    return {level,coins,elapsed,visited};
}

test("the lower-floor switch and return climb reach Coin 3 before expiry at 30/60/120 FPS",()=>{
    for(const fps of [30,60,120]) {
        const {level,coins,elapsed,visited}=playVault(fps);
        assert.equal(coins.pending.has("level-4-coin-3"),true);
        assert.ok(visited.has("l4-vault-lower-step")&&visited.has("l4-vault-upper-step"));
        // Includes the initial jump onto the switch before its timer even starts.
        assert.ok(elapsed<4);assert.ok(level.puzzle.gates[0].remainingTime>.1);
    }
});

test("the added return steps do not bypass the closed door or replace the timed switch",()=>{
    for(const fps of [30,60,120]) {
        const {level,coins}=playVault(fps,false);
        assert.equal(coins.pending.size,0);assert.equal(level.puzzle.activationCount,0);
        // The low step cannot jump straight onto the vault on its right side.
        const l=new LevelManager(level4),p=l.player;
        p.reset({x:12850,feetY:382});jump(p,650);
        let highest=382;
        for(let i=0;i<fps&&!p.grounded;i++){assert.equal(stepLevel(l,0,1/fps).death,null);highest=Math.min(highest,p.y+p.height);}
        assert.ok(highest>260);
        for(const x of [12850,12890,12909]) {
            const attempt=new LevelManager(level4),coins=new CoinManager(level4.coins),p=attempt.player;
            p.reset({x,feetY:382});jump(p,650);
            for(let i=0;i<fps;i++) {
                assert.equal(stepLevel(attempt,1,1/fps).death,null);coins.update(p,1/fps);
                if(!p.grounded)assert.equal(attempt.puzzle.activationCount,0);
            }
            assert.equal(coins.pending.size,0,"cannot grab the vault coin by jumping through its floor from the low step");
        }
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
