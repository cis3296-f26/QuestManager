import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {levels} from '../levels/levels.js';
import {level7} from '../levels/Level7.js';
import {LevelManager} from '../levels/LevelManager.js';
import {CoinManager} from '../levels/CoinManager.js';
import {LevelProgressManager} from '../progress/LevelProgressManager.js';
import {LocalProgressStore} from '../progress/LocalProgressStore.js';
import {stepLevel} from '../engine/stepLevel.js';
import {jump} from '../engine/Physics.js';
import {validateLevel} from '../levels/design/validateLevel.js';
import {simulateRoute} from '../levels/design/simulateRoute.js';
import {arrangeMusic} from '../audio/MusicScores.js';
import {FrozenRenderer} from '../rendering/FrozenRenderer.js';
import {drawInteractivePlatforms} from '../rendering/PlatformRenderer.js';
import {drawCaveMechanics} from '../rendering/CaveMechanicsRenderer.js';
import {drawEnemy} from '../rendering/EnemyRenderer.js';
import {safePosition,locationsFor} from '../dev/SafePosition.js';
const read=name=>JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`,import.meta.url)));
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const id=p=>p?.id??p?.config?.id;
function advance(l,fps,condition,direction,seconds=15){
 for(let f=0;f<fps*seconds&&!condition();f++)assert.equal(stepLevel(l,direction(),1/fps).death,null);
 assert.ok(condition(),'bounded normal-input waypoint must be reachable');
}

test('Levels 1–6 and all seven existing musical arrangements retain their exact pre-frozen baseline',()=>{
 const b=read('pre-frozen-baseline');for(const saved of b.levels)assert.equal(hash(levels.find(l=>l.id===saved.id)),saved.hash,`Level ${saved.id}`);
 for(const saved of b.music)assert.equal(hash(arrangeMusic(saved.key)),saved.hash,saved.key);
});

test('Frozen Peaks spans 23500px across five regions and eighteen purposeful beats, with stable three-coin IDs',()=>{
 assert.deepEqual(validateLevel(level7).errors,[]);assert.equal(level7.worldWidth,23500);assert.equal(level7.name,'Frozen Peaks');
 assert.deepEqual(level7.stages.map(s=>[s.start,s.end]),[[0,4000],[4000,9000],[9000,14000],[14000,19000],[19000,23500]]);
 assert.equal(level7.stages.flatMap(s=>s.beats).length,18);
 for(const s of level7.stages){let end=s.start;for(const b of s.beats){assert.equal(b.start,end);assert.ok(b.end>b.start&&b.title);end=b.end;}assert.equal(end,s.end);}
 assert.deepEqual(level7.coins.map(c=>c.id),[1,2,3].map(n=>`level-7-coin-${n}`));assert.equal(level7.explorationAreas.length,4);
 assert.equal(level7.stalactites.length,3);assert.ok(level7.stalactites.every(s=>s.appearance==='icicle'&&s.warningDuration>=.9));
 assert.equal(level7.windZones,undefined,'blizzard atmosphere does not copy desert wind mechanics');
 assert.ok(level7.platforms.some(p=>p.surface?.type==='ice'));assert.ok(level7.platforms.some(p=>p.appearance==='snow'&&!p.surface));
 assert.equal(level7.platforms.filter(p=>p.type==='collapsing').length,3);assert.equal(levels.some(l=>l.id===8),false);
});

test('the introductory ice is enclosed by level snow catch areas, before any enemy or gap challenge',()=>{
 const p=level7.platforms,ice=p.find(p=>p.id==='l7-practice-ice'),left=p.find(p=>p.id==='l7-arrival'),right=p.find(p=>p.id==='l7-practice-catch');
 assert.equal(left.x+left.width,ice.x);assert.equal(ice.x+ice.width,right.x);assert.equal(left.y,ice.y);assert.equal(right.y,ice.y);
 assert.ok(right.width>280**2/(2*ice.surface.friction)+64);assert.ok(level7.enemies.every(e=>e.minX>right.x+right.width));
});

test('full normal-input zero-coin and all-coin routes survive live ice, patrols, icicles, movers and bridges at every frame rate',()=>{
 for(const collection of ['all','none']){
  const routes=read(`level7-${collection==='all'?'routes':'main-routes'}`);assert.deepEqual(routes.map(r=>r.fps),[30,60,120]);
  for(const route of routes){const r=simulateRoute(level7,route,{collection,mainRoute:collection==='none'});assert.equal(r.success,true,JSON.stringify(r));
   assert.equal(r.coinIds.length,collection==='all'?3:0);
   for(const surface of ['l7-practice-ice','l7-lake-ferry','l7-bridge-crack-west','l7-bridge-crack-east','l7-glacier-lift'])assert.ok(r.visited.includes(surface),`${route.fps}: ${surface}`);
   for(const surface of ['l7-hollow-ice','l7-chamber-ice','l7-ridge-crack','l7-blizzard-crown'])assert.equal(r.visited.includes(surface),collection==='all',surface);
   if(collection==='none')assert.equal(r.discovered.length,0);
  }
 }
});

test('low main-route jumps cannot snipe chamber or crown gold without the optional high route',()=>{
 for(const fps of [30,60,120])for(const [x,feetY,coin]of[[11790,400,'level-7-coin-2'],[11810,400,'level-7-coin-2'],[11980,450,'level-7-coin-2'],[17140,440,'level-7-coin-3'],[17200,440,'level-7-coin-3']])for(const direction of[-1,0,1]){
  const l=new LevelManager({...level7,spawn:{x,feetY}}),c=new CoinManager(level7.coins);stepLevel(l,0,1/fps);jump(l.player,650);
  for(let f=0;f<fps*1.5;f++){const r=stepLevel(l,direction,1/fps);c.update(l.player,1/fps);if(r.death||l.player.grounded)break;}
  assert.equal(c.pending.has(coin),false);
 }
});

test('ferry ice allows boarding at different phases, coasting to rest, riding reversals and jumping to snow',()=>{
 for(const fps of[30,60,120])for(const phase of[0,1.7,4.1]){
  const l=new LevelManager({...level7,spawn:{x:6150,feetY:380}}),p=l.player,ferry=l.platforms.find(p=>id(p)==='l7-lake-ferry');
  for(let f=0;f<fps*phase;f++)stepLevel(l,0,1/fps);let launched=false;
  advance(l,fps,()=>p.supportPlatform===ferry,()=>{if(!launched&&ferry.x<6350){jump(p,650);launched=true;}return launched&&p.x<ferry.x+55?1:0;});
  for(let f=0;f<fps;f++)assert.equal(stepLevel(l,0,1/fps).death,null);
  assert.equal(p.velocityX,0);const offset=p.x-ferry.x;
  for(let f=0;f<fps*10;f++){assert.equal(stepLevel(l,0,1/fps).death,null);assert.equal(p.supportPlatform,ferry);assert.ok(Math.abs(p.x-ferry.x-offset)<1e-6);}
  advance(l,fps,()=>ferry.x>6540&&p.x-ferry.x>=90,()=>p.x-ferry.x<90?1:0);jump(p,650);
  advance(l,fps,()=>p.grounded,()=>1,2);assert.equal(id(p.supportPlatform),'l7-ferry-east');
 }
});

test('overlook lift boards, carries and exits to a genuinely higher snow shelf at several arrival times',()=>{
 for(const fps of[30,60,120])for(const phase of[0,1.5,4.2]){
  const l=new LevelManager({...level7,spawn:{x:20585,feetY:390}}),p=l.player,lift=l.platforms.find(p=>id(p)==='l7-glacier-lift');
  for(let f=0;f<fps*phase;f++)stepLevel(l,0,1/fps);let launched=false;
  advance(l,fps,()=>p.supportPlatform===lift,()=>{if(!launched&&lift.y>380){jump(p,650);launched=true;}return launched&&p.x<20835?1:0;});
  advance(l,fps,()=>lift.y<=320&&p.x>=20835,()=>p.x<20835?1:0);jump(p,650);advance(l,fps,()=>p.grounded,()=>1,2);
  assert.equal(id(p.supportPlatform),'l7-high-shelf');assert.equal(p.iceAirborne,false);
 }
});

test('cracked ice bridges warn over real pits, allow late escape and restore all movement/timers on restart',()=>{
 for(const fps of[30,60,120]){
  const l=new LevelManager(level7),p=l.player,board=l.platforms.find(p=>id(p)==='l7-bridge-crack-west');
  p.reset({x:board.x+65,feetY:board.y});p.supportPlatform=board;board.onLand();
  for(let f=0;f<fps;f++)assert.equal(stepLevel(l,0,1/fps).death,null);assert.equal(board.state,'warning');jump(p,650);
  advance(l,fps,()=>p.grounded,()=>1,2);assert.equal(id(p.supportPlatform),'l7-bridge-crack-east');
  for(let f=0;f<fps*2;f++)board.update(1/fps);assert.equal(board.solid,false);
  p.velocityX=220;p.iceAirborne=true;l.restart();assert.equal(p.velocityX,0);assert.equal(p.iceAirborne,false);
  assert.ok(l.platforms.filter(p=>p.type).every(p=>p.state==='stable'&&p.elapsed===0));assert.ok(l.stalactites.every(r=>r.state==='hanging'));
 }
});

test('the first icicle has a visible warning, can catch a blind runner, and can be safely baited from snow',()=>{
 for(const fps of[30,60,120]){
  const rushing=new LevelManager({...level7,spawn:{x:10010,feetY:400}});let jumped=false,death=null;
  for(let f=0;f<fps*4&&!death;f++){
   if(!jumped&&rushing.player.x>=10045){jump(rushing.player,650);jumped=true;}
   death=stepLevel(rushing,1,1/fps).death;
  }assert.equal(death,'stalactite');assert.equal(rushing.stalactites[0].warningCount,1);
  const l=new LevelManager({...level7,spawn:{x:10060,feetY:400}}),rock=l.stalactites[0];
  assert.equal(stepLevel(l,0,1/fps).death,null);assert.equal(rock.state,'warning');
  for(let f=0;f<fps*3;f++)assert.equal(stepLevel(l,0,1/fps).death,null);
  assert.equal(rock.state,'spent');jump(l.player,650);advance(l,fps,()=>l.player.grounded,()=>1,2);
  assert.equal(id(l.player.supportPlatform),'l7-icicle-floor');l.restart();assert.equal(rock.state,'hanging');assert.equal(rock.warningTime,0);
 }
});

test('frost slimes are stompable; snow owls keep distinct non-stompable flying patrols and reset',()=>{
 for(const fps of[30,60,120])for(const def of level7.enemies){
  const l=new LevelManager(level7),p=l.player,e=l.enemies.find(e=>e.startX===def.startX);
  for(let f=0;f<fps*6;f++){e.update(1/fps);assert.ok(e.x>=e.minX&&e.x<=e.maxX);}
  p.reset({x:e.x,feetY:e.feetY});p.grounded=false;assert.equal(stepLevel(l,0,1/fps).death,'enemy');l.restart();
  p.reset({x:e.x,feetY:e.feetY-e.height-2});p.velocityY=500;p.grounded=false;const result=stepLevel(l,0,1/fps);
  if(def.stompable){assert.equal(result.death,null);assert.equal(result.stomped.length,1);assert.ok(p.velocityY<0);}else assert.equal(result.death,'enemy');
  l.restart();assert.equal(e.active,true);assert.equal(e.x,e.startX);assert.equal(e.walkTime,0);
 }
});

test('Level 6 legitimately unlocks seven; completion-only coins, user isolation and unavailable eight remain intact',()=>{
 const disk=new Map(),storage={getItem:k=>disk.get(k),setItem:(k,v)=>disk.set(k,v)};
 const open=(user='winter-A')=>{const p=new LevelProgressManager(new LocalProgressStore(storage));levels.forEach(l=>p.registerLevel(l));p.setUser(user);return p;};
 const p=open();for(const l of levels.slice(0,6))p.completeLevel(l.id,l.coins.map(c=>c.id));assert.equal(p.getLevel(7).unlocked,true);
 const old=levels.slice(0,6).map(l=>p.getLevel(l.id)),c=new CoinManager(level7.coins),ids=level7.coins.map(c=>c.id);
 c.pending.add(ids[0]);assert.equal(open().getLevel(7).coinIds.length,0);c.discard();assert.equal(open().getLevel(7).coinIds.length,0);
 p.completeLevel(7,ids.slice(0,2));p.completeLevel(7,[ids[2]]);p.completeLevel(7,[]);assert.equal(open().getLevel(7).fullyCompleted,true);assert.equal(open().getLevel(8).unlocked,true);
 assert.deepEqual(levels.slice(0,6).map(l=>open().getLevel(l.id)),old);assert.deepEqual(open('winter-B').getLevel(7).coinIds,[]);
 const clean=open('winter-C'),before=JSON.stringify([...disk]);clean.completeLevel(7,ids,{developerAssisted:true});assert.equal(JSON.stringify([...disk]),before);assert.equal(clean.getLevel(7).completed,false);
 assert.deepEqual(open().totalCoins,{earned:21,possible:30});
});

test('five winter regions, readable ice/icicle art and reduced-motion atmosphere render without changing runtime state',()=>{
 const l=new LevelManager(level7),renderer=new FrozenRenderer(),colors=[],labels=[];
 const ctx=new Proxy({globalAlpha:1,fillText:t=>labels.push(t)}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>{if(k==='fillStyle')colors.push(v);o[k]=v;return true;}});
 const before=JSON.stringify(l);
 for(const camera of[0,4500,10000,15500,20100]){
  renderer.drawBackground(ctx,960,540,camera);renderer.drawDecorations(ctx,level7.scenery,460,camera,960);renderer.drawPlatforms(ctx,l.platforms,camera,960);renderer.drawAtmosphere(ctx,1,camera,{reduceMotion:true});drawInteractivePlatforms(ctx,l.platforms,camera,960,{reduceMotion:true});
 }
 l.enemies.forEach(e=>drawEnemy(ctx,e,0,23500));drawCaveMechanics(ctx,l,10000,960,{reduceMotion:true});assert.equal(JSON.stringify(l),before);
 l.stalactites[0].state='warning';drawCaveMechanics(ctx,l,10000,960,{reduceMotion:true});assert.ok(labels.includes('!'));
 for(const color of['#c8dfe5','#c4e4ee','#446b81','#b1c9d5','#cae4ee','#76b9d1','#f3f8f5'])assert.ok(colors.includes(color));
 const pines=level7.scenery.filter(s=>s.type==='pine');for(let i=0;i<pines.length;i++)for(let j=i+1;j<pines.length;j++)assert.ok(Math.abs(pines[i].x-pines[j].x)>=50*(pines[i].scale+pines[j].scale)+16);
 for(const location of locationsFor(level7))assert.ok(safePosition(l,location.target));
 const music=arrangeMusic('frozen');assert.equal(music.score.title,'Footprints Beneath the Northern Lights');assert.notDeepEqual(music.notes,arrangeMusic('cave').notes);
});
