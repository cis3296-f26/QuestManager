import test from "node:test";
import assert from "node:assert/strict";
import { Stalactite } from "../entities/Stalactite.js";
import { GatePuzzle } from "../levels/GatePuzzle.js";
import { LevelManager } from "../levels/LevelManager.js";
import { level4 } from "../levels/Level4.js";
import { Player } from "../entities/Player.js";
import { Enemy } from "../entities/Enemy.js";
import { jump } from "../engine/Physics.js";
import { resolveEnemyInteractions } from "../engine/EnemyInteractions.js";
import { stepLevel } from "../engine/stepLevel.js";
import { validateLevel } from "../levels/design/validateLevel.js";
import { GameAudioEvents } from "../audio/GameAudioEvents.js";
import { CoinManager } from "../levels/CoinManager.js";
const rect=p=>({x:p.x,y:p.y,width:p.width,height:p.height});
const definition={id:"rock",x:100,y:92,width:24,height:54,speed:520,warningDuration:1,
    trigger:{x:60,y:200,width:140,height:330}};
const floor=[{x:0,y:460,width:1000,height:80}];
const target={x:100,y:396,width:32,height:64};

test("stalactites trigger once, warn a full second, fall consistently and impact at 30/60/120 FPS",()=>{
    for(const fps of [30,60,120]) {
        const rock=new Stalactite(definition);let hits=0;
        for(let i=0;i<fps;i++)hits+=rock.update(1/fps,target,target,floor);
        assert.equal(rock.warningCount,1);assert.equal(rock.state,"falling");assert.ok(Math.abs(rock.y-92)<1e-6);assert.equal(hits,0);
        for(let i=0;i<fps/2;i++)hits+=rock.update(1/fps,target,target,floor);
        assert.ok(Math.abs(rock.y-352)<1e-6);assert.ok(hits>0,`${fps} FPS initial contact`);
        for(let i=0;i<fps;i++)rock.update(1/fps,target,target,floor);
        assert.equal(rock.state,"spent");assert.equal(rock.y,406);assert.equal(rock.impactCount,1);
        assert.equal(rock.update(1,target,target,floor),false);assert.equal(rock.warningCount,1);
        rock.reset();assert.equal(rock.state,"hanging");assert.equal(rock.y,92);assert.equal(rock.warningTime,0);assert.equal(rock.impactCount,0);
    }
});

test("trigger time includes within-frame entry; fast falling rocks cannot tunnel through players",()=>{
    const rock=new Stalactite(definition);
    rock.update(.1,{...target,x:140},{...target,x:0},floor);
    // Player's right edge enters x=60 after 28/140 of this tick.
    assert.ok(Math.abs(rock.warningTime-.08)<1e-8);
    const fast=new Stalactite({...definition,speed:20000});fast.state="falling";
    assert.equal(fast.update(1/30,target,target,floor),true);
    assert.equal(fast.state,"spent");assert.equal(fast.update(1/30,target,target,floor),false);
});

test("players can leave the trigger safely and platforms stop falling rocks before a player underneath",()=>{
    for(const fps of [30,60,120]) {
        const rock=new Stalactite(definition);
        rock.update(1/fps,target,target,floor);
        const safe={...target,x:300};
        for(let i=0;i<fps*3;i++)assert.equal(rock.update(1/fps,safe,safe,floor),false);
        assert.equal(rock.state,"spent");
        rock.reset();rock.state="falling";
        assert.equal(rock.update(1,target,target,[...floor,{x:50,y:300,width:200,height:24}]),false);
        assert.equal(rock.y,246);
    }
});

const gates=()=>new GatePuzzle([{id:"blue",x:50,y:284,width:80,height:16,mode:"plate",gateIds:["blue-gate"]}],
    [{id:"blue-gate",x:200,y:100,width:28,height:184},{id:"other",x:800,y:100,width:28,height:184}]);

test("closed gates block fast side, upward, downward and embedded contacts without causing death",()=>{
    for(const [start,end,axis,expected] of [
        [{x:100,y:200},{x:400,y:200},"x",168],
        [{x:350,y:200},{x:50,y:200},"x",228],
        [{x:200,y:350},{x:200,y:50},"y",284],
        [{x:200,y:0},{x:200,y:300},"y",36],
        [{x:201,y:200},{x:201,y:200},"x",228]
    ]) {
        const puzzle=gates(),p=new Player({x:end.x,feetY:end.y+64});p.grounded=false;p.velocityY=100;
        puzzle.update(p,{...start,width:32,height:64});assert.equal(p[axis],expected);
    }
    const corner=gates(),pCorner=new Player({x:780,feetY:424});
    pCorner.grounded=false;
    corner.update(pCorner,{x:100,y:0,width:32,height:64});
    assert.equal(pCorner.x,168,"diagonal overshoot must resolve on the entry side");
    // Ground-level main passage is below the optional sealed wall.
    const puzzle=gates(),p=new Player({x:300,feetY:460});
    puzzle.update(p,{x:100,y:396,width:32,height:64});assert.equal(p.x,300);
});

test("plate requires standing on its shelf, opens only linked gate, latches, and resets",()=>{
    const puzzle=gates(),p=new Player({x:70,feetY:300});p.grounded=false;
    puzzle.update(p,rect(p));assert.equal(puzzle.activationCount,0);
    p.grounded=true;puzzle.update(p,rect(p));
    assert.equal(puzzle.activationCount,1);assert.equal(puzzle.gates[0].open,true);assert.equal(puzzle.gates[1].open,false);
    puzzle.update(p,rect(p),.2);assert.equal(puzzle.activationCount,1);
    assert.equal(puzzle.switches[0].activationTime,.2);assert.equal(puzzle.gates[0].openTime,.2);
    p.x=400;p.y=200;puzzle.update(p,{x:100,y:200,width:32,height:64});assert.equal(p.x,400);
    puzzle.reset();assert.equal(puzzle.activationCount,0);assert.ok(puzzle.gates.every(g=>!g.open));assert.ok(puzzle.switches.every(s=>!s.active&&s.activationTime===0));assert.ok(puzzle.gates.every(g=>g.openTime===0));
    const touch=new GatePuzzle([{id:"touch",x:50,y:300,width:16,height:80,mode:"touch",gateIds:["g"]}],
        [{id:"g",x:200,y:100,width:28,height:184}]);
    p.x=100;p.y=310;p.grounded=false;touch.update(p,{x:0,y:310,width:32,height:64});assert.equal(touch.gates[0].open,true);
});

test("a closed gate prevents activating a touch switch through the wall",()=>{
    const puzzle=new GatePuzzle([{id:"s",x:300,y:200,width:20,height:70,mode:"touch",gateIds:["g"]}],
        [{id:"g",x:200,y:100,width:28,height:184}]);
    const p=new Player({x:400,feetY:264});p.grounded=false;
    puzzle.update(p,{x:100,y:200,width:32,height:64});assert.equal(p.x,168);assert.equal(puzzle.switches[0].active,false);
});

test("cave slimes reuse stomp/bounce and bats are deadly from above, side and below",()=>{
    for(const fps of [30,60,120])for(const appearance of ["cave-slime","bat"]) {
        const enemy=new Enemy({startX:100,minX:100,maxX:300,width:36,height:24,speed:0,
            appearance,stompable:appearance==="cave-slime",flying:appearance==="bat"},300);
        for(const kind of appearance==="bat"?["above","side","below"]:["above"]) {
            enemy.reset();const p=new Player({x:100,feetY:kind==="above"?260:kind==="below"?370:300});
            if(kind==="side")p.x=45;
            p.grounded=false;p.velocityY=kind==="below"?-3000:kind==="above"?3000:0;
            const previous=rect(p);if(kind==="side")p.x=130;else p.y+=p.velocityY/fps;
            enemy.update(1/fps);
            const hit=resolveEnemyInteractions(p,previous,[enemy],{dt:1/fps,gravity:1800,platforms:[]});
            assert.equal(hit.deadly,appearance==="bat",`${fps} ${appearance} ${kind}`);
            if(appearance==="cave-slime"){assert.equal(enemy.state,"defeated");assert.ok(p.velocityY<0);}
        }
    }
});

test("bat patrol stays within its airborne bounds and resets without needing a floor",()=>{
    for(const fps of [30,60,120]) {
        const level=new LevelManager(level4),bat=level.enemies.find(e=>e.flying);
        for(let i=0;i<fps*12;i++){bat.update(1/fps);assert.ok(bat.x>=bat.minX&&bat.x<=bat.maxX);assert.equal(bat.feetY,bat.spawnFeetY);}
        assert.ok(bat.walkTime>11);level.restart();assert.equal(bat.x,bat.startX);assert.equal(bat.walkTime,0);assert.equal(bat.direction,1);
    }
});

test("falling hazard death and level restart reset rocks, switches, gates, platforms and enemies",()=>{
    for(const fps of [30,60,120]) {
        const level=new LevelManager(level4),p=level.player,rock=level.stalactites[0];
        p.reset({x:rock.x,feetY:460});let death=null;
        for(let i=0;i<fps*3&&!death;i++)death=stepLevel(level,0,1/fps).death;
        assert.equal(death,"stalactite");
        level.puzzle.switches[0].active=true;level.puzzle.gates[0].open=true;
        level.platforms.find(p=>p.type==="collapsing").onLand();level.enemies[0].defeat();level.restart();
        assert.ok(level.stalactites.every(r=>r.state==="hanging"&&r.warningCount===0&&r.y===r.config.y));
        assert.ok(level.puzzle.gates.every(g=>!g.open));assert.ok(level.puzzle.switches.every(s=>!s.active));
        assert.ok(level.platforms.filter(p=>p.type).every(p=>p.elapsed===0&&p.state==="stable"));
        assert.ok(level.enemies.every(e=>e.active&&e.x===e.startX));assert.equal(p.x,80);
    }
});

test("warning, impact, switch and gate audio use confirmed transitions once per activation",()=>{
    const level=new LevelManager(level4),coins=new CoinManager(level4.coins),calls=[];
    const events=new GameAudioEvents({play:n=>calls.push(n),stopEffect(){}});
    let before=events.capture(level,coins);level.stalactites[0].warningCount++;
    events.after(before,level,coins,{stomped:[]});
    before=events.capture(level,coins);level.stalactites[0].impactCount++;level.puzzle.activationCount++;
    events.after(before,level,coins,{stomped:[]});
    before=events.capture(level,coins);events.after(before,level,coins,{stomped:[]});
    assert.deepEqual(calls,["crack","break","switch","gate"]);
});

test("layout validator rejects malformed hazard triggers, speed, gate links, and unsupported plates",()=>{
    assert.deepEqual(validateLevel(level4).errors,[]);
    for(const mutate of [c=>c.stalactites[0].speed=0,c=>c.stalactites[0].warningDuration=-1,
        c=>c.stalactites[0].trigger.y=-10,c=>c.switches[0].gateIds=["missing"],
        c=>c.switches[0].y=290,c=>c.gates[0].width=-1,c=>c.enemies.find(e=>e.flying).stompable=true]) {
        const c=structuredClone(level4);mutate(c);assert.equal(validateLevel(c).valid,false);
    }
});
