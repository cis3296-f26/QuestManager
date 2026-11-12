import test from "node:test";
import assert from "node:assert/strict";
import { Wind, validateWind } from "../engine/Wind.js";
import { LevelManager } from "../levels/LevelManager.js";
import { stepLevel } from "../engine/stepLevel.js";
import { jump } from "../engine/Physics.js";
import { level5 } from "../levels/Level5.js";
const zone={id:"test-wind",x:0,y:100,width:1500,height:420,direction:1,strength:90,purpose:"test"};
const body=()=>({x:100,y:250,width:32,height:64,grounded:false});
const fixture=(extra={})=>{
    const floor={id:"floor",x:0,y:460,width:1500,height:80};
    return new LevelManager({...level5,spawn:{x:250,feetY:460},worldWidth:1500,
        platforms:[floor],enemies:[],hazards:[],explorationAreas:[],windZones:[zone],finish:{platform:floor,flagInset:40},...extra});
};

test("constant wind integrates smooth acceleration equally at 30/60/120 FPS; ground drag limits exposure",()=>{
    const endpoints=[];
    for(const fps of [30,60,120]) {
        const p=body(),wind=new Wind([zone]);let dx=0,ground=0;
        for(let i=0;i<fps;i++)dx+=wind.update(p,1/fps);
        const expected=90*(1-.18*(1-Math.exp(-1/.18)));
        assert.ok(Math.abs(dx-expected)<1e-6);assert.ok(wind.velocity<90&&wind.velocity>89);
        const grounded=new Wind([zone]);p.grounded=true;
        for(let i=0;i<fps;i++)ground+=grounded.update(p,1/fps);
        assert.ok(Math.abs(ground-dx*.2)<1e-6);endpoints.push(dx);
        const reverse=new Wind([{...zone,direction:-1}]);p.grounded=false;let left=0;
        for(let i=0;i<fps;i++)left+=reverse.update(p,1/fps);
        assert.ok(Math.abs(left+dx)<1e-6);
    }
    assert.ok(Math.max(...endpoints)-Math.min(...endpoints)<1e-6);
});

test("predictable warning/gust/calm cycles, offsets, reset and periodic force are frame independent",()=>{
    const gust={...zone,period:6,warning:.9,duration:2.4,offset:.2},positions=[];
    for(const fps of [30,60,120]) {
        const wind=new Wind([gust]),p=body();assert.equal(wind.state(gust).phase,"warning");
        assert.equal(wind.state(gust,1).phase,"gust");assert.equal(wind.state(gust,4).phase,"calm");
        let dx=0;for(let i=0;i<fps*12;i++)dx+=wind.update(p,1/fps);positions.push(dx);
        assert.ok(Math.abs(wind.time-12)<1e-8);wind.reset();assert.equal(wind.time,0);assert.equal(wind.velocity,0);
    }
    assert.ok(Math.max(...positions)-Math.min(...positions)<.01);
});

test("normal countersteering and jumps remain responsive; closed walls stop wind-driven movement",()=>{
    for(const fps of [30,60,120]) {
        const level=fixture(),p=level.player;stepLevel(level,0,1/fps);jump(p,650);
        for(let i=0;i<fps*.6;i++)assert.equal(stepLevel(level,-1,1/fps).death,null);
        assert.ok(p.x<140,"input overcomes the strongest designed tailwind");
        const walled=fixture({spawn:{x:500,feetY:460},barriers:[{id:"wall",x:550,y:100,width:30,height:360}]}),q=walled.player;
        for(let i=0;i<fps*2;i++) {assert.equal(stepLevel(walled,1,1/fps).death,null);assert.ok(q.x+q.width<=550+1e-7);}
        walled.restart();assert.equal(walled.wind.time,0);assert.equal(walled.wind.velocity,0);
    }
});

test("wind coexists with moving-platform carry and ordinary jump-off; flight is never affected",()=>{
    for(const fps of [30,60,120]) {
        const board={id:"board",type:"moving",axis:"x",x:300,y:360,width:160,height:24,speed:35,distance:120,pause:.4};
        const level=fixture({platforms:[...fixture().platforms,board]}),p=level.player,platform=level.platforms[1];
        p.reset({x:330,feetY:360});p.supportPlatform=platform;
        for(let i=0;i<fps;i++){assert.equal(stepLevel(level,0,1/fps).death,null);assert.equal(p.supportPlatform,platform);assert.equal(p.y+p.height,platform.y);}
        jump(p,650);assert.equal(stepLevel(level,1,1/fps).death,null);assert.equal(p.grounded,false);assert.equal(p.supportPlatform,null);
        const start=p.x;stepLevel(level,1,.1,{flight:{vertical:0,speed:560}});
        assert.ok(Math.abs(p.x-start-56)<1e-6);assert.equal(level.wind.velocity,0);
    }
});

test("wind validation rejects malformed timing, direction, strength, geometry and duplicate IDs",()=>{
    assert.deepEqual(validateWind(level5),[]);
    for(const patch of [{strength:NaN},{strength:121},{direction:0},{period:0},{period:6,warning:.1,duration:2},
        {period:6,warning:1,duration:6},{width:-1},{x:-1},{purpose:""},{period:6,warning:1,duration:2,offset:Infinity}])
        assert.ok(validateWind({...level5,windZones:[{...zone,...patch}]}).length);
    assert.ok(validateWind({...level5,windZones:[zone,zone]}).length);
});


test("wind has a meaningful ridge-jump consequence, with a safe calm alternative at every frame rate",()=>{
    for(const fps of [30,60,120])for(const [time,expected] of [[.9,"l5-ridge-middle"],[4,"l5-windward-cache"]]) {
        // Local takeoff probe: identical normal input from the second cracked
        // slab. The headwind misses the upper reward but reaches the lower bank.
        const l=new LevelManager(level5),p=l.player,board=l.platforms.find(p=>p.config?.id==="l5-crack-east");
        p.reset({x:5630,feetY:305});p.supportPlatform=board;l.wind.time=time;jump(p,650);
        for(let i=0;i<fps*2&&!p.grounded;i++)assert.equal(stepLevel(l,1,1/fps).death,null);
        assert.equal(p.supportPlatform?.id,expected);
    }
});

test("authored observation pads let the player wait through full gust cycles without drifting off",()=>{
    for(const fps of [30,60,120])for(const [x,feetY,id] of [[2220,440,"l5-canyon-west"],[5180,305,"l5-ridge-launch"]]) {
        const l=new LevelManager(level5),p=l.player;p.reset({x,feetY});p.supportPlatform=l.platforms.find(p=>p.id===id);
        for(let i=0;i<fps*14;i++)assert.equal(stepLevel(l,0,1/fps).death,null);
        assert.equal(p.x,x);assert.equal(p.y+p.height,feetY);assert.equal(p.supportPlatform.id,id);
    }
});
