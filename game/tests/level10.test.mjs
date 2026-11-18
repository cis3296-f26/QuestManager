import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
import{level10}from'../levels/Level10.js';import{levels}from'../levels/levels.js';import{LevelManager}from'../levels/LevelManager.js';import{CoinManager}from'../levels/CoinManager.js';import{EmberWarden,sceneForLevel}from'../levels/EmberWarden.js';import{stepLevel}from'../engine/stepLevel.js';import{jump}from'../engine/Physics.js';import{toggleClimb}from'../engine/Climbing.js';import{simulateRoute}from'../levels/design/simulateRoute.js';import{validateLevel}from'../levels/design/validateLevel.js';import{arrangeMusic}from'../audio/MusicScores.js';import{CastleRenderer,drawWarden}from'../rendering/CastleRenderer.js';import{safePosition,locationsFor}from'../dev/SafePosition.js';import{LevelProgressManager}from'../progress/LevelProgressManager.js';import{LocalProgressStore}from'../progress/LocalProgressStore.js';import{adventureSummary,renderAdventureEnding}from'../ui/Endgame.js';
const read=n=>JSON.parse(readFileSync(new URL(`./fixtures/${n}.json`,import.meta.url)));const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');const sid=p=>p?.id??p?.config?.id;
const store=()=>{const disk=new Map();const open=(user='A')=>{const p=new LevelProgressManager(new LocalProgressStore({getItem:k=>disk.get(k),setItem:(k,v)=>disk.set(k,v)}));levels.forEach(l=>p.registerLevel(l));p.setUser(user);return p;};return{disk,open};};
function replay(route,{startFrame=0,level=new LevelManager(level10)}={}){const phases=new Set(),scenes=new Set(),landings=new Set(),climbs=new Set();let previousProgress=0,activations=[];for(let frame=startFrame;frame<route.totalFrames;frame++){
 if(route.interactFrames?.includes(frame)){assert.equal(toggleClimb(level),true);climbs.add(level.player.climbingId);}if(route.jumpFrames.includes(frame))jump(level.player,650);
 const r=stepLevel(level,route.inputs?.find(i=>frame>=i.from&&frame<i.to)?.direction??1,1/route.fps,{climbVertical:route.climbInputs?.find(i=>frame>=i.from&&frame<i.to)?.vertical??0});assert.equal(r.death,null,`frame ${frame}`);scenes.add(sceneForLevel(level));phases.add(level.warden.phaseNumber);landings.add(sid(level.player.supportPlatform));if(level.warden.progress!==previousProgress){activations.push({progress:level.warden.progress,x:level.player.x,support:sid(level.player.supportPlatform)});previousProgress=level.warden.progress;}
 }return{level,phases,scenes,landings,activations,climbs};}
test('Levels 1–9 and their ten original arrangements retain their exact pre-castle data',()=>{const b=read('pre-castle-baseline');for(const old of b.levels)assert.equal(hash(levels.find(l=>l.id===old.id)),old.hash,`Level ${old.id}`);for(const old of b.music)assert.equal(hash(arrangeMusic(old.key)),old.hash,old.key);});
test('final castle is 29000 pixels, five connected regions, 24 encounters and exactly three stable achievement coins',()=>{
 assert.deepEqual(validateLevel(level10).errors,[]);assert.equal(level10.worldWidth,29000);assert.equal(level10.stages.length,5);assert.equal(level10.stages.flatMap(s=>s.beats).length,24);let end=0;for(const s of level10.stages){assert.equal(s.start,end);end=s.end;let b=s.start;for(const beat of s.beats){assert.equal(beat.start,b);b=beat.end;}assert.equal(b,s.end);}assert.equal(end,29000);
 assert.deepEqual(level10.coins.map(c=>c.id),[1,2,3].map(n=>`level-10-coin-${n}`));assert.ok(level10.platforms.find(p=>p.id==='l10-warden-step').x-(level10.platforms.find(p=>p.id==='l10-warden-crown').x+level10.platforms.find(p=>p.id==='l10-warden-crown').width)>200);assert.equal(level10.checkpoints.length,2);assert.equal(level10.explorationAreas.length,3);assert.equal(levels.length,10);assert.ok(level10.platforms.every(p=>!p.surface));
});
test('normal-input complete all/zero coin routes require the three real seals and survive at 30/60/120 FPS',()=>{
 for(const collection of['all','none'])for(const route of read(`level10-${collection==='all'?'routes':'main-routes'}`)){
  const r=simulateRoute(level10,route,{collection,mainRoute:collection==='none'});assert.equal(r.success,true,JSON.stringify(r));assert.equal(r.coinIds.length,collection==='all'?3:0);
  const proof=replay(route);assert.equal(proof.level.warden.defeated,true);assert.deepEqual([...proof.phases],[1,2,3]);assert.ok(proof.scenes.has('castle')&&proof.scenes.has('warden')&&proof.scenes.has('ending'));assert.deepEqual(proof.activations.map(a=>a.support),level10.warden.seals.map(s=>s.platformId));assert.ok(route.interactFrames.length>=3,'castle routes include ordinary ladder interactions');assert.ok(proof.climbs.has('l10-warden-ladder'),'the final seal requires its actual ladder');
  for(const id of['drawbridge','chain-lift','piston-carrier','throne-carrier','cloister-a','suspension-a'])assert.ok(r.visited.includes('l10-'+id));for(const id of['guardhouse-floor','treasury-floor','upper-carrier','highest-tower'])assert.equal(r.visited.includes('l10-'+id),collection==='all');
  assert.equal(r.visited.includes('l10-lower-carrier'),collection==='none');if(collection==='all')for(const a of level10.explorationAreas){assert.ok(r.discovered.includes(a.id));assert.ok(r.exited.includes(a.id));}
 }
});
test('boss physical seals reject future order, airborne contact, wrong supports, flight and early activation',()=>{
 const l=new LevelManager(level10),b=l.warden,p=l.player;
 function contact(i,{air=false,wrong=false,flight=false}={}){const s=b.seals[i];p.reset({x:s.x,feetY:s.y+s.height});p.grounded=!air;p.supportPlatform=wrong?level10.platforms[0]:l.platforms.find(p=>p.id===s.platformId);return b.update(p,{...p},0,{flight,invincible:true});}
 contact(2);assert.equal(b.progress,0);contact(0);assert.equal(b.progress,0);b.phaseTime=3;contact(0,{air:true});contact(0,{wrong:true});contact(0,{flight:true});assert.equal(b.progress,0);contact(0);assert.equal(b.progress,1);b.phaseTime=4;contact(2);assert.equal(b.progress,1);contact(1);assert.equal(b.progress,2);assert.equal(l.complete,false);
});
test('every phase has genuine deadly active zones, safe cooldowns and visible warning intervals at each frame rate',()=>{
 for(const fps of[30,60,120])for(let phase=0;phase<3;phase++){
  const l=new LevelManager(level10),b=l.warden,p=l.player;b.state='active';for(let i=0;i<phase;i++)b.seals[i].active=true;const attack=b.attacks[0],c=attack.config;p.reset({x:c.x+8,feetY:c.y+c.height-2});p.grounded=false;
  attack.time=c.cooldown+.1;assert.equal(b.update(p,{...p},1/fps),false);assert.equal(attack.phase.state,'charging');attack.time=c.cooldown+c.warningDuration+.1;assert.equal(b.update(p,{...p},1/fps),true);assert.equal(b.progress,phase);
  attack.time=c.cooldown+c.warningDuration+c.activeDuration+.01;assert.equal(b.update(p,{...p},1/fps),false);
 }
});
test('exit blocks normal high-speed crossing until three seals and the full shutdown animation; flag alone cannot complete',()=>{
 for(const fps of[30,60,120]){
  const l=new LevelManager(level10),b=l.warden,p=l.player,g=b.config.exitGate;p.reset({x:l.flagX,feetY:450});assert.equal(l.checkCompletion(),false);
  p.reset({x:g.x-150,feetY:450});const previous={...p};p.x=g.x+130;b.update(p,previous,1/fps);assert.ok(p.x+p.width<=g.x);
  for(const s of b.seals)s.active=true;b.state='defeating';b.update(p,{...p},.4);assert.equal(b.defeated,false);assert.equal(b.lock.barriers.length,1);b.update(p,{...p},.4);assert.equal(b.defeated,true);assert.equal(b.lock.barriers.length,0);p.reset({x:l.flagX,feetY:450});assert.equal(l.checkCompletion(),true);
 }
});
test('death recovery retains only attempt checkpoint/assistance; seals, attacks, enemies, gates, coins and machinery reset',()=>{
 const l=new LevelManager(level10),coins=new CoinManager(level10.coins);l.checkpointIndex=1;l.developerAssisted=true;l.warden.state='defeated';l.warden.seals.forEach(s=>s.active=true);l.warden.patterns.flat().forEach(a=>a.time=100);l.updatePlatforms(5);l.enemies[0].defeat();coins.pending.add(level10.coins[0].id);coins.discard();l.respawn();
 assert.equal(l.player.x,26950);assert.equal(l.warden.state,'dormant');assert.equal(l.warden.progress,0);assert.ok(l.warden.patterns.flat().every(a=>a.time===0));assert.ok(l.enemies.every(e=>e.active));assert.ok(l.platforms.filter(p=>p.type).every(p=>p.elapsed===0&&p.state==='stable'));assert.ok(l.puzzle.gates.every(g=>!g.open));assert.equal(coins.pending.size,0);assert.equal(l.developerAssisted,true);l.restart();assert.equal(l.checkpointIndex,-1);assert.equal(l.player.x,80);assert.equal(l.developerAssisted,false);
});
test('treasury cannot be entered from below or through either closed side; the real optional plate opens it',()=>{
 for(const fps of[30,60,120]){const l=new LevelManager(level10),p=l.player;
  for(const x of[13830,14060,14270]){p.reset({x,feetY:470});jump(p,650);for(let f=0;f<fps;f++)stepLevel(l,0,1/fps);assert.ok(p.y>=389);}
  for(const [x,dir]of [[13750,1],[14340,-1]]){p.reset({x,feetY:365});for(let f=0;f<fps*.5;f++){stepLevel(l,dir,1/fps);assert.ok(p.y>=389||p.x+p.width<=13820||p.x>=14300);}}
  p.reset({x:13470,feetY:285});p.supportPlatform=l.platforms.find(p=>p.id==='l10-treasury-seal');stepLevel(l,0,1/fps);assert.ok(l.puzzle.gates.filter(g=>g.id.includes('treasury')).every(g=>g.open));
 }
});
test('ending reads banked account totals only, rejects assisted/unverified perfection, and never unlocks a fictional Level 11',()=>{
 const{open}=store(),p=open();for(const l of levels)p.completeLevel(l.id,l.coins.map(c=>c.id));let s=adventureSummary(p,{eligible:true});assert.equal(s.title,'QUEST COMPLETE!');assert.equal(s.perfect,true);assert.equal(s.completed,10);assert.equal(s.coins,30);assert.equal(p.getLevel(11).unlocked,false);
 assert.equal(adventureSummary(p,{eligible:false}).perfect,false);assert.equal(adventureSummary(p,{eligible:true,assisted:true}).perfect,false);assert.match(adventureSummary(p,{assisted:true}).title,/TEST RUN/);assert.equal(adventureSummary(open('B'),{eligible:true}).perfect,false);
 const nodes=new Map(),doc={getElementById:id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);}};renderAdventureEnding(doc,p,{eligible:true});assert.equal(nodes.get('nextLevel').hidden,true);assert.equal(nodes.get('viewCredits').hidden,false);assert.match(nodes.get('adventureTotals').textContent,/10\/10.*30\/30/);assert.equal(nodes.get('perfectAdventure').hidden,false);
 const q=open('C');for(const l of levels)q.completeLevel(l.id,[]);assert.equal(adventureSummary(q,{eligible:true}).title,'QUEST COMPLETE!');assert.equal(adventureSummary(q,{eligible:true}).perfect,false);
});
test('Level 10 partial/assisted runs never save; completion unions stable IDs across attempts and preserves older accounts',()=>{
 const{open,disk}=store(),p=open();for(const l of levels.slice(0,9))p.completeLevel(l.id,l.coins.map(c=>c.id));assert.equal(p.getLevel(10).unlocked,true);const ids=level10.coins.map(c=>c.id),before=JSON.stringify([...disk]);p.completeLevel(10,ids,{developerAssisted:true});assert.equal(JSON.stringify([...disk]),before);assert.equal(p.getLevel(10).completed,false);p.completeLevel(10,ids.slice(0,2));p.completeLevel(10,[ids[2]]);p.completeLevel(10,[]);assert.equal(open().getLevel(10).fullyCompleted,true);assert.equal(open().totalCoins.earned,30);assert.equal(open('B').totalCoins.earned,0);
});
test('castle regions, guardian core/seals, warning/active geometry and ending vista render without advancing gameplay',()=>{
 const l=new LevelManager(level10),r=new CastleRenderer(),labels=[],rects=[],ctx=new Proxy({globalAlpha:1,measureText:t=>({width:t.length*6}),fillText:t=>labels.push(t),fillRect:(...v)=>rects.push(v)},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 const before=JSON.stringify(l);for(const x of[0,6000,12000,18000,27070,28000]){r.drawBackground(ctx,960,540,x);r.drawDecorations(ctx,level10.scenery,460,x,960);r.drawPlatforms(ctx,l.platforms,x,960);drawWarden(ctx,l,x,960,{reduceMotion:true,bodyOnly:true});drawWarden(ctx,l,x,960,{reduceMotion:true});}assert.equal(JSON.stringify(l),before);l.warden.state='active';drawWarden(ctx,l,27070,960,{reduceMotion:true});assert.ok(labels.includes('SEAL 1'));const a=l.warden.attacks[0];a.time=1.3;drawWarden(ctx,l,27070,960,{reduceMotion:true});assert.ok(rects.some(v=>v.join()===[a.config.x,a.config.y,a.config.width,a.config.height].join()));
 for(const destination of locationsFor(level10))assert.ok(safePosition(l,destination.target),destination.id);for(const key of['castle','warden','ending'])assert.ok(arrangeMusic(key).notes.length>80);
});
test('the furnace chain lift boards at several phases, carries the player and reaches its higher locked gallery',()=>{
 for(const fps of[30,60,120])for(const phase of[0,1.7,4.1]){
  const l=new LevelManager({...level10,spawn:{x:12230,feetY:410}}),p=l.player,lift=l.platforms.find(p=>sid(p)==='l10-chain-lift');
  for(let i=0;i<fps*phase;i++)assert.equal(stepLevel(l,0,1/fps).death,null);let launched=false,boarded=false;
  for(let f=0;f<fps*15&&!boarded;f++){if(!launched&&lift.y>400){jump(p,650);launched=true;}assert.equal(stepLevel(l,launched&&p.x<lift.x+95?1:0,1/fps).death,null);boarded=p.supportPlatform===lift;}
  assert.ok(boarded);for(let f=0;f<fps*8&&!(lift.y<=320&&p.x>=lift.x+95);f++)assert.equal(stepLevel(l,p.x<lift.x+95?1:0,1/fps).death,null);
  jump(p,650);for(let f=0;f<fps*2&&!p.grounded;f++)assert.equal(stepLevel(l,1,1/fps).death,null);assert.equal(sid(p.supportPlatform),'l10-furnace-gallery');assert.ok(l.puzzle.gates.find(g=>g.id==='l10-furnace-gate').open===false,'the lift itself does not bypass the gallery gate');
 }
});
test('the final seal cannot be reached by skipping its ladder from either central platform',()=>{
 for(const fps of[30,60,120])for(const id of['l10-warden-step','l10-warden-gallery']){
  const l=new LevelManager(level10),p=l.player,start=l.platforms.find(p=>p.id===id);p.reset({x:start.x-p.width+1,feetY:start.y});p.supportPlatform=start;jump(p,650);let reached=false;
  for(let f=0;f<fps*1.2;f++){stepLevel(l,-1,1/fps,{invincible:true});if(sid(p.supportPlatform)==='l10-warden-crown')reached=true;}assert.equal(reached,false);
 }
});
