import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { developmentBuild } from "../dev/buildConfig.js";
import { DeveloperModeManager, simulationSteps } from "../dev/DeveloperModeManager.js";
import { locationsFor, safePosition } from "../dev/SafePosition.js";
import { drawDebug, drawDeveloperIndicator } from "../dev/DebugRenderer.js";
import { LevelManager } from "../levels/LevelManager.js";
import { levels } from "../levels/levels.js";
import { CoinManager } from "../levels/CoinManager.js";
import { LevelProgressManager } from "../progress/LevelProgressManager.js";
import { LocalProgressStore } from "../progress/LocalProgressStore.js";
import { cleanSettings } from "../settings/GameSettings.js";
import { GamePauseManager } from "../engine/GamePauseManager.js";
import { followCamera } from "../engine/Camera.js";
import { stepLevel } from "../engine/stepLevel.js";
import { jump } from "../engine/Physics.js";
const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
const fixture=(config=levels[0],available=true)=>{
    const level=new LevelManager(config),dev=new DeveloperModeManager({available,getLevel:()=>level});
    return {level,dev,p:level.player};
};

test("production flag is false; storage and preferences cannot enable developer controls",()=>{
    assert.equal(developmentBuild,false);
    assert.equal(cleanSettings({developmentBuild:true,developer:true,fly:true}).developer,undefined);
    const {level,dev}=fixture(levels[0],false);
    for(const key of ["fly","invincible","hitboxes","speed"])assert.equal(dev.set(key,key==="speed"?2:true),false);
    assert.equal(dev.enable(true),false);assert.equal(dev.teleport("finish"),false);assert.equal(dev.canLoad(4,levels),false);
    dev.markAttempt();assert.equal(level.developerAssisted,false);
    assert.equal(readFileSync(new URL("../index.html",import.meta.url),"utf8").includes('id="adminToolsPanel"'),false);
});

test("fly movement is normalized, gravity-free and frame independent in all levels",()=>{
    for(const config of levels)for(const fps of [30,60,120])for(const [direction,vertical] of [[1,0],[-1,0],[0,1],[0,-1],[1,1]]) {
        const {dev,p,level}=fixture(config);dev.enable(true);dev.set("fly",true);
        p.x=2000;p.y=250;p.velocityY=800;
        const start={x:p.x,y:p.y};const keys=new Set(vertical>0?["KeyS"]:vertical<0?["KeyW"]:[]);
        // A short interior movement avoids deliberate viewport/world clamping.
        for(let i=0;i<fps/4;i++)assert.equal(dev.step(direction,keys,1/fps).death,null);
        const seconds=Math.ceil(fps/4)/fps;
        assert.ok(Math.abs(Math.hypot(p.x-start.x,p.y-start.y)-dev.flightSpeed*seconds)<1e-6);
        assert.equal(p.velocityY,0);assert.equal(p.grounded,false);assert.equal(p.supportPlatform,null);
        assert.equal(level.developerAssisted,true);
    }
});

test("flight crosses terrain and sealed walls, ignores damage and remains within visible bounds",()=>{
    for(const fps of [30,60,120]) {
        const {dev,level,p}=fixture(levels[3]);dev.enable(true);dev.set("fly",true);
        p.x=12600;p.y=200;
        for(let i=0;i<fps;i++)assert.equal(dev.step(1,new Set(),1/fps).death,null);
        assert.ok(p.x>12728);assert.equal(level.puzzle.gates[0].open,false);
        p.x=100;p.y=450;dev.step(0,new Set(["KeyS"]),1/fps);assert.ok(p.y+p.height<540);
        p.y=0;dev.step(0,new Set(["KeyW"]),1/fps);assert.ok(p.y>=69);
        const camera=followCamera(12000,p,level.config.worldWidth,960,1);assert.ok(camera>=0&&camera<=level.config.worldWidth-960);
    }
});

test("turning flight off exits embedded terrain safely and restores normal physics and damage",()=>{
    for(const config of levels)for(const fps of [30,60,120]) {
        const {dev,level,p}=fixture(config);dev.enable(true);dev.set("fly",true);
        p.x=300;p.y=470;assert.equal(dev.set("fly",false),true);
        assert.ok(!level.platforms.some(platform=>overlap(p,platform)));
        assert.equal(p.grounded,true);assert.ok(p.supportPlatform&&!p.supportPlatform.type);
        jump(p,650);const y=p.y;dev.step(0,new Set(),1/fps);assert.ok(p.y<y);assert.notEqual(p.velocityY,0);
        const thorn=config.hazards[0];
        if(thorn){p.x=thorn.x;p.y=thorn.y;p.grounded=false;p.supportPlatform=null;assert.equal(dev.step(0,new Set(),1/fps).death,"thorns");}
        else{const enemy=level.enemies[0];p.reset({x:enemy.x,feetY:enemy.feetY});assert.equal(dev.step(0,new Set(),1/fps).death,"enemy");}
        assert.equal(level.developerAssisted,true);
    }
});

test("invincibility preserves gravity, landings and stomps; enemy/thorn/rock damage resumes when disabled",()=>{
    for(const fps of [30,60,120]) {
        const {dev,level,p}=fixture(levels[3]);dev.enable(true);dev.set("invincible",true);
        const slime=level.enemies[0];p.x=slime.x;p.y=396;p.grounded=false;
        assert.equal(dev.step(0,new Set(),1/fps).death,null);assert.equal(p.y,396);assert.equal(p.grounded,true);
        const thorn=level.config.hazards[0];p.reset({x:thorn.x,feetY:460});
        assert.equal(dev.step(0,new Set(),1/fps).death,null);
        const rock=level.stalactites[0];p.reset({x:rock.x,feetY:460});
        for(let i=0;i<fps*2;i++)assert.equal(dev.step(0,new Set(),1/fps).death,null);
        assert.equal(rock.state,"spent");
        p.reset({x:slime.x,feetY:slime.feetY-slime.height-8});p.velocityY=500;p.grounded=false;
        let stomped=false;for(let i=0;i<10&&!stomped;i++)stomped=dev.step(0,new Set(),1/fps).stomped.length>0;
        assert.equal(stomped,true);assert.ok(p.velocityY<0);
        p.x=level.enemies[1].x;p.y=level.enemies[1].feetY-64;p.grounded=false;p.velocityY=0;
        dev.set("invincible",false);assert.equal(dev.step(0,new Set(),1/fps).death,"enemy");
        dev.set("invincible",true);p.x=900;p.y=550;p.grounded=false;
        assert.equal(dev.step(0,new Set(),1/fps).death,null);assert.ok(p.y<460);assert.equal(p.grounded,true);
    }
});

test("game speed uses bounded physics steps and scales all world timers without changing menu time",()=>{
    for(const fps of [30,60,120])for(const speed of [.5,1,2]) {
        const {dev,level}=fixture(levels[3]);dev.enable(true);dev.set("speed",speed);
        const rock=level.stalactites[0],board=level.platforms.find(p=>p.type==="collapsing");
        rock.state="warning";rock.warningCount=1;board.onLand();
        for(let i=0;i<fps/4;i++)for(const dt of simulationSteps(1/fps,dev.speed))dev.step(0,new Set(),dt);
        const seconds=Math.ceil(fps/4)/fps*speed;
        assert.ok(Math.abs(rock.warningTime-seconds)<1e-7);
        assert.ok(Math.abs(board.warningTime-seconds)<1e-7);
        const ferry=level.platforms.find(p=>p.type==="moving");assert.ok(Math.abs(ferry.elapsed-seconds)<1e-7);
        assert.ok(simulationSteps(1/30,2).every(dt=>dt<=1/120+1e-9));
    }
});

test("every configured teleport has a safe static landing and invalid targets do nothing",()=>{
    for(const config of levels) {
        const {dev,level,p}=fixture(config);dev.enable(true);
        for(const location of locationsFor(config)) {
            assert.equal(dev.teleport(location.id),true,`${config.id}: ${location.id}`);
            assert.equal(p.grounded,true);assert.ok(p.supportPlatform&&!p.supportPlatform.type);
            assert.ok(!level.platforms.some(surface=>overlap(p,surface)));
            assert.ok(!config.hazards.some(h=>overlap(p,h)));
            assert.ok(!level.puzzle.gates.filter(g=>!g.open).some(g=>overlap(p,g)));
            assert.ok(!level.enemies.some(e=>overlap(p,{x:e.x,y:e.feetY-e.height,width:e.width,height:e.height})));
        }
        const before=JSON.stringify(p);assert.equal(dev.teleport("missing"),false);assert.equal(JSON.stringify(p),before);
        assert.equal(dev.canLoad(4,levels),true);assert.equal(dev.canLoad(5,levels),true);assert.equal(dev.canLoad(6,levels),true);assert.equal(dev.canLoad(7,levels),true);assert.equal(dev.canLoad(8,levels),true);assert.equal(dev.canLoad(99,levels),false);
        assert.ok(safePosition(level,{x:850,feetY:460}));
    }
});

test("assisted state sticks until a clean restart; persistence boundary refuses writes and unlocks",()=>{
    const disk=new Map(),storage={getItem:k=>disk.get(k),setItem:(k,v)=>disk.set(k,v)};
    const progress=new LevelProgressManager(new LocalProgressStore(storage));levels.forEach(l=>progress.registerLevel(l));progress.setUser("A");
    progress.completeLevel(1,[levels[0].coins[0].id]);const saved=JSON.stringify([...disk]);
    const {dev,level}=fixture(levels[1]);dev.enable(true);dev.set("invincible",true);dev.set("invincible",false);dev.enable(false);
    assert.equal(level.developerAssisted,true);
    progress.completeLevel(2,levels[1].coins.map(c=>c.id),{developerAssisted:level.developerAssisted});
    assert.equal(JSON.stringify([...disk]),saved);assert.equal(progress.getLevel(3).unlocked,false);
    level.restart();dev.beginAttempt();assert.equal(level.developerAssisted,false);
    progress.completeLevel(2,[],{developerAssisted:level.developerAssisted});assert.equal(progress.getLevel(2).completed,true);
    dev.enable(true);dev.set("fly",true);level.restart();dev.beginAttempt();assert.equal(level.developerAssisted,true);
    dev.set("fly",false);level.restart();dev.beginAttempt({bypass:true});assert.equal(level.developerAssisted,true);
    assert.deepEqual(progress.getLevel(1).coinIds,[levels[0].coins[0].id]);
    dev.resetSession();assert.equal(dev.enabled,false);assert.equal(dev.speed,1);assert.equal(dev.testLevelId,null);
});

test("hitbox drawing uses live world/circle bounds and never mutates simulation or storage",()=>{
    const level=new LevelManager(levels[3]),coins=new CoinManager(level.config.coins),calls=[];
    const ctx=new Proxy({globalAlpha:1},{get:(o,k)=>o[k]??((...a)=>calls.push([k,...a]))});
    level.updatePlatforms(.5);coins.time=.25;const before=JSON.stringify({level,coins});
    drawDebug(ctx,level,coins,10000);drawDeveloperIndicator(ctx,true,true);
    assert.deepEqual(calls.find(c=>c[0]==="translate"),["translate",-10000,0]);
    const moving=level.platforms.find(p=>p.type==="moving");
    assert.ok(calls.some(c=>c[0]==="strokeRect"&&c[1]===moving.x&&c[2]===moving.y));
    assert.ok(calls.some(c=>c[0]==="arc"&&c[1]===coins.coins[0].x&&c[2]===coins.coins[0].centerY(coins.time)&&c[3]===12));
    assert.ok(calls.some(c=>c[0]==="fillText"&&c[1].includes("PROGRESS NOT SAVED")));
    assert.equal(JSON.stringify({level,coins}),before);
});

test("developer panels share pause navigation; production cannot navigate to absent screens",()=>{
    const pause=new GamePauseManager();pause.open();pause.navigate("settings");
    assert.equal(pause.navigate("developer"),false);pause.registerScreens({developer:"settings",admin:"developer"});
    assert.equal(pause.navigate("developer"),true);assert.equal(pause.navigate("admin"),true);
    pause.escape();assert.equal(pause.screen,"developer");pause.escape();assert.equal(pause.screen,"settings");
    pause.escape();assert.equal(pause.screen,"main");pause.escape();assert.equal(pause.paused,false);
});

test("flying to the flag can exercise completion without granting eligibility",()=>{
    for(const config of levels) {
        const {dev,level,p}=fixture(config);dev.enable(true);dev.set("fly",true);
        p.x=level.flagX;p.y=config.finish.platform.y-70;p.grounded=false;
        assert.equal(dev.checkFlyingFinish(),true);assert.equal(level.complete,true);assert.equal(level.developerAssisted,true);
        assert.equal(dev.checkFlyingFinish(),false);
    }
});

test("normal and modified-speed simulations agree on distance while keeping camera-visible flight",()=>{
    for(const fps of [30,60,120])for(const speed of [.5,1,2]) {
        const {dev,p,level}=fixture();dev.enable(true);dev.set("fly",true);dev.set("speed",speed);
        p.x=2000;p.y=200;let camera=1600;
        for(let frame=0;frame<fps;frame++)for(const dt of simulationSteps(1/fps,dev.speed)) {
            dev.step(1,new Set(),dt);camera=followCamera(camera,p,level.config.worldWidth,960,dt);
            assert.ok(p.x>=camera&&p.x+p.width<=camera+960);
        }
        assert.ok(Math.abs(p.x-2000-dev.flightSpeed*speed)<1e-6);
    }
});
