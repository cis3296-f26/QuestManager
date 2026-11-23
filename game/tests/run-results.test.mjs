import test from 'node:test';
import assert from 'node:assert/strict';
import { RunStats } from '../progress/RunStats.js';
import { LevelProgressManager } from '../progress/LevelProgressManager.js';
import { LocalProgressStore } from '../progress/LocalProgressStore.js';
import { GameClock } from '../engine/GamePauseManager.js';
import { levels } from '../levels/levels.js';
import { formatRunTime, renderRunResults } from '../ui/RunResults.js';
const fixture=()=>{
 const disk=new Map(),storage={getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v)};
 const open=(user='A',backing=storage)=>{const p=new LevelProgressManager(new LocalProgressStore(backing));levels.forEach(l=>p.registerLevel(l));p.setUser(user);return p;};
 return {disk,open,storage};
};
const options=completionTimeMs=>({completionTimeMs});

test('active run time agrees at 30/60/120 FPS, excludes inactive clock frames and freezes at completion',()=>{
 for(const fps of[30,60,120]){
  const stats=new RunStats(),clock=new GameClock();let wall=0;
  const tick=(seconds,active=true)=>{wall+=seconds*1000;const dt=clock.frame(wall,active);if(dt!==null)stats.advance(dt);};
  tick(0);for(let i=0;i<fps*3;i++)tick(1/fps);
  tick(120,false);tick(120);assert.ok(Math.abs(stats.elapsed-3)<1e-8);
  for(let i=0;i<fps;i++)tick(1/fps);stats.recordDeath();stats.recordDeath();
  const result=stats.finish();assert.deepEqual(result,{timeMs:4000,deaths:2,assisted:false});
  const elapsed=stats.elapsed;stats.advance(10,{assisted:true});stats.recordDeath();assert.equal(stats.finish(),result);assert.equal(stats.elapsed,elapsed);
 }
});

test('manual reset clears a run, not its frozen prior result; assistance stays sticky until reset',()=>{
 const s=new RunStats();s.advance(5,{assisted:true});s.recordDeath();s.advance(.7);s.advance(1,{assisted:false});
 assert.deepEqual(s.finish(),{timeMs:6700,deaths:1,assisted:true});const old=s.result;s.reset();assert.equal(s.result,null);assert.equal(s.elapsed,0);assert.equal(s.deaths,0);assert.equal(s.assisted,false);assert.equal(old.timeMs,6700);
 for(const dt of[-1,NaN,Infinity,'1'])assert.throws(()=>s.advance(dt),RangeError);
});

test('legacy saves remain compatible and best times save only on eligible completions, with faster-only updates',()=>{
 const{open,disk}=fixture(),p=open(),coin=levels[0].coins[0].id;
 p.completeLevel(1,[coin]);assert.equal(open().getBestTime(1),null);
 const old=p.getLevel(1);let r=p.completeLevel(1,[],options(120000));assert.equal(r.newPersonalBest,true);assert.equal(open().getBestTime(1),120000);assert.deepEqual(p.getLevel(1),old);
 r=p.completeLevel(1,[],options(125000));assert.equal(r.newPersonalBest,false);assert.equal(p.getBestTime(1),120000);
 r=p.completeLevel(1,[],options(120000));assert.equal(r.newPersonalBest,false);
 r=p.completeLevel(1,[],options(119999));assert.equal(r.newPersonalBest,true);assert.equal(open().getBestTime(1),119999);
 const before=JSON.stringify([...disk]);p.completeLevel(1,levels[0].coins.map(c=>c.id),{completionTimeMs:1,developerAssisted:true});assert.equal(JSON.stringify([...disk]),before);assert.equal(p.getBestTime(1),119999);
 for(const bad of[0,-1,NaN,Infinity,1.2,'1',Number.MAX_SAFE_INTEGER+1])p.completeLevel(1,[],options(bad));assert.equal(p.getBestTime(1),119999);
 assert.equal(p.getBestTime(0),null);assert.equal(p.getBestTime(11),null);assert.equal(p.getLevel(2).unlocked,true);
});

test('a late or slower tab cannot overwrite a faster record, including when coin reset revisions change',()=>{
 const{open}=fixture(),a=open(),b=open();a.completeLevel(1,[levels[0].coins[0].id],options(100000));b.completeLevel(1,[levels[0].coins[1].id],options(110000));assert.equal(open().getBestTime(1),100000);
 a.completeLevel(1,[],options(90000));b.clearCoinProgress(1);assert.equal(open().getBestTime(1),90000);assert.deepEqual(open().getLevel(1).coinIds,[]);
 a.completeLevel(1,[],options(95000));assert.equal(open().getBestTime(1),90000);assert.deepEqual(open().getLevel(1).coinIds,[],'a stale completion must not resurrect reset coins');
 b.completeLevel(1,[],options(80000));a.completeLevel(1,[],options(85000));assert.equal(open().getBestTime(1),80000);
 open().clearCoinProgress();assert.equal(open().getBestTime(1),80000);
});

test('sanitizing old, malformed or incomplete records never invents a best time or loses earned coins',()=>{
 const{disk,open}=fixture(),key=new LocalProgressStore(null).key('A'),id=levels[0].coins[0].id;
 for(const bad of[-2,0,'123',NaN,Infinity,1.1]){
  disk.set(key,JSON.stringify({version:1,levels:{1:{completed:true,coinIds:[id],bestTimeMs:bad},2:{completed:false,coinIds:[],bestTimeMs:100}}}));
  const p=open();assert.equal(p.getBestTime(1),null);assert.equal(p.getBestTime(2),null);assert.deepEqual(p.getLevel(1).coinIds,[id]);
 }
 disk.set(key,JSON.stringify({version:1,levels:{1:{completed:true,coinIds:[id],bestTimeMs:1234}}}));assert.equal(open().getBestTime(1),1234);
});

test('records are per account and level; guest or unavailable storage remains session-only',()=>{
 const{open,disk}=fixture(),a=open();for(const l of levels)a.completeLevel(l.id,[],options(l.id*1000));for(const l of levels)assert.equal(open().getBestTime(l.id),l.id*1000);
 assert.equal(open('B').getBestTime(1),null);a.setUser('B');assert.equal(a.getBestTime(1),null);a.completeLevel(1,[],options(2000));a.setUser('A');assert.equal(a.getBestTime(1),1000);
 const before=JSON.stringify([...disk]),guest=open(null);guest.completeLevel(1,[],options(500));assert.equal(guest.getBestTime(1),500);assert.equal(guest.persistent,false);assert.equal(open(null).getBestTime(1),null);assert.equal(JSON.stringify([...disk]),before);
 const unavailable=open('C',{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}});unavailable.completeLevel(1,[],options(400));assert.equal(unavailable.getBestTime(1),400);assert.equal(unavailable.persistent,false);
});

test('completion formatting and UI distinguish current coins, stored best, new records and unsaved test runs',()=>{
 assert.equal(formatRunTime(0),'0:00.00');assert.equal(formatRunTime(61599),'1:01.59');assert.equal(formatRunTime(3600123),'60:00.12');for(const t of[null,undefined,-1,Infinity,NaN])assert.equal(formatRunTime(t),'—');
 const nodes=new Map(),doc={getElementById:id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);}},run={timeMs:65120,deaths:3};
 renderRunResults(doc,run,{coinCount:1,bestTimeMs:65120,eligible:true,newPersonalBest:true,persistent:true});assert.equal(nodes.get('resultTime').textContent,'1:05.12');assert.equal(nodes.get('resultDeaths').textContent,'3');assert.equal(nodes.get('resultRunCoins').textContent,'1/3');assert.equal(nodes.get('resultRecordNotice').textContent,'New personal best!');assert.equal(nodes.get('resultBestLabel').textContent,'Personal best');
 renderRunResults(doc,run,{coinCount:0,bestTimeMs:60000,eligible:false,newPersonalBest:true,persistent:true});assert.equal(nodes.get('resultBestTime').textContent,'1:00.00');assert.match(nodes.get('resultRecordNotice').textContent,/did not save/);
 renderRunResults(doc,run,{coinCount:0,bestTimeMs:null,eligible:true,persistent:false});assert.equal(nodes.get('resultBestLabel').textContent,'Session best');assert.equal(nodes.get('resultBestTime').textContent,'—');assert.equal(nodes.get('resultRecordNotice').hidden,true);
});
