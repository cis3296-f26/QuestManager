import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {levels} from "../levels/levels.js";
import {validatePlatformPurpose} from "../levels/design/validatePlatformPurpose.js";
import {validateLevel} from "../levels/design/validateLevel.js";
import {LevelManager} from "../levels/LevelManager.js";
import {applyGravity, moveHorizontally} from "../engine/Physics.js";
import {Player} from "../entities/Player.js";
import {jump} from "../engine/Physics.js";
import {stepLevel} from "../engine/stepLevel.js";
import {simulateRoute} from "../levels/design/simulateRoute.js";

test("every special platform declares and obeys its level's route connection",()=>{
    assert.equal(levels.flatMap(l=>l.platforms).filter(p=>p.type).length,11);
    for(const config of levels)assert.deepEqual(validatePlatformPurpose(config),[]);
});

test("placement checks reject a lift to a lower route, pointless horizontal motion and safe-floor collapse",()=>{
    const lower=structuredClone(levels[1]);
    const lift=lower.platforms.find(p=>p.id==="grove-lift");
    lift.connection.to="l2-canopy-ground";
    assert.ok(validateLevel(lower).errors.some(e=>/higher destination/.test(e)));
    const flat=structuredClone(levels[1]);
    const ferry=flat.platforms.find(p=>p.id==="grove-intro-ferry");ferry.connection.to="l2-intro-east";
    assert.ok(validateLevel(flat).errors.some(e=>/separated landing/.test(e)));
    const safe=structuredClone(levels[2]);
    safe.platforms.push({id:"invisible-safe-floor",x:11300,y:460,width:140,height:80,role:"test"});
    assert.ok(validatePlatformPurpose(safe).some(e=>/Collapsing platform.*pit, enemy or hazard/.test(e)));
    safe.platforms.find(p=>p.id==="l3-nest-crumble").connection.to="missing";
    assert.ok(validatePlatformPurpose(safe).some(e=>/valid connection endpoints/.test(e)));
});

test("the screenshot crossing is horizontal; the actual canopy lift reaches a higher shelf",()=>{
    const l=levels[1],ferry=l.platforms.find(p=>p.id==="grove-intro-ferry"),lift=l.platforms.find(p=>p.id==="grove-lift");
    assert.equal(ferry.x,2890);assert.equal(ferry.axis,"x");
    assert.equal(lift.x,4910);assert.equal(lift.axis,"y");
    const from=l.platforms.find(p=>p.id===lift.connection.from),to=l.platforms.find(p=>p.id===lift.connection.to);
    assert.ok(to.y<from.y);assert.equal(lift.y+lift.distance,to.y);
});

test("all-coin runs use the relocated lift to reach the higher canopy at each frame rate",()=>{
    const routes=JSON.parse(readFileSync(new URL("./fixtures/level2-routes.json",import.meta.url)));
    for(const route of routes){
        const result=simulateRoute(levels[1],route);assert.equal(result.success,true);
        assert.ok(result.visited.includes("grove-lift"),`${route.fps} FPS lift must have a purpose`);
    }
});


test("the canopy's airborne exit cannot be reached directly without its horizontal transfer",()=>{
    const config=levels[1];
    for(const fps of [30,60,120]) {
        const without=new LevelManager({...config,platforms:config.platforms.filter(p=>p.id!=="grove-canopy-bough")});
        const player=without.player;player.reset({x:5570,feetY:260});jump(player,650);
        for(let i=0;i<fps*2&&!player.grounded;i++)assert.equal(stepLevel(without,1,1/fps).death,null);
        assert.equal(player.supportPlatform?.id,"l2-canopy-ground", "direct leap must drop to the lower route, not reach the air exit");
    }
});


test("ordinary ledges cannot replace a horizontal platform's intended airborne transfer",()=>{
    for(const config of levels) for(const ferry of config.platforms.filter(p=>p.type==="moving"&&p.axis==="x")) {
        const from=config.platforms.find(p=>p.id===ferry.connection.from),to=config.platforms.find(p=>p.id===ferry.connection.to);
        const surfaces=config.platforms.filter(p=>p.type!=="moving");
        for(const fps of [30,60,120]) {
            // Give the attempted bypass the most favorable takeoff: even a one-pixel overhang.
            const player=new Player({x:from.x+from.width-1,feetY:from.y});jump(player,650);
            for(let frame=0;frame<fps*2&&!player.grounded&&player.y<540;frame++) {
                moveHorizontally(player,1,280,config.worldWidth,1/fps);applyGravity(player,1800,surfaces,1/fps);
            }
            assert.notEqual(player.supportPlatform?.id,to.id,`${ferry.id}: static route must not duplicate transfer at ${fps} FPS`);
        }
    }
});

test("the intro ferry has a clear bank, open river and isolated far-bank landing",()=>{
    const l=levels[1],dock=l.platforms.find(p=>p.id==="l2-lift-approach"),boat=l.platforms.find(p=>p.id==="grove-intro-ferry");
    assert.equal(dock.x+dock.width,2790);assert.equal(boat.x-(dock.x+dock.width),100);
    assert.equal(l.platforms.some(p=>!p.type&&p.x<3280&&p.x+p.width>2820),false,"no ordinary stepping stones or floor inside the river");
    assert.equal(l.platforms.some(p=>p.id==="l2-intro-bypass-exit"),false);
});
