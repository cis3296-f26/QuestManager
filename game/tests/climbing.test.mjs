import test from 'node:test';
import assert from 'node:assert/strict';
import {LevelManager} from '../levels/LevelManager.js';
import {level8} from '../levels/Level8.js';
import {toggleClimb,detachClimb,validateClimbables} from '../engine/Climbing.js';
import {stepLevel} from '../engine/stepLevel.js';
import {jump} from '../engine/Physics.js';
import {DeveloperModeManager} from '../dev/DeveloperModeManager.js';
const setup=()=>{const l=new LevelManager(level8),c=level8.climbables[0];l.player.reset({x:c.x-25,feetY:c.bottomFeet});return {l,c,p:l.player};};
test('climbing attachment is nearby, gradual, opt-in and suspends gravity at all frame rates',()=>{
 for(const fps of[30,60,120]){
  const{l,c,p}=setup();p.x=c.x+60;assert.equal(toggleClimb(l),false);p.x=c.x-16;p.y=c.bottomFeet-32;assert.equal(toggleClimb(l),false,"cannot snap upward from below the bottom endpoint");p.y=c.bottomFeet-64;p.x=c.x-25;const old=p.x;
  assert.equal(toggleClimb(l),true);assert.equal(p.x,old,'attachment itself never teleports');
  stepLevel(l,1,1/fps,{climbVertical:-1});assert.ok(p.x>old&&p.x<=c.x-16);assert.equal(p.velocityY,0);
  for(let f=0;f<fps;f++)assert.equal(stepLevel(l,0,1/fps,{climbVertical:-1}).death,null);
  assert.ok(p.y+64<c.bottomFeet-135);assert.equal(p.grounded,false);assert.equal(p.supportPlatform,null);
  for(let f=0;f<fps*3;f++)stepLevel(l,0,1/fps,{climbVertical:-1});assert.equal(p.y+64,c.topFeet);
  for(let f=0;f<fps*3;f++)stepLevel(l,0,1/fps,{climbVertical:1});assert.equal(p.y+64,c.bottomFeet);
  assert.equal(toggleClimb(l),true);assert.equal(p.climbingId,null);assert.equal(p.velocityY,0);
 }
});
test('Space jump-off restores ordinary jump physics, horizontal control and a real ledge landing',()=>{
 for(const fps of[30,60,120]){
  const{l,c,p}=setup();toggleClimb(l);for(let f=0;f<fps*2;f++)stepLevel(l,0,1/fps,{climbVertical:-1});
  const x=p.x;jump(p,650);assert.equal(p.climbingId,null);assert.equal(p.velocityY,-650);
  for(let f=0;f<fps*.75;f++)assert.equal(stepLevel(l,p.x<x+45?1:0,1/fps).death,null);
  assert.ok(p.x>x);assert.equal(p.grounded,true);assert.equal(p.supportPlatform.id,'l8-ladder-top');
  l.restart();assert.equal(p.climbingId,null);assert.equal(p.climbPhase,0);
 }
});
test('attachment and climbing cannot cross solid walls or closed gates',()=>{
 for(const fps of[30,60,120]){
  const{l,c,p}=setup();const wall={x:c.x-7,y:335,width:14,height:25};
  l.puzzle.barriers=[wall];toggleClimb(l);
  for(let f=0;f<fps*2;f++)stepLevel(l,0,1/fps,{climbVertical:-1});
  assert.ok(p.y>=wall.y+wall.height);assert.equal(p.climbingId,null);
  p.reset({x:c.x-30,feetY:c.bottomFeet});l.puzzle.barriers=[{x:c.x-10,y:p.y,width:10,height:64}];
  assert.equal(toggleClimb(l),false);
 }
});
test('flight, safe teleport and clean restart clear climbing without clearing assisted-run protection',()=>{
 const{l,c,p}=setup();toggleClimb(l);const dev=new DeveloperModeManager({available:true,getLevel:()=>l});dev.enable(true);dev.set('fly',true);
 dev.step(1,new Set(['KeyW']),1/60);assert.equal(p.climbingId,null);assert.equal(l.developerAssisted,true);
 assert.equal(dev.set('fly',false),true);assert.equal(p.climbingId,null);assert.equal(p.grounded,true);
 assert.equal(dev.enable(false),true);assert.equal(l.developerAssisted,true);l.restart();assert.equal(l.developerAssisted,false);
});
test('invalid or unconnected climbing geometry is rejected rather than granting graph shortcuts',()=>{
 assert.deepEqual(validateClimbables(level8),[]);
 const bad=structuredClone(level8);Object.assign(bad.climbables[0],{topFeet:50,attachRadius:500,connection:{from:'missing',to:'missing'}});
 assert.equal(validateClimbables(bad).length,2);
});
