import test from 'node:test';import assert from 'node:assert/strict';
import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
import{levels}from'../levels/levels.js';import{level9}from'../levels/Level9.js';
import{LevelManager}from'../levels/LevelManager.js';import{CoinManager}from'../levels/CoinManager.js';
import{LevelProgressManager}from'../progress/LevelProgressManager.js';import{LocalProgressStore}from'../progress/LocalProgressStore.js';
import{stepLevel}from'../engine/stepLevel.js';import{jump}from'../engine/Physics.js';
import{validateLevel}from'../levels/design/validateLevel.js';import{simulateRoute}from'../levels/design/simulateRoute.js';
import{arrangeMusic}from'../audio/MusicScores.js';import{VolcanoRenderer,drawVolcanoHazards,drawCheckpoints}from'../rendering/VolcanoRenderer.js';
import{drawInteractivePlatforms}from'../rendering/PlatformRenderer.js';import{drawEnemy}from'../rendering/EnemyRenderer.js';
import{drawCaveMechanics}from'../rendering/CaveMechanicsRenderer.js';import{safePosition,locationsFor}from'../dev/SafePosition.js';
const read=name=>JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`,import.meta.url)));
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');const id=p=>p?.id??p?.config?.id;
function advance(l,fps,condition,input,seconds=18){for(let f=0;f<fps*seconds&&!condition();f++)assert.equal(stepLevel(l,input(),1/fps).death,null);assert.ok(condition(),'normal-control waypoint must be reachable');}

test('all eight earlier level configurations and nine prior scores retain their exact pre-volcano hashes',()=>{
 const b=read('pre-volcano-baseline');for(const old of b.levels)assert.equal(hash(levels.find(l=>l.id===old.id)),old.hash,`Level ${old.id}`);for(const old of b.music)assert.equal(hash(arrangeMusic(old.key)),old.hash,old.key);
});
test('Inferno’s Edge defines 27000 pixels, five regions, twenty-two encounters, meaningful checkpoints and three stable coins',()=>{
 assert.deepEqual(validateLevel(level9).errors,[]);assert.equal(level9.worldWidth,27000);assert.equal(level9.stages.flatMap(s=>s.beats).length,22);
 assert.deepEqual(level9.stages.map(s=>[s.start,s.end]),[[0,5000],[5000,10500],[10500,16000],[16000,22000],[22000,27000]]);
 for(const s of level9.stages){let end=s.start;for(const b of s.beats){assert.equal(b.start,end);assert.ok(b.end>b.start&&b.title);end=b.end;}assert.equal(end,s.end);}
 assert.deepEqual(level9.coins.map(c=>c.id),[1,2,3].map(n=>`level-9-coin-${n}`));assert.equal(level9.explorationAreas.length,3);assert.equal(level9.lavaGeysers.length,6);assert.equal(level9.checkpoints.length,2);
 assert.equal(level9.enemies.length,5);assert.ok(level9.platforms.every(p=>!p.surface));assert.equal(levels.some(l=>l.id===10),false);
 assert.ok(level9.hazards.some(h=>h.type==='lava'));assert.ok(level9.platforms.some((p,i,a)=>p.terrain&&i&&p.x>a[i-1].x+a[i-1].width&&!level9.hazards.some(h=>h.x<p.x&&h.x+h.width>a[i-1].x+a[i-1].width)),'dry ravines remain; lava does not fill every gap');
});
test('continuous spawn-to-flag all/zero-coin proofs survive live lava, six vents, creatures and transfers at all frame rates',()=>{
 for(const collection of['all','none'])for(const route of read(`level9-${collection==='all'?'routes':'main-routes'}`)){
  const r=simulateRoute(level9,route,{collection,mainRoute:collection==='none'});assert.equal(r.success,true,JSON.stringify(r));assert.equal(r.coinIds.length,collection==='all'?3:0);
  for(const p of['river-ferry','gallery-lift','causeway-a','causeway-b','fracture-a','fracture-b','castle-lift','last-ferry'])assert.ok(r.visited.includes('l9-'+p),p);
  for(const p of['hollow-floor','vault-floor','crown-crack','crown'])assert.equal(r.visited.includes('l9-'+p),collection==='all',p);
  assert.equal(r.visited.includes('l9-crown-ferry'),collection==='none','Crown is the deliberately challenging alternate crossing');
  if(collection==='all')for(const area of level9.explorationAreas){assert.ok(r.discovered.includes(area.id));assert.ok(r.exited.includes(area.id));}else assert.deepEqual(r.discovered,[]);
 }
});
test('the first authored vent punishes an active crossing and permits the same ordinary jump after recovery',()=>{
 for(const fps of[30,60,120])for(const active of[true,false]){
  const l=new LevelManager({...level9,spawn:{x:5880,feetY:400}}),g=l.geysers[0];g.time=active?3.3:4.8;jump(l.player,650);let death=null;
  for(let f=0;f<fps*1.1&&!death&&!l.player.grounded;f++)death=stepLevel(l,1,1/fps).death;
  if(active)assert.equal(death,'eruption');else{assert.equal(death,null);assert.equal(id(l.player.supportPlatform),'l9-vent-east');}
 }
});
test('paired vents have distinct phases, no simultaneous eruption and a full safe waiting island',()=>{
 const l=new LevelManager(level9),a=l.geysers[3],b=l.geysers[4];let staggered=false;
 for(let f=0;f<120*30;f++){a.time=b.time=f/120;assert.equal(a.state==='eruption'&&b.state==='eruption',false);staggered ||= a.state!==b.state;}
 assert.equal(staggered,true);const island=level9.platforms.find(p=>p.id==='l9-pair-island');assert.ok(island.width>=300);
 assert.ok(a.config.x+a.config.width<island.x);assert.ok(b.config.x>island.x+island.width);
});
test('the vault’s solid floor, ceiling and closed doors protect Coin 2; Crown gold is above all lower-route jumps',()=>{
 for(const fps of[30,60,120])for(const[x,y,coin]of[[13740,470,1],[13530,470,1],[13420,335,1],[13940,470,1],[20170,430,2],[20200,430,2]])for(const dir of[-1,0,1]){
  const l=new LevelManager({...level9,spawn:{x,feetY:y}}),c=new CoinManager(level9.coins);jump(l.player,650);
  for(let f=0;f<fps*2;f++){const r=stepLevel(l,dir,1/fps);c.update(l.player,1/fps);if(r.death||l.player.grounded)break;}assert.equal(c.pending.has(level9.coins[coin].id),false);
 }
 const roof=level9.barriers[0];assert.equal(roof.y,105);assert.ok(roof.height>=99,'roof cannot be used as an unintended high jumping ledge');
});
test('main river ferries board, carry through reversals and exit from multiple arrival phases',()=>{
 for(const fps of[30,60,120])for(const phase of[0,1.7,4.1])for(const[name,x,y,dest]of[['river-ferry',6770,390,'ferry-east'],['last-ferry',25210,410,'last-river-east']]){
  const l=new LevelManager({...level9,spawn:{x,feetY:y}}),p=l.player,f=l.platforms.find(p=>id(p)==='l9-'+name);
  for(let i=0;i<fps*phase;i++)stepLevel(l,0,1/fps);let launched=false;
  advance(l,fps,()=>p.supportPlatform===f,()=>{if(!launched&&f.x<f.config.x+60){jump(p,650);launched=true;}return launched&&p.x<f.x+55?1:0;});
  const offset=p.x-f.x;for(let i=0;i<fps*10;i++){assert.equal(stepLevel(l,0,1/fps).death,null);assert.equal(p.supportPlatform,f);assert.ok(Math.abs(p.x-f.x-offset)<1e-6);}
  advance(l,fps,()=>f.x>f.config.x+230&&p.x-f.x>=100,()=>p.x-f.x<100?1:0);jump(p,650);advance(l,fps,()=>p.grounded,()=>1,2);assert.equal(id(p.supportPlatform),'l9-'+dest);
 }
});
test('Crown’s lower ferry can be boarded and exited after observing its live vent at varied arrival phases',()=>{
 for(const fps of[30,60,120])for(const phase of[0,1.7,4.1]){
  const l=new LevelManager({...level9,spawn:{x:19650,feetY:440}}),p=l.player,f=l.platforms.find(p=>id(p)==='l9-crown-ferry'),g=l.geysers[5];
  for(let i=0;i<fps*phase;i++)assert.equal(stepLevel(l,0,1/fps).death,null);let launched=false;
  const quiet=()=>g.state==='dormant'?g.phase.remaining+g.config.warningDuration:g.state==='cooldown'?g.phase.remaining+g.config.warningDuration:g.state==='recovery'?g.phase.remaining+g.config.cooldown+g.config.warningDuration:g.state==='warning'?g.phase.remaining:0;
  advance(l,fps,()=>p.supportPlatform===f,()=>{if(!launched&&f.x<19870&&quiet()>3.4){jump(p,650);launched=true;}return launched&&p.x<f.x+55?1:0;},30);
  advance(l,fps,()=>f.x>19930&&p.x-f.x>=80,()=>p.x-f.x<80?1:0);jump(p,650);advance(l,fps,()=>p.grounded,()=>1,2);assert.equal(id(p.supportPlatform),'l9-crown-return');
 }
});
test('gallery and castle lifts board at different times and reach genuinely higher destinations',()=>{
 for(const fps of[30,60,120])for(const phase of[0,1.7,4.1])for(const[name,x,y,dest]of[['gallery-lift',11270,410,'ember-gallery'],['castle-lift',23590,380,'castle-gallery']]){
  const l=new LevelManager({...level9,spawn:{x,feetY:y}}),p=l.player,lift=l.platforms.find(p=>id(p)==='l9-'+name);
  for(let i=0;i<fps*phase;i++)stepLevel(l,0,1/fps);let launched=false;
  advance(l,fps,()=>p.supportPlatform===lift,()=>{if(!launched&&lift.y>395){jump(p,650);launched=true;}return launched&&p.x<lift.x+95?1:0;});
  advance(l,fps,()=>lift.y<=320&&p.x>=lift.x+95,()=>p.x<lift.x+95?1:0);jump(p,650);advance(l,fps,()=>p.grounded,()=>1,2);assert.equal(id(p.supportPlatform),'l9-'+dest);
 }
});
test('fractured causeway warns, allows escape, drops an idle rider into real lava and resets on respawn',()=>{
 for(const fps of[30,60,120]){
  const l=new LevelManager(level9),p=l.player,b=l.platforms.find(p=>id(p)==='l9-causeway-a');p.reset({x:b.x+65,feetY:b.y});p.supportPlatform=b;b.onLand();
  for(let f=0;f<fps;f++)assert.equal(stepLevel(l,0,1/fps).death,null);assert.equal(b.state,'warning');jump(p,650);advance(l,fps,()=>p.grounded,()=>1,2);assert.equal(id(p.supportPlatform),'l9-causeway-b');
  l.restart();p.reset({x:b.x+40,feetY:b.y});p.supportPlatform=b;b.onLand();let death=null;for(let f=0;f<fps*3&&!death;f++)death=stepLevel(l,0,1/fps).death;assert.equal(death,'lava');
  l.respawn();assert.ok(l.platforms.filter(p=>p.type).every(p=>p.elapsed===0&&p.state==='stable'));
 }
});
test('magma slimes retain stomp/bounce; fire bats reject stomps and all patrols reset',()=>{
 for(const fps of[30,60,120])for(const def of level9.enemies){const l=new LevelManager(level9),e=l.enemies.find(e=>e.startX===def.startX),p=l.player;
  for(let f=0;f<fps*6;f++){e.update(1/fps);assert.ok(e.x>=e.minX&&e.x<=e.maxX);}p.reset({x:e.x,feetY:e.feetY-e.height-2});p.velocityY=500;p.grounded=false;const r=stepLevel(l,0,1/fps);
  if(def.stompable){assert.equal(r.death,null);assert.equal(r.stomped.length,1);assert.ok(p.velocityY<0);}else assert.equal(r.death,'enemy');l.restart();assert.equal(e.x,e.startX);assert.equal(e.active,true);
  const envelope={x:def.minX,y:def.feetY-def.height,width:def.maxX-def.minX+def.width,height:def.height};assert.ok(level9.lavaGeysers.every(g=>envelope.x+envelope.width<=g.x||envelope.x>=g.x+g.width));
 }
});
test('completed attempts union three coins, preserve earlier accounts and unlock unavailable ten without checkpoint banking',()=>{
 const disk=new Map(),storage={getItem:k=>disk.get(k),setItem:(k,v)=>disk.set(k,v)};const open=(user='A')=>{const p=new LevelProgressManager(new LocalProgressStore(storage));levels.forEach(l=>p.registerLevel(l));p.setUser(user);return p;};
 const p=open();for(const l of levels.slice(0,8))p.completeLevel(l.id,l.coins.map(c=>c.id));assert.equal(p.getLevel(9).unlocked,true);const old=levels.slice(0,8).map(l=>p.getLevel(l.id)),ids=level9.coins.map(c=>c.id),c=new CoinManager(level9.coins);
 c.pending.add(ids[0]);c.discard();assert.deepEqual(open().getLevel(9).coinIds,[]);p.completeLevel(9,ids.slice(0,2));p.completeLevel(9,[ids[2]]);p.completeLevel(9,[]);assert.equal(open().getLevel(9).fullyCompleted,true);assert.equal(open().getLevel(10).unlocked,true);assert.equal(levels.some(l=>l.id===10),false);assert.deepEqual(open().totalCoins,{earned:27,possible:30});
 assert.deepEqual(levels.slice(0,8).map(l=>open().getLevel(l.id)),old);assert.deepEqual(open('B').getLevel(9).coinIds,[]);const clean=open('C'),before=JSON.stringify([...disk]);clean.completeLevel(9,ids,{developerAssisted:true});assert.equal(JSON.stringify([...disk]),before);assert.equal(clean.getLevel(9).completed,false);
});
test('five volcanic regions, exact damage artwork, reduced-motion warnings and refuges render without changing gameplay',()=>{
 const l=new LevelManager(level9),renderer=new VolcanoRenderer(),labels=[],rects=[],colors=[];const ctx=new Proxy({globalAlpha:1,fillText:t=>labels.push(t),fillRect:(...v)=>rects.push(v)},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>{if(k==='fillStyle')colors.push(v);o[k]=v;return true;}});
 const before=JSON.stringify(l);for(const x of[0,5500,11000,17000,24000]){renderer.drawBackground(ctx,960,540,x);renderer.drawDecorations(ctx,level9.scenery,460,x,960);renderer.drawPlatforms(ctx,l.platforms,x,960);drawVolcanoHazards(ctx,l,x,960,{poolsOnly:true,reduceMotion:true});drawVolcanoHazards(ctx,l,x,960,{reduceMotion:true});drawInteractivePlatforms(ctx,l.platforms,x,960,{reduceMotion:true});drawCaveMechanics(ctx,l,x,960,{reduceMotion:true});drawCheckpoints(ctx,l,x,960);}
 l.enemies.forEach(e=>drawEnemy(ctx,e,0,27000));assert.equal(JSON.stringify(l),before);assert.ok(colors.includes('#4f4558'),'castle is visible');
 const g=l.geysers[0];g.time=2.4;drawVolcanoHazards(ctx,l,5500,960,{reduceMotion:true});assert.ok(labels.includes('!'));assert.ok(labels.some(t=>/^[0-9.]+s$/.test(t)));
 g.time=3.4;drawVolcanoHazards(ctx,l,5500,960,{reduceMotion:true});assert.ok(rects.some(r=>r.join() === [g.config.x,g.config.y,g.config.width,g.config.height].join()),'eruption art fills exactly its damage column');
 for(const location of locationsFor(level9))assert.ok(safePosition(l,location.target),location.id);const m=arrangeMusic('volcano');assert.equal(m.score.title,'Embers Before the Gate');assert.notDeepEqual(m.notes,arrangeMusic('mountain').notes);
});
