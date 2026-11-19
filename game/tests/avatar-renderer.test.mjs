import test from 'node:test';
import assert from 'node:assert/strict';
import { AvatarRenderer } from '../rendering/AvatarRenderer.js';
import { drawRigLayer } from '../rendering/AvatarRig.js';
import { Player } from '../entities/Player.js';

const context=()=>{
 const calls=[];
 const ctx=new Proxy({globalAlpha:1},{get:(o,k)=>k in o?o[k]:(...args)=>calls.push([k,...args])});
 return{ctx,calls};
};
const sheet=name=>({name,naturalWidth:128,naturalHeight:32});
function setup(){
 const avatar=new AvatarRenderer(),player=new Player({x:80,feetY:460});
 avatar.layers=['skin','outfit','eyes','hair','armor','sword','hat'].map(name=>({frames:[sheet(name)],count:4,rigged:true}));
 return{avatar,player};
}

test('body and every equipped sheet crop exactly the same single 32px frame, including frame three',()=>{
 for(const frame of[0,1,2,3]){
  const{avatar,player}=setup(),{ctx,calls}=context();player.animation.pose.spriteFrame=frame;avatar.draw(ctx,player);
  const crops=calls.filter(c=>c[0]==='drawImage');assert.equal(crops.length,7*8);
  for(const[,image,x,y,w,h]of crops){assert.ok(x>=frame*32);assert.ok(x+w<=(frame+1)*32);assert.ok(y>=0&&y+h<=32);assert.ok(w>0&&h>0);assert.ok(avatar.layers.some(l=>l.frames[0]===image));}
  assert.equal(ctx.imageSmoothingEnabled,false);
 }
});

test('sheet crop normalization preserves old limb pivots and legacy 128px single-image frames',()=>{
 const pose={leftLeg:.2,rightLeg:-.2,leftArm:.3,rightArm:-.3};
 const old=context(),current=context();drawRigLayer(old.ctx,{},pose);drawRigLayer(current.ctx,{},pose,{x:64,width:32,height:32});
 const a=old.calls.filter(c=>c[0]==='drawImage'),b=current.calls.filter(c=>c[0]==='drawImage');
 for(let i=0;i<a.length;i++){
  assert.equal(b[i][2],64+a[i][2]/4);assert.equal(b[i][3],a[i][3]/4);
  assert.equal(b[i][4],a[i][4]/4);assert.equal(b[i][5],a[i][5]/4);assert.deepEqual(b[i].slice(6),a[i].slice(6));
 }
 assert.deepEqual(current.calls.filter(c=>c[0]==='translate'||c[0]==='rotate'),old.calls.filter(c=>c[0]==='translate'||c[0]==='rotate'));
});

test('all animation states keep sheet layers registered without changing movement or collision data',()=>{
 for(const state of['idle','run','jump','fall','land','climb','dead','complete'])for(const facing of[-1,1]){
  const{avatar,player}=setup(),{ctx,calls}=context();player.facing=facing;player.animation.state=state;
  if(state==='dead')player.animation.deathAnchor={x:120,feetY:500};
  Object.assign(player.animation.pose,{spriteFrame:2,leftArm:.25,rightArm:-.25,leftLeg:-.2,rightLeg:.2});
  const before=JSON.stringify(player);avatar.draw(ctx,player);assert.equal(JSON.stringify(player),before);
  assert.ok(calls.some(c=>c[0]==='scale'&&c[1]===facing&&c[2]===1));
  assert.ok(calls.some(c=>c[0]==='translate'&&c[1]===(state==='dead'?120:96)&&c[2]===(state==='dead'?500:460)));
  assert.equal(calls.filter(c=>c[0]==='drawImage').length,56);
 }
});

test('Reduce Motion uses frame zero for all sheets while preserving the selected appearance and readable limbs',()=>{
 const{avatar,player}=setup(),{ctx,calls}=context();Object.assign(player.animation.pose,{spriteFrame:3,lift:3,tilt:.1,xScale:1.2,yScale:.8,leftArm:.3});
 avatar.draw(ctx,player,{reduceMotion:true});for(const c of calls.filter(c=>c[0]==='drawImage'))assert.ok(c[2]>=0&&c[2]+c[4]<=32);
 assert.ok(calls.some(c=>c[0]==='rotate'&&c[1]===.3));assert.ok(calls.some(c=>c[0]==='translate'&&c[1]===96&&c[2]===460));assert.equal(player.animation.pose.spriteFrame,3);
});

test('non-rigged sheets crop before fitting; old separate-image frames and missing-avatar fallback still draw',()=>{
 const avatar=new AvatarRenderer(),player=new Player({x:80,feetY:460});player.animation.pose.spriteFrame=3;
 avatar.layers=[{frames:[{naturalWidth:256,naturalHeight:48}],count:4,rigged:false}];let c=context();avatar.draw(c.ctx,player);
 const image=c.calls.find(c=>c[0]==='drawImage');assert.deepEqual(image.slice(2),[192,0,64,48,-32,-48,64,48]);
 const legacy=[{naturalWidth:128,naturalHeight:128,name:'first'},{naturalWidth:128,naturalHeight:128,name:'second'}];
 avatar.layers=[{frames:legacy,count:1,rigged:true}];c=context();avatar.draw(c.ctx,player);assert.ok(c.calls.filter(c=>c[0]==='drawImage').every(c=>c[1]===legacy[1]&&c[2]+c[4]<=128));
 avatar.layers=[];c=context();avatar.draw(c.ctx,player);assert.ok(c.calls.some(c=>c[0]==='arc'));assert.equal(c.calls.filter(c=>c[0]==='drawImage').length,0);
});
