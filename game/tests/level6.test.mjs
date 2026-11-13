import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { levels } from "../levels/levels.js";
import { level6 } from "../levels/Level6.js";
import { LevelManager } from "../levels/LevelManager.js";
import { CoinManager } from "../levels/CoinManager.js";
import { LevelProgressManager } from "../progress/LevelProgressManager.js";
import { LocalProgressStore } from "../progress/LocalProgressStore.js";
import { stepLevel } from "../engine/stepLevel.js";
import { jump } from "../engine/Physics.js";
import { validateLevel } from "../levels/design/validateLevel.js";
import { simulateRoute } from "../levels/design/simulateRoute.js";
import { arrangeMusic } from "../audio/MusicScores.js";
import { TempleRenderer } from "../rendering/TempleRenderer.js";
import { drawSunPulses } from "../rendering/SunPulseRenderer.js";
import { drawCaveMechanics } from "../rendering/CaveMechanicsRenderer.js";
import { drawEnemy } from "../rendering/EnemyRenderer.js";
import { safePosition, locationsFor } from "../dev/SafePosition.js";
const read=name=>JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`,import.meta.url)));
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const id=p=>p?.id??p?.config?.id;
const advance=(l,fps,condition,direction,seconds=15)=>{
 for(let f=0;f<fps*seconds&&!condition();f++)assert.equal(stepLevel(l,direction(),1/fps).death,null);
 assert.ok(condition(),'bounded normal-input waypoint must be reachable');
};

test('Levels 1–5 and their six earlier music arrangements retain the exact pre-temple baseline',()=>{
 const baseline=read('pre-temple-baseline');
 for(const saved of baseline.levels)assert.equal(hash(levels.find(l=>l.id===saved.id)),saved.hash,`Level ${saved.id}`);
 for(const saved of baseline.music)assert.equal(hash(arrangeMusic(saved.key)),saved.hash,saved.key);
});

test('Lost Sun Temple is 23500px with five regions, eighteen connected beats and exactly three stable coins',()=>{
 assert.equal(level6.worldWidth,23500);assert.equal(level6.theme,'temple');assert.deepEqual(validateLevel(level6).errors,[]);
 assert.deepEqual(level6.stages.map(s=>[s.start,s.end]),[[0,4000],[4000,9000],[9000,14000],[14000,19000],[19000,23500]]);
 assert.equal(level6.stages.flatMap(s=>s.beats).length,18);
 for(const stage of level6.stages){let end=stage.start;for(const b of stage.beats){assert.equal(b.start,end);assert.ok(b.title&&b.end>b.start);end=b.end;}assert.equal(end,stage.end);}
 assert.deepEqual(level6.coins.map(c=>c.id),[1,2,3].map(n=>`level-6-coin-${n}`));
 assert.equal(level6.explorationAreas.length,5);assert.equal(level6.sunPulseTraps.length,9);
 assert.ok(level6.sunPulseTraps.every(t=>t.warningDuration>=1&&t.cooldown>=3.2));
 let run=null,max=0;for(const p of level6.platforms.filter(p=>p.terrain).sort((a,b)=>a.x-b.x)){
  if(run&&run.end===p.x&&run.y===p.y)run.end=p.x+p.width;else run={start:p.x,end:p.x+p.width,y:p.y};max=Math.max(max,run.end-run.start);
 }assert.ok(max<=700,`longest unbroken terrace: ${max}`);
 assert.equal(levels.some(l=>l.id===8),false);
});

test('continuous full-input traces finish with all coins or zero coins at 30/60/120 FPS',()=>{
 for(const collection of ['all','none']){
  const routes=read(`level6-${collection==='all'?'routes':'main-routes'}`);assert.deepEqual(routes.map(r=>r.fps),[30,60,120]);
  for(const route of routes){const result=simulateRoute(level6,route,{collection,mainRoute:collection==='none'});
   assert.equal(result.success,true,JSON.stringify(result));assert.equal(result.coinIds.length,collection==='all'?3:0);
   for(const platform of ['l6-stone-lift','l6-cracked-west','l6-cracked-east','l6-cistern-ferry'])assert.ok(result.visited.includes(platform));
   if(collection==='all')for(const platform of ['l6-statue-balcony','l6-seal-balcony','l6-treasury-floor','l6-sun-crown'])assert.ok(result.visited.includes(platform));
   else {assert.equal(result.discovered.length,0);assert.ok(!result.visited.includes('l6-treasury-floor'));}
   const l=new LevelManager(level6),c=new CoinManager(level6.coins),jumps=new Set(route.jumpFrames);
   let entered=false;for(let f=0;f<route.totalFrames;f++){
    if(jumps.has(f))jump(l.player,650);stepLevel(l,route.inputs?.find(i=>f>=i.from&&f<i.to)?.direction??1,1/route.fps);c.update(l.player,1/route.fps);
    if(c.pending.has('level-6-coin-2')){assert.equal(l.puzzle.switches[0].active,true);assert.ok(l.puzzle.gates.every(g=>g.open));entered=true;}
   }assert.equal(entered,collection==='all');assert.equal(l.puzzle.activationCount,collection==='all'?1:0);
  }
 }
});

test('Sun Seal is an upper-floor plate that latches both matching doors until reset',()=>{
 for(const fps of [30,60,120]){
  const l=new LevelManager(level6),p=l.player,s=l.puzzle.switches[0];
  p.reset({x:s.x+5,feetY:450});stepLevel(l,0,1/fps);assert.equal(s.active,false,'standing beneath it is not activation');
  p.reset({x:s.x+5,feetY:285});stepLevel(l,0,1/fps);assert.equal(s.active,true);assert.ok(l.puzzle.gates.every(g=>g.open));
  p.reset({x:17300,feetY:420});for(let f=0;f<fps*15;f++)stepLevel(l,0,1/fps);
  assert.equal(l.puzzle.activationCount,1);assert.ok(l.puzzle.gates.every(g=>g.open),'not a duplicate timed cave dash');
  l.restart();assert.equal(s.active,false);assert.ok(l.puzzle.gates.every(g=>!g.open));
 }
});

test('locked treasury blocks entry from either side, roof and lower jump-through route',()=>{
 for(const fps of [30,60,120])for(const [x,feetY,direction,velocity] of [[16620,365,1,0],[17100,365,-1,0],[16880,460,0,-650],[16880,160,0,250]]){
  const l=new LevelManager(level6),p=l.player,c=new CoinManager(level6.coins);p.reset({x,feetY});p.grounded=false;p.velocityY=velocity;
  for(let f=0;f<fps*1.3;f++){const r=stepLevel(l,direction,1/fps);c.update(p,1/fps);if(r.death)break;}
  assert.equal(c.pending.has('level-6-coin-2'),false);assert.equal(l.puzzle.activationCount,0);
 }
});

test('treasury doors permit safe outward exit from inside, never inward bypass',()=>{
 for(const fps of [30,60,120])for(const west of [true,false]){
  const l=new LevelManager(level6),p=l.player,g=l.puzzle.gates[west?0:1];p.reset({x:west?g.x+g.width+2:g.x-p.width-2,feetY:365});
  stepLevel(l,west?-1:1,1/fps);assert.equal(g.open,true);
  for(let f=0;f<fps*.3;f++)stepLevel(l,west?-1:1,1/fps);assert.equal(l.puzzle.activationCount,0);
 }
});

test('cistern ferry boards at several phases, carries through reversal and exits a real pit',()=>{
 for(const fps of [30,60,120])for(const phase of [0,1.7,4.1]){
  const l=new LevelManager({...level6,spawn:{x:17500,feetY:420}}),p=l.player,ferry=l.platforms.find(p=>id(p)==='l6-cistern-ferry');
  for(let f=0;f<fps*phase;f++)stepLevel(l,0,1/fps);let launched=false;
  advance(l,fps,()=>p.supportPlatform===ferry,()=>{if(!launched&&ferry.x<17680){jump(p,650);launched=true;}return launched&&p.x<ferry.x+65?1:0;});
  const offset=p.x-ferry.x;for(let f=0;f<fps*9;f++){assert.equal(stepLevel(l,0,1/fps).death,null);assert.equal(p.supportPlatform,ferry);assert.ok(Math.abs(p.x-ferry.x-offset)<1e-6);}
  advance(l,fps,()=>ferry.x>17900&&p.x-ferry.x>=100,()=>p.x-ferry.x<100?1:0);jump(p,650);
  advance(l,fps,()=>p.grounded,()=>1,2);assert.equal(id(p.supportPlatform),'l6-cistern-east');
 }
});

test('stone lift is required for its higher gallery and supports waiting, boarding and jumping off',()=>{
 for(const fps of [30,60,120])for(const phase of [0,1.5,4.2]){
  const l=new LevelManager({...level6,spawn:{x:5120,feetY:460}}),p=l.player,lift=l.platforms.find(p=>id(p)==='l6-stone-lift');
  // This local arrival fixture uses the safe right edge beyond the guardian patrol.
  for(let f=0;f<fps*phase;f++)assert.equal(stepLevel(l,0,1/fps).death,null);let launched=false;
  advance(l,fps,()=>p.supportPlatform===lift,()=>{if(!launched&&lift.y>390){jump(p,650);launched=true;}return launched&&p.x<5320?1:0;});
  advance(l,fps,()=>lift.y<=320&&p.x>=5320,()=>p.x<5320?1:0);jump(p,650);
  advance(l,fps,()=>p.grounded,()=>1,2);assert.equal(id(p.supportPlatform),'l6-high-gallery');
 }
});

test('cracked bridge warns over the open chasm, allows escape, collapses and resets',()=>{
 for(const fps of [30,60,120]){
  const l=new LevelManager(level6),p=l.player,board=l.platforms.find(p=>id(p)==='l6-cracked-west');
  p.reset({x:board.x+board.width-40,feetY:board.y});p.supportPlatform=board;board.onLand();
  for(let f=0;f<fps;f++)assert.equal(stepLevel(l,0,1/fps).death,null);assert.equal(board.state,'warning');
  jump(p,650);advance(l,fps,()=>p.grounded,()=>1,2);assert.equal(id(p.supportPlatform),'l6-cracked-east');
  for(let f=0;f<fps*2;f++)board.update(1/fps);assert.equal(board.solid,false);l.restart();assert.equal(board.state,'stable');
 }
});

test('guardians reuse stomp, side damage, patrol limits and defeat reset; outdoor scorpions remain lethal',()=>{
 for(const fps of [30,60,120])for(const def of level6.enemies){
  const l=new LevelManager(level6),p=l.player,e=l.enemies.find(e=>e.startX===def.startX);
  for(let f=0;f<fps*5;f++){e.update(1/fps);assert.ok(e.x>=e.minX&&e.x<=e.maxX);}
  p.reset({x:e.x,feetY:e.feetY});assert.equal(stepLevel(l,0,1/fps).death,'enemy');l.restart();
  p.reset({x:e.x,feetY:e.feetY-e.height-2});p.grounded=false;p.velocityY=500;const r=stepLevel(l,0,1/fps);
  if(def.stompable){assert.equal(r.death,null);assert.equal(r.stomped.length,1);assert.ok(p.velocityY<0);assert.equal(e.active,false);}
  else assert.equal(r.death,'enemy');
  l.restart();assert.equal(e.active,true);assert.equal(e.x,def.startX);assert.equal(e.walkTime,0);
 }
});

test('active sun damage follows the shared death path; assisted modes ignore damage but still advance traps',()=>{
 for(const fps of [30,60,120])for(const mode of [{},{invincible:true},{flight:{vertical:0,speed:420}}]){
  const l=new LevelManager(level6),p=l.player,t=l.sunPulses[0];t.time=4.9;p.reset({x:t.config.x,feetY:460});
  assert.equal(stepLevel(l,0,1/fps,mode).death,mode.invincible||mode.flight?null:'sun-pulse');assert.ok(t.time>4.9);
  l.restart();assert.ok(l.sunPulses.every(t=>t.time===0&&t.state==='cooldown'));
 }
});

test('sixth-level completion unions coins, unlocks seven and preserves older accounts/achievements',()=>{
 const disk=new Map(),storage={getItem:k=>disk.get(k),setItem:(k,v)=>disk.set(k,v)};
 const open=(user='A')=>{const p=new LevelProgressManager(new LocalProgressStore(storage));levels.forEach(l=>p.registerLevel(l));p.setUser(user);return p;};
 const p=open();for(const l of levels.slice(0,5))p.completeLevel(l.id,l.coins.map(c=>c.id));const earlier=levels.slice(0,5).map(l=>p.getLevel(l.id));
 const c=new CoinManager(level6.coins),ids=level6.coins.map(c=>c.id);c.pending.add(ids[0]);assert.equal(open().getLevel(6).coinIds.length,0);c.discard();assert.equal(open().getLevel(6).coinIds.length,0);
 p.completeLevel(6,ids.slice(0,2));assert.deepEqual(open().getLevel(6).coinIds,ids.slice(0,2));p.completeLevel(6,[ids[2]]);p.completeLevel(6,[]);
 assert.equal(open().getLevel(6).fullyCompleted,true);assert.equal(open().getLevel(7).unlocked,true);assert.equal(levels.some(l=>l.id===8),false);
 assert.deepEqual(levels.slice(0,5).map(l=>open().getLevel(l.id)),earlier);assert.deepEqual(open('B').getLevel(6).coinIds,[]);
 const clean=open("C"),before=JSON.stringify([...disk]);clean.completeLevel(6,ids,{developerAssisted:true});assert.equal(JSON.stringify([...disk]),before);assert.equal(clean.getLevel(6).completed,false);
});

test('temple regions, guardian art and reduced-motion pulse warnings render without mutating simulation',()=>{
 const l=new LevelManager(level6),labels=[],colors=[],renderer=new TempleRenderer();
 const ctx=new Proxy({globalAlpha:1,measureText:t=>({width:t.length*6}),fillText:t=>labels.push(t)},
 {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>{if(k==='fillStyle')colors.push(v);o[k]=v;return true;}});
 const before=JSON.stringify(l);
 for(const camera of [0,4800,10000,16000,19400]){renderer.drawBackground(ctx,960,540,camera);renderer.drawDecorations(ctx,level6.scenery,460,camera,960);renderer.drawMasonry(ctx,l.platforms,camera,960);}
 l.enemies.forEach(e=>drawEnemy(ctx,e,0,23500));drawCaveMechanics(ctx,l,16000,960,{reduceMotion:true});assert.equal(JSON.stringify(l),before);
 for(const time of [0,4.2,4.9]){l.sunPulses[0].time=time;drawSunPulses(ctx,l.sunPulses,10000,960,{reduceMotion:true});}
 assert.ok(labels.includes('DARK · SAFE'));assert.ok(labels.some(t=>t.startsWith('CHARGING')));assert.ok(labels.includes('PULSE'));
 for(const color of ['#dfcba1','#756754','#47423e','#b8d9df'])assert.ok(colors.includes(color));
 for(const location of locationsFor(level6)){const landing=safePosition(l,location.target);assert.ok(landing);const box={x:landing.x,y:landing.feetY-64,width:32,height:64};assert.ok(!level6.sunPulseTraps.some(t=>box.x<t.x+t.width&&box.x+32>t.x&&box.y<t.y+t.height&&box.y+64>t.y));}
 assert.equal(arrangeMusic('temple').score.title,'The Sun Beneath the Stone');
});
