import test from 'node:test';
import assert from 'node:assert/strict';
import { SunPulseTrap, validateSunPulses } from '../entities/SunPulseTrap.js';
const config={id:'beam',x:100,y:100,width:20,height:360,direction:'down',cooldown:2,warningDuration:1,activeDuration:1};
const box=x=>({x,y:350,width:32,height:64});
test('sun pulse starts safe, warns before every activation and resets',()=>{
 const t=new SunPulseTrap(config);assert.equal(t.state,'cooldown');
 t.update(2,box(0),box(0));assert.equal(t.state,'charging');
 t.update(1,box(0),box(0));assert.equal(t.state,'active');
 t.update(1,box(0),box(0));assert.equal(t.state,'cooldown');
 t.reset();assert.equal(t.time,0);assert.equal(t.state,'cooldown');
 assert.deepEqual(validateSunPulses({worldWidth:1000,sunPulseTraps:[config]}),[]);
 assert.ok(validateSunPulses({worldWidth:1000,sunPulseTraps:[{...config,warningDuration:0}]}).length);
 assert.throws(()=>new SunPulseTrap({...config,activeDuration:0}));assert.throws(()=>t.update(Infinity,box(0),box(0)));
 for(const direction of ['up','down','left','right'])assert.equal(new SunPulseTrap({...config,direction}).state,'cooldown');
});
test('sun pulse collision uses only the active time slice, including fast crossings',()=>{
 const t=new SunPulseTrap(config);
 assert.equal(t.update(2.5,box(200),box(0)),false,'crossing during cooldown/charge is safe');
 assert.equal(t.update(.6,box(0),box(200)),false,'crossing before activation is safe');
 assert.equal(t.update(.1,box(200),box(0)),true,'fast active crossing cannot tunnel');
 t.time=3.9;assert.equal(t.update(.2,box(100),box(0)),false,'arrival after deactivation is safe');
 t.time=2.9;assert.equal(t.update(.2,box(100),box(100)),true,'activation while occupied hurts');
 assert.equal(t.update(0,box(100),box(100)),false,'paused zero tick is inert');
});
for(const fps of [30,60,120])test(`sun pulse phase and damage are stable at ${fps} FPS`,()=>{
 const t=new SunPulseTrap({...config,initialDelay:.5});let damage=0;
 for(let i=0;i<fps*9;i++)if(t.update(1/fps,box(100),box(100)))damage++;
 assert.ok(Math.abs(damage/fps-2)<.04);assert.equal(t.state,'cooldown');
 assert.ok(Math.abs(t.time-9)<1e-8);
});
