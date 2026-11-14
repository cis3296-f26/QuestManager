import test from 'node:test';
import assert from 'node:assert/strict';
import {LavaGeyser,validateLavaGeysers} from '../entities/LavaGeyser.js';
import {touchesLava} from '../engine/Hazards.js';
import {LevelManager} from '../levels/LevelManager.js';
import {level9} from '../levels/Level9.js';
import {CoinManager} from '../levels/CoinManager.js';
import {stepLevel} from '../engine/stepLevel.js';
import {DeveloperModeManager} from '../dev/DeveloperModeManager.js';
import {GameAudioEvents} from '../audio/GameAudioEvents.js';
const def={id:'test-vent',x:100,y:180,width:60,height:310,warningDuration:1,activeDuration:1,recoveryDuration:.5,cooldown:2,initialDelay:1};
const box=x=>({x,y:350,width:32,height:64});
test('geyser reuses temporal swept collision through dormant, warning, eruption, recovery and cooldown',()=>{
 const g=new LavaGeyser(def);assert.equal(g.state,'dormant');
 assert.equal(g.update(1,box(100),box(100)),false);assert.equal(g.state,'warning');
 assert.equal(g.update(1,box(100),box(100)),false);assert.equal(g.state,'eruption');
 assert.equal(g.update(.1,box(200),box(0)),true,'fast active traversal cannot tunnel through the column');
 g.time=2.9;assert.equal(g.update(.2,box(100),box(0)),false,'arrival after the active slice is harmless');assert.equal(g.state,'recovery');
 g.time=3.5;assert.equal(g.state,'cooldown');g.time=5.5;assert.equal(g.state,'warning');
 assert.equal(g.update(0,box(100),box(100)),false);g.reset();assert.equal(g.time,0);assert.equal(g.state,'dormant');
 assert.deepEqual(validateLavaGeysers({worldWidth:1000,lavaGeysers:[def]}),[]);
 assert.throws(()=>new LavaGeyser({...def,recoveryDuration:0}));assert.throws(()=>new LavaGeyser({...def,warningDuration:0}));assert.throws(()=>g.update(NaN,box(0),box(0)));
});
for(const fps of[30,60,120])test(`geyser active exposure and distinct initial offsets are consistent at ${fps} FPS`,()=>{
 const g=new LavaGeyser(def),offset=new LavaGeyser({...def,initialDelay:3});let damage=0;
 for(let f=0;f<fps*10;f++)if(g.update(1/fps,box(100),box(100)))damage++;
 assert.ok(Math.abs(damage/fps-2)<.04);assert.ok(Math.abs(g.time-10)<1e-8);
 g.time=2.2;offset.time=2.2;assert.equal(g.state,'eruption');assert.equal(offset.state,'dormant');
 const c={...level9,lavaGeysers:[{...def,x:200}],hazards:[],enemies:[]},l=new LevelManager(c);
 l.player.reset({x:100,feetY:420});l.geysers[0].time=2.1;
 let death=null;for(let f=0;f<fps*.5&&!death;f++)death=stepLevel(l,1,1/fps).death;assert.equal(death,'eruption','walking through an active column must die');
 const safe=new LevelManager(c);safe.player.reset({x:100,feetY:420});safe.geysers[0].time=3.5;
 for(let f=0;f<fps*.5;f++)assert.equal(stepLevel(safe,1,1/fps).death,null,'same crossing in the cooldown interval is safe');
});
test('permanent lava uses only its explicit rectangle and swept fast entry; nearby safe space stays harmless',()=>{
 const h=[{type:'lava',x:100,y:490,width:100,height:50}];
 assert.equal(touchesLava({x:120,y:430,width:32,height:64},{x:120,y:410,width:32,height:64},h),true);
 assert.equal(touchesLava({x:120,y:600,width:32,height:64},{x:120,y:350,width:32,height:64},h),true,'high falling speed cannot tunnel');
 assert.equal(touchesLava({x:201,y:490,width:32,height:64},{x:201,y:480,width:32,height:64},h),false);
 assert.equal(touchesLava({x:120,y:400,width:32,height:64},{x:120,y:350,width:32,height:64},h),false);
 for(const fps of[30,60,120]){
  const l=new LevelManager(level9),h=level9.hazards[0];l.player.reset({x:h.x+20,feetY:h.y+10});l.player.grounded=false;
  assert.equal(stepLevel(l,0,1/fps).death,'lava');
  const d=new DeveloperModeManager({available:true,getLevel:()=>l});d.enable(true);d.set('invincible',true);assert.equal(d.step(0,new Set(),1/fps).death,null);
  d.set('invincible',false);d.set('fly',true);l.player.y=490;assert.equal(d.step(0,new Set(),1/fps).death,null);assert.equal(d.set('fly',false),true);assert.equal(l.player.grounded,true);
 }
});
test('attempt checkpoints reset all transient state, discard pending coins and never clear assisted status on respawn',()=>{
 for(const fps of[30,60,120]){
  const l=new LevelManager(level9),coins=new CoinManager(level9.coins),c=level9.checkpoints[1];
  assert.equal(l.checkpointIndex,-1);l.player.reset({x:c.x,feetY:c.feetY});l.player.supportPlatform=l.platforms.find(p=>p.id===c.platformId);
  assert.equal(stepLevel(l,0,1/fps).checkpoint.id,c.id);coins.pending.add(level9.coins[0].id);l.developerAssisted=true;
  l.geysers.forEach(g=>g.time=9);l.platforms.find(p=>p.type==='collapsing').onLand();l.enemies[0].defeat();l.puzzle.switches[0].active=true;
  const lava=level9.hazards[0];l.player.reset({x:lava.x+10,feetY:lava.y+5});assert.equal(stepLevel(l,0,1/fps).death,'lava');
  coins.discard();l.respawn();assert.equal(coins.pending.size,0);assert.equal(l.player.x,c.x);assert.equal(l.player.y+64,c.feetY);assert.equal(l.checkpointIndex,1);assert.equal(l.developerAssisted,true);
  assert.ok(l.geysers.every(g=>g.time===0));assert.ok(l.platforms.filter(p=>p.type).every(p=>p.elapsed===0&&p.state==='stable'));assert.ok(l.enemies.every(e=>e.active&&e.x===e.startX));assert.ok(l.puzzle.switches.every(s=>!s.active));
  l.restart();assert.equal(l.player.x,level9.spawn.x);assert.equal(l.checkpointIndex,-1);assert.equal(l.developerAssisted,false);
 }
});
test('geyser sound cues are local, transition-based and do not continuously loop',()=>{
 const l=new LevelManager(level9),coins=new CoinManager(level9.coins),played=[],events=new GameAudioEvents({play:n=>played.push(n),stopEffect(){}}),g=l.geysers[0];l.player.x=g.config.x-100;
 let before=events.capture(l,coins);g.time=g.config.initialDelay+.1;events.after(before,l,coins,{stomped:[]});assert.deepEqual(played,['lavaBubble']);
 before=events.capture(l,coins);events.after(before,l,coins,{stomped:[]});assert.equal(played.length,1);
 before=events.capture(l,coins);g.time=g.config.initialDelay+g.config.warningDuration+.1;events.after(before,l,coins,{stomped:[]});assert.deepEqual(played,['lavaBubble','eruption']);
 l.player.x=0;before=events.capture(l,coins);g.time=g.config.initialDelay+.1;events.after(before,l,coins,{stomped:[]});assert.equal(played.length,2,'off-screen vents do not spam audio');
});
