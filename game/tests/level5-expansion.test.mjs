import test from "node:test";
import assert from "node:assert/strict";
import {level5} from "../levels/Level5.js";
import {LevelManager} from "../levels/LevelManager.js";
import {stepLevel} from "../engine/stepLevel.js";
import {jump} from "../engine/Physics.js";
const id=p=>p?.id??p?.config?.id;
const support=(l,name)=>l.platforms.find(p=>id(p)===name);
function advance(l,fps,condition,direction,seconds=14) {
    for(let i=0;i<fps*seconds&&!condition();i++)assert.equal(stepLevel(l,direction(),1/fps).death,null);
    assert.ok(condition(),"normal-input waypoint must be reachable within its bounded wait");
}

test("22,000px expands into eighteen distinct encounter beats without long empty flat strips",()=>{
    assert.equal(level5.worldWidth,22000);
    assert.deepEqual(level5.stages.map(s=>[s.start,s.end]),[[0,4000],[4000,9000],[9000,13200],[13200,18200],[18200,22000]]);
    assert.equal(level5.stages.flatMap(s=>s.beats).length,18);
    for(const s of level5.stages) {
        let end=s.start;
        for(const beat of s.beats){assert.equal(beat.start,end);assert.ok(beat.end>beat.start&&beat.title);end=beat.end;}
        assert.equal(end,s.end);
        assert.ok(s.platforms.filter(p=>p.terrain).length>=7);
    }
    const banks=level5.platforms.filter(p=>p.terrain).sort((a,b)=>a.x-b.x);
    let run=null,max=0;
    for(const p of banks) {
        if(run&&run.end===p.x&&run.y===p.y)run.end=p.x+p.width;
        else run={start:p.x,end:p.x+p.width,y:p.y};
        max=Math.max(max,run.end-run.start);
    }
    assert.ok(max<=700,`longest uninterrupted flat terrain is ${max}px`);
    assert.equal(level5.enemies.length,8);assert.equal(level5.windZones.length,8);
    assert.deepEqual(level5.coins.map(c=>c.x),[2720,11350,15930]);
});

test("canyon ferry boards at different arrival phases, carries through reversal, and exits under live wind",()=>{
    for(const fps of [30,60,120])for(const phase of [0,1.7,4.1]) {
        const l=new LevelManager({...level5,spawn:{x:7060,feetY:365}}),p=l.player,ferry=support(l,"l5-canyon-ferry");
        for(let i=0;i<fps*phase;i++)assert.equal(stepLevel(l,0,1/fps).death,null);
        let launched=false;
        advance(l,fps,()=>p.supportPlatform===ferry,()=>{
            if(!launched&&ferry.x<7200){jump(p,650);launched=true;}
            return launched?1:0;
        });
        for(let i=0;i<fps*8;i++){assert.equal(stepLevel(l,0,1/fps).death,null);assert.equal(p.supportPlatform,ferry);assert.equal(p.y+p.height,ferry.y);}
        advance(l,fps,()=>ferry.x>7340&&p.x-ferry.x>=105,()=>p.x-ferry.x<105?1:0);
        jump(p,650);advance(l,fps,()=>p.grounded,()=>1,2);
        assert.equal(id(p.supportPlatform),"l5-wind-landing");
    }
});

test("a normal dock jump cannot replace the ferry across its real 460px canyon",()=>{
    for(const fps of [30,60,120]) {
        const l=new LevelManager({...level5,spawn:{x:7060,feetY:365},platforms:level5.platforms.filter(p=>p.id!=="l5-canyon-ferry")}),p=l.player;
        // Negative control only. Successful continuous course proofs retain every platform and hazard.
        stepLevel(l,0,1/fps);jump(p,650);let death=null;
        for(let i=0;i<fps*3&&!death;i++)death=stepLevel(l,1,1/fps).death;
        assert.equal(death,"fall");assert.notEqual(id(p.supportPlatform),"l5-wind-landing");
    }
});

test("the palm lift reaches a genuinely higher overlook and safely reconnects at multiple phases",()=>{
    for(const fps of [30,60,120])for(const phase of [0,1.5,4.2]) {
        const l=new LevelManager({...level5,spawn:{x:10010,feetY:420}}),p=l.player,lift=support(l,"l5-palm-lift");
        for(let i=0;i<fps*phase;i++)assert.equal(stepLevel(l,0,1/fps).death,null);
        let launched=false;
        advance(l,fps,()=>p.supportPlatform===lift,()=>{
            if(!launched&&lift.y>=360){jump(p,650);launched=true;}
            return launched&&p.x<10118?1:0;
        });
        advance(l,fps,()=>lift.y<=300&&p.x>=10118,()=>p.x<10118?1:0);
        jump(p,650);advance(l,fps,()=>p.grounded,()=>1,2);
        assert.equal(id(p.supportPlatform),"l5-palm-crown");
        advance(l,fps,()=>p.grounded&&id(p.supportPlatform)==="l5-oasis-west",()=>1,3);
        assert.equal(l.exploration.exited.has("l5-palm-crown-route"),true);
    }
});

test("the mandatory broken span offers time to recover and jump near the end of its warning",()=>{
    for(const fps of [30,60,120]) {
        const l=new LevelManager(level5),p=l.player,board=support(l,"l5-bridge-crack-a");
        p.reset({x:board.x+board.width-40,feetY:board.y});p.supportPlatform=board;board.onLand();
        for(let i=0;i<fps*1.2;i++)assert.equal(stepLevel(l,0,1/fps).death,null);
        assert.equal(board.state,"warning");jump(p,650);advance(l,fps,()=>p.grounded,()=>1,2);
        assert.equal(id(p.supportPlatform),"l5-bridge-crack-b");
        for(let i=0;i<fps*.5;i++)assert.equal(stepLevel(l,0,1/fps).death,null);
        jump(p,650);advance(l,fps,()=>p.grounded,()=>1,2);
        assert.equal(id(p.supportPlatform),"l5-bridge-east");
        l.restart();assert.ok(l.platforms.filter(p=>p.type==="collapsing").every(p=>p.state==="stable"));
    }
});
