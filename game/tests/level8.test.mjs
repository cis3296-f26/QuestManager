import test from 'node:test';
import assert from 'node:assert/strict';
import{readFileSync}from'node:fs';
import{createHash}from'node:crypto';
import{levels}from'../levels/levels.js';
import{level8}from'../levels/Level8.js';
import{LevelManager}from'../levels/LevelManager.js';
import{CoinManager}from'../levels/CoinManager.js';
import{LevelProgressManager}from'../progress/LevelProgressManager.js';
import{LocalProgressStore}from'../progress/LocalProgressStore.js';
import{stepLevel}from'../engine/stepLevel.js';
import{jump}from'../engine/Physics.js';
import{validateLevel}from'../levels/design/validateLevel.js';
import{simulateRoute}from'../levels/design/simulateRoute.js';
import{arrangeMusic}from'../audio/MusicScores.js';
import{MountainRenderer,drawClimbables}from'../rendering/MountainRenderer.js';
import{drawInteractivePlatforms}from'../rendering/PlatformRenderer.js';
import{drawCaveMechanics}from'../rendering/CaveMechanicsRenderer.js';
import{drawEnemy}from'../rendering/EnemyRenderer.js';
import{safePosition,locationsFor}from'../dev/SafePosition.js';
const read=name=>JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`,import.meta.url)));
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const id=p=>p?.id??p?.config?.id;
const advance=(l,fps,condition,input,seconds=15)=>{for(let f=0;f<fps*seconds&&!condition();f++)assert.equal(stepLevel(l,input(),1/fps).death,null);assert.ok(condition(),'normal-input waypoint must be reachable');};

test('Levels 1–7 and all eight previous music arrangements retain their exact baseline',()=>{
 const b=read('pre-mountain-baseline');for(const old of b.levels)assert.equal(hash(levels.find(l=>l.id===old.id)),old.hash,`Level ${old.id}`);
 for(const old of b.music)assert.equal(hash(arrangeMusic(old.key)),old.hash,old.key);
});
test('Skyward Ascent has 24000 authored pixels, five areas, nineteen encounters and three stable optional rewards',()=>{
 assert.deepEqual(validateLevel(level8).errors,[]);assert.equal(level8.worldWidth,24000);
 assert.deepEqual(level8.stages.map(s=>[s.start,s.end]),[[0,4500],[4500,9500],[9500,14500],[14500,20000],[20000,24000]]);
 assert.equal(level8.stages.flatMap(s=>s.beats).length,19);
 for(const s of level8.stages){let end=s.start;for(const b of s.beats){assert.equal(b.start,end);assert.ok(b.end>b.start&&b.title);end=b.end;}assert.equal(end,s.end);}
 assert.deepEqual(level8.coins.map(c=>c.id),[1,2,3].map(n=>`level-8-coin-${n}`));assert.equal(level8.explorationAreas.length,3);
 assert.equal(level8.climbables.length,5);assert.equal(level8.stalactites.length,3);assert.ok(level8.stalactites.every(r=>r.appearance==='rock'&&r.warningDuration>=.9));
 assert.equal(level8.windZones,undefined);assert.ok(level8.platforms.every(p=>!p.surface),'mountain terrain does not opt into ice physics');assert.equal(levels.some(l=>l.id===9),false);
});
test('full all-coin and zero-coin normal-input routes use climbing and all required transfers at 30/60/120 FPS',()=>{
 for(const collection of['all','none'])for(const route of read(`level8-${collection==='all'?'routes':'main-routes'}`)){
  assert.ok(route.interactFrames.length>=3);assert.ok(route.climbInputs.some(i=>i.vertical===-1));
  const r=simulateRoute(level8,route,{collection,mainRoute:collection==='none'});assert.equal(r.success,true,JSON.stringify(r));assert.equal(r.coinIds.length,collection==='all'?3:0);
  for(const surface of['ladder-top','wall-shelf','ravine-ferry','cargo-lift','crack-west','crack-east','summit-lift','last-rope-top','sky-ferry'])assert.ok(r.visited.includes('l8-'+surface),surface);
  for(const surface of['shelter','old-gallery','perch-bridge','eagle-perch'])assert.equal(r.visited.includes('l8-'+surface),collection==='all');
  if(collection==='all')for(const area of level8.explorationAreas){assert.ok(r.discovered.includes(area.id));assert.ok(r.exited.includes(area.id));}
  else assert.deepEqual(r.discovered,[]);
  assert.equal(simulateRoute(level8,{...route,interactFrames:[],climbInputs:[]},{collection}).success,false,'climbing input cannot be omitted from these proofs');
 }
});
test('solid shelter, upper gallery and perch coins cannot be sniped by ordinary jumps from below',()=>{
 for(const fps of[30,60,120])for(const[x,y,coin]of[[2590,450,0],[11900,450,1],[12030,450,1],[18130,460,2],[18240,460,2]])for(const dir of[-1,0,1]){
  const l=new LevelManager({...level8,spawn:{x,feetY:y}}),c=new CoinManager(level8.coins);jump(l.player,650);
  for(let f=0;f<fps;f++){const r=stepLevel(l,dir,1/fps);c.update(l.player,1/fps);if(r.death||l.player.grounded)break;}
  assert.equal(c.pending.has(level8.coins[coin].id),false);
 }
});
test('ravine ferry boards and carries through reversals at different arrival phases, then exits safely',()=>{
 for(const fps of[30,60,120])for(const phase of[0,1.7,4.1]){
  const l=new LevelManager({...level8,spawn:{x:7590,feetY:350}}),p=l.player,ferry=l.platforms.find(p=>id(p)==='l8-ravine-ferry');
  for(let f=0;f<fps*phase;f++)stepLevel(l,0,1/fps);let launched=false;
  advance(l,fps,()=>p.supportPlatform===ferry,()=>{if(!launched&&ferry.x<7800){jump(p,650);launched=true;}return launched&&p.x<ferry.x+55?1:0;});
  const offset=p.x-ferry.x;for(let f=0;f<fps*10;f++){assert.equal(stepLevel(l,0,1/fps).death,null);assert.equal(p.supportPlatform,ferry);assert.ok(Math.abs(p.x-ferry.x-offset)<1e-6);}
  advance(l,fps,()=>ferry.x>7960&&p.x-ferry.x>=100,()=>p.x-ferry.x<100?1:0);jump(p,650);advance(l,fps,()=>p.grounded,()=>1,2);assert.equal(id(p.supportPlatform),'l8-ferry-east');
 }
});
test('cargo lifts reach genuinely higher paths and board/exit at varied phases',()=>{
 for(const fps of[30,60,120])for(const phase of[0,1.7,4.1])for(const[name,spawnX,feetY,exit]of[['cargo-lift',10730,350,'cargo-gallery'],['summit-lift',20700,400,'summit-gallery']]){
  const l=new LevelManager({...level8,spawn:{x:spawnX,feetY}}),p=l.player,lift=l.platforms.find(p=>id(p)==='l8-'+name);
  for(let f=0;f<fps*phase;f++)stepLevel(l,0,1/fps);let launched=false;
  advance(l,fps,()=>p.supportPlatform===lift,()=>{if(!launched&&lift.y>390){jump(p,650);launched=true;}return launched&&p.x<lift.x+95?1:0;});
  advance(l,fps,()=>lift.y<=320&&p.x>=lift.x+95,()=>p.x<lift.x+95?1:0);jump(p,650);advance(l,fps,()=>p.grounded,()=>1,2);assert.equal(id(p.supportPlatform),'l8-'+exit);
 }
});
test('collapsing bridges warn over real clefts, lose collision and reset their whole attempt state',()=>{
 for(const fps of[30,60,120]){
  const l=new LevelManager(level8),p=l.player,board=l.platforms.find(p=>id(p)==='l8-crack-west');p.reset({x:board.x+40,feetY:board.y});p.supportPlatform=board;board.onLand();
  for(let f=0;f<fps;f++)assert.equal(stepLevel(l,0,1/fps).death,null);assert.equal(board.state,'warning');
  let fall=false;for(let f=0;f<fps*2;f++)if(stepLevel(l,0,1/fps).death==='fall'){fall=true;break;}
  assert.equal(board.solid,false);assert.equal(fall,true);l.restart();assert.ok(l.platforms.filter(p=>p.type).every(p=>p.elapsed===0&&p.state==='stable'));assert.equal(p.climbingId,null);
 }
});
test('rockfall can be baited from an observation bank, crosses once and resets on replay',()=>{
 for(const fps of[30,60,120]){
  const l=new LevelManager({...level8,spawn:{x:13060,feetY:370}}),r=l.stalactites[0];
  assert.equal(stepLevel(l,0,1/fps).death,null);assert.equal(r.state,'warning');
  for(let f=0;f<fps*3;f++)assert.equal(stepLevel(l,0,1/fps).death,null);assert.equal(r.state,'spent');assert.equal(r.impactCount,1);
  jump(l.player,650);advance(l,fps,()=>l.player.grounded,()=>1,2);assert.equal(id(l.player.supportPlatform),'l8-rockfall-court');
  l.restart();assert.equal(r.state,'hanging');assert.equal(r.warningTime,0);assert.equal(r.impactCount,0);
 }
});
test('goats and eagles have bounded lethal patrols, reject stomps and reset without new AI',()=>{
 for(const fps of[30,60,120])for(const def of level8.enemies){
  const l=new LevelManager(level8),e=l.enemies.find(e=>e.startX===def.startX),p=l.player;
  for(let f=0;f<fps*6;f++){e.update(1/fps);assert.ok(e.x>=e.minX&&e.x<=e.maxX);}
  p.reset({x:e.x,feetY:e.feetY-e.height-2});p.grounded=false;p.velocityY=500;assert.equal(stepLevel(l,0,1/fps).death,'enemy');
  l.restart();assert.equal(e.x,e.startX);assert.equal(e.active,true);assert.equal(e.walkTime,0);
 }
});
test('completion-only coin unions unlock nine without implementing it, isolate accounts and preserve older saves',()=>{
 const disk=new Map(),storage={getItem:k=>disk.get(k),setItem:(k,v)=>disk.set(k,v)};
 const open=(user='A')=>{const p=new LevelProgressManager(new LocalProgressStore(storage));levels.forEach(l=>p.registerLevel(l));p.setUser(user);return p;};
 const p=open();for(const l of levels.slice(0,7))p.completeLevel(l.id,l.coins.map(c=>c.id));assert.equal(p.getLevel(8).unlocked,true);const old=levels.slice(0,7).map(l=>p.getLevel(l.id));
 const c=new CoinManager(level8.coins),ids=level8.coins.map(c=>c.id);c.pending.add(ids[0]);assert.equal(open().getLevel(8).coinIds.length,0);c.discard();assert.equal(open().getLevel(8).coinIds.length,0);
 p.completeLevel(8,ids.slice(0,2));p.completeLevel(8,[ids[2]]);p.completeLevel(8,[]);assert.equal(open().getLevel(8).fullyCompleted,true);assert.equal(open().getLevel(9).unlocked,true);assert.equal(levels.some(l=>l.id===9),false);
 assert.deepEqual(levels.slice(0,7).map(l=>open().getLevel(l.id)),old);assert.deepEqual(open('B').getLevel(8).coinIds,[]);assert.deepEqual(open().totalCoins,{earned:24,possible:30});
 const clean=open('C'),before=JSON.stringify([...disk]);clean.completeLevel(8,ids,{developerAssisted:true});assert.equal(JSON.stringify([...disk]),before);assert.equal(clean.getLevel(8).completed,false);
});
test('mountain regions, climbing structures, bridge warnings, wildlife and original score render without state changes',()=>{
 const l=new LevelManager(level8),renderer=new MountainRenderer(),colors=[],labels=[];
 const ctx=new Proxy({globalAlpha:1,fillText:t=>labels.push(t)},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>{if(k==='fillStyle')colors.push(v);o[k]=v;return true;}});
 const before=JSON.stringify(l);for(const x of[0,4800,10000,15000,22000]){renderer.drawBackground(ctx,960,540,x);renderer.drawDecorations(ctx,level8.scenery,460,x,960);renderer.drawPlatforms(ctx,l.platforms,x,960);drawClimbables(ctx,l,x,960,{reduceMotion:true});drawInteractivePlatforms(ctx,l.platforms,x,960,{reduceMotion:true});drawCaveMechanics(ctx,l,x,960,{reduceMotion:true});}
 l.enemies.forEach(e=>drawEnemy(ctx,e,0,24000));assert.equal(JSON.stringify(l),before);assert.ok(colors.includes('#69636d'),'summit foreshadows a distant volcano');
 for(const location of locationsFor(level8))assert.ok(safePosition(l,location.target),location.id);
 const m=arrangeMusic('mountain');assert.equal(m.score.title,'The Skyward Trail');assert.notDeepEqual(m.notes,arrangeMusic('frozen').notes);
});
