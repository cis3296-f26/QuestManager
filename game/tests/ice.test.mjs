import test from 'node:test';import assert from 'node:assert/strict';
import {Player} from '../entities/Player.js';
import {moveHorizontally,jump,applyGravity} from '../engine/Physics.js';
import {accelerate,validateSurfaces} from '../engine/SurfaceMovement.js';
import {LevelManager} from '../levels/LevelManager.js';import {stepLevel} from '../engine/stepLevel.js';
const ice={id:'ice',x:0,y:460,width:1500,height:80,appearance:'ice',surface:{type:'ice',acceleration:1000,braking:900,friction:600}};
function stand(){const p=new Player({x:200,feetY:460});p.supportPlatform=ice;return p;}
test('ice acceleration, coast distance, reversal and recovery are stable at 30/60/120 FPS',()=>{
 const results=[];for(const fps of [30,60,120]){
  const p=stand();for(let i=0;i<fps;i++)moveHorizontally(p,1,280,2000,1/fps);
  assert.equal(p.velocityX,280);assert.ok(p.x<480&&p.x>430);const start=p.x;
  for(let i=0;i<fps;i++)moveHorizontally(p,0,280,2000,1/fps);
  assert.ok(Math.abs(p.x-start-280**2/1200)<1e-7);assert.equal(p.velocityX,0);
  p.velocityX=280;const reversal=p.x;moveHorizontally(p,-1,280,2000,.1);assert.ok(p.x>reversal);assert.ok(p.velocityX>0);
  for(let i=0;i<fps;i++)moveHorizontally(p,-1,280,2000,1/fps);assert.equal(p.velocityX,-280);
  p.supportPlatform={...ice,surface:undefined};moveHorizontally(p,0,280,2000,1/fps);assert.equal(p.velocityX,0);assert.equal(p.iceAirborne,false);
  results.push(start);
 }assert.ok(Math.max(...results)-Math.min(...results)<1e-7);
 assert.deepEqual(accelerate(100,100,500,.1),{velocity:100,distance:10});
});
test('jumping preserves ice momentum and responsive airborne steering; landing on normal terrain restores ordinary controls',()=>{
 for(const fps of [30,60,120]){
  const p=stand();p.velocityX=200;jump(p,650);const x=p.x;
  moveHorizontally(p,0,280,2000,1/fps);applyGravity(p,1800,[ice],1/fps);assert.ok(p.x>x);assert.equal(p.velocityX,200);assert.ok(p.velocityY<0);
  let frames=0;while(!p.grounded&&frames++<fps*2){moveHorizontally(p,-1,280,2000,1/fps);applyGravity(p,1800,[ice],1/fps);}
  assert.equal(p.grounded,true);assert.equal(p.supportPlatform,ice);
  p.reset({x:200,feetY:460});assert.equal(p.velocityX,0);assert.equal(p.iceAirborne,false);
  const normal={...ice,surface:undefined};p.supportPlatform=normal;moveHorizontally(p,1,280,2000,1/fps);assert.equal(p.x,200+280/fps);
 }
});
test('sliding uses existing swept solid walls and flight clears stored momentum',()=>{
 const config={id:99,worldWidth:2000,spawn:{x:200,feetY:460},groundY:460,platforms:[ice],enemies:[],hazards:[],coins:[],barriers:[{id:'wall',x:350,y:200,width:25,height:260}],finish:{platform:ice,flagInset:40}};
 for(const fps of [30,60,120]){
  const l=new LevelManager(config);l.player.supportPlatform=l.platforms[0];
  for(let i=0;i<fps*2;i++)stepLevel(l,1,1/fps);assert.equal(l.player.x,318);assert.equal(l.player.velocityX,0);
  l.player.velocityX=280;l.player.iceAirborne=true;stepLevel(l,1,1/fps,{flight:{vertical:0,speed:420}});
  assert.equal(l.player.velocityX,0);assert.equal(l.player.iceAirborne,false);
 }
 assert.deepEqual(validateSurfaces({platforms:[ice]}),[]);assert.ok(validateSurfaces({platforms:[{...ice,surface:{...ice.surface,friction:0}}]}).length);
});
