import { drawSunPulses } from "./SunPulseRenderer.js";
const visible=(p,x,w)=>p.x+(p.width??160)>=x&&p.x-(p.width??160)<=x+w;
export function drawCastleStone(ctx,p){
 ctx.fillStyle='#595361';ctx.fillRect(p.x,p.y,p.width,p.height);
 ctx.fillStyle='#d0bca1';ctx.fillRect(p.x,p.y,p.width,6);
 ctx.strokeStyle='#39343f';ctx.lineWidth=2;ctx.strokeRect(p.x+1,p.y+1,p.width-2,p.height-2);
 ctx.strokeStyle='#77707c';ctx.lineWidth=1;
 for(let y=p.y+23,row=0;y<p.y+p.height;y+=24,row++){
  ctx.beginPath();ctx.moveTo(p.x+3,y);ctx.lineTo(p.x+p.width-3,y);ctx.stroke();
  for(let x=p.x+((row%2)*36)+18;x<p.x+p.width-4;x+=72){ctx.beginPath();ctx.moveTo(x,y-19);ctx.lineTo(x,y);ctx.stroke();}
 }
}
function arch(ctx,x,y,w,h){ctx.beginPath();ctx.moveTo(x,y+h);ctx.lineTo(x,y+w*.5);ctx.quadraticCurveTo(x+w*.5,y-w*.15,x+w,y+w*.5);ctx.lineTo(x+w,y+h);ctx.closePath();}
function torch(ctx,x,y){ctx.fillStyle='#6a493d';ctx.fillRect(x-4,y,8,28);ctx.fillStyle='#dc9250';ctx.beginPath();ctx.moveTo(x-9,y+3);ctx.quadraticCurveTo(x-11,y-8,x,y-21);ctx.quadraticCurveTo(x+12,y-5,x+9,y+3);ctx.fill();ctx.fillStyle='#f5d79a';ctx.fillRect(x-3,y-7,6,11);}
export class CastleRenderer {
 region(x){return x<5500?0:x<11500?1:x<17500?2:x<23500?3:4;}
 drawBackground(ctx,w,h,cameraX){
  const r=this.region(cameraX+w/2);
  ctx.fillStyle=['#a994a2','#655c70','#5f5564','#a196ab','#67586c'][r];ctx.fillRect(0,0,w,h);
  if(r===0||r===3){
   ctx.fillStyle='#85758b';ctx.beginPath();ctx.moveTo(0,h);for(let x=-80;x<=w+80;x+=80)ctx.lineTo(x,325+Math.sin((x+cameraX*.13)*.007)*65);ctx.lineTo(w,h);ctx.fill();
   // Distant battlements establish one continuous fortress, well behind safe decks.
   ctx.fillStyle=r===3?'#71657d':'#6d6178';for(let i=-1;i<6;i++){const x=i*250-(cameraX*.15%250);ctx.fillRect(x,210+(i%2)*35,95,330);for(let d=0;d<95;d+=30)ctx.fillRect(x+d,198+(i%2)*35,17,17);ctx.fillStyle='#c19a74';ctx.fillRect(x+43,260+(i%2)*35,9,20);ctx.fillStyle=r===3?'#71657d':'#6d6178';}
  }else{
   ctx.fillStyle='#554c61';ctx.fillRect(0,84,w,28);
   for(let i=-1;i<5;i++){const x=i*300-(cameraX*.2%300);ctx.fillStyle='#574e63';ctx.fillRect(x,112,27,h-112);ctx.fillRect(x+230,112,27,h-112);ctx.strokeStyle='#7d7084';ctx.lineWidth=10;arch(ctx,x+20,130,215,355);ctx.stroke();ctx.fillStyle='#827181';ctx.globalAlpha=.3;arch(ctx,x+85,155,75,145);ctx.fill();ctx.globalAlpha=1;}
   if(r===2){ctx.fillStyle='#c28058';ctx.globalAlpha=.12;ctx.fillRect(0,390,w,150);ctx.globalAlpha=1;}
  }
 }
 drawPlatforms(ctx,ps,x,w){for(const p of ps)if(!p.type&&visible(p,x,w))drawCastleStone(ctx,p);}
 drawDecorations(ctx,items,groundY,cameraX,w){for(const s of items){if(!visible(s,cameraX,w))continue;
  const width=s.width??100,top=s.top??s.baseY-150,height=s.baseY-top;
  ctx.save();ctx.translate(s.x,s.baseY);ctx.fillStyle='#625564';ctx.strokeStyle='#a18a89';ctx.lineWidth=3;
  if(['outer-tower','guardhouse','treasury-shell','great-door','gate-frame','throne-arch','room-arch','bridge-arch'].includes(s.type)){
   ctx.globalAlpha=.75;
   if(s.type==='outer-tower'){ctx.fillRect(-width/2,-height,width,height);for(let x=-width/2;x<width/2;x+=35)ctx.fillRect(x,-height-15,20,20);ctx.fillStyle='#edbb78';arch(ctx,-12,-height+40,24,44);ctx.fill();}
   else{ctx.fillRect(-width/2,-height,22,height);ctx.fillRect(width/2-22,-height,22,height);ctx.fillRect(-width/2,-height,width,18);ctx.strokeStyle='#96848b';ctx.lineWidth=12;arch(ctx,-width/2+15,-height+16,width-30,height-16);ctx.stroke();torch(ctx,-width/2+44,-height+80);torch(ctx,width/2-44,-height+80);}
  }else if(s.type==='balcony-bracket'){
   ctx.globalAlpha=.7;ctx.fillRect(-width/2,-height,width,8);for(const dx of[-width*.35,width*.35]){ctx.beginPath();ctx.moveTo(dx,-height);ctx.lineTo(dx+30,-height);ctx.lineTo(dx,height>100?-height+85:0);ctx.closePath();ctx.fill();}
  }else if(['chain-frame','ladder-frame','moat-chain'].includes(s.type)){
   ctx.fillRect(-width/2,-height,12,height);ctx.fillRect(width/2-12,-height,12,height);ctx.fillRect(-width/2,-height,width,12);ctx.strokeStyle='#b9a487';ctx.lineWidth=2;
   for(const dx of[-width*.3,width*.3])for(let y=-height+14;y<-15;y+=13){ctx.beginPath();ctx.ellipse(dx,y,4,7,0,0,Math.PI*2);ctx.stroke();}
  }else if(s.type==='gear'){
   ctx.fillStyle='#7a665f';ctx.strokeStyle='#b69b80';ctx.lineWidth=9;ctx.beginPath();ctx.arc(0,-width/2,width*.42,0,Math.PI*2);ctx.stroke();ctx.lineWidth=12;
   for(let a=0;a<8;a++){const angle=a*Math.PI/4;ctx.beginPath();ctx.moveTo(0,-width/2);ctx.lineTo(Math.cos(angle)*width*.47,-width/2+Math.sin(angle)*width*.47);ctx.stroke();}ctx.fillStyle='#554852';ctx.beginPath();ctx.arc(0,-width/2,18,0,Math.PI*2);ctx.fill();
  }else if(s.type==='furnace'){
   ctx.fillRect(-width/2,-height,width,height);ctx.fillStyle='#372f40';arch(ctx,-width*.32,-height+60,width*.64,height-60);ctx.fill();ctx.fillStyle='#dc8d49';ctx.fillRect(-width*.25,-70,width*.5,62);ctx.strokeStyle='#44353b';ctx.lineWidth=6;for(let x=-width*.2;x<width*.3;x+=18){ctx.beginPath();ctx.moveTo(x,-80);ctx.lineTo(x,0);ctx.stroke();}torch(ctx,0,-height+27);
  }else if(s.type==='banner'){
   ctx.fillStyle='#893e48';ctx.beginPath();ctx.moveTo(-width/2,-150);ctx.lineTo(width/2,-150);ctx.lineTo(width/2,-25);ctx.lineTo(0,0);ctx.lineTo(-width/2,-25);ctx.fill();ctx.strokeStyle='#d4ad74';ctx.stroke();ctx.fillStyle='#d4ad74';ctx.font='28px Georgia';ctx.textAlign='center';ctx.fillText('◇',0,-65);
  }else if(s.type==='sunrise-window'){
   ctx.fillStyle='#d7b8a1';arch(ctx,-width/2,-height,width,height);ctx.fill();ctx.save();arch(ctx,-width/2+12,-height+12,width-24,height-12);ctx.clip();ctx.fillStyle='#eacfb1';ctx.fillRect(-width/2,-height,width,height);ctx.fillStyle='#f5e4ba';ctx.beginPath();ctx.arc(0,-height*.55,56,0,Math.PI*2);ctx.fill();ctx.fillStyle='#b0a8ad';ctx.beginPath();ctx.moveTo(-width/2,0);ctx.lineTo(-width/2,-80);ctx.lineTo(-70,-120);ctx.lineTo(90,-60);ctx.lineTo(width/2,-110);ctx.lineTo(width/2,0);ctx.fill();ctx.restore();
  }else if(s.type==='refuge'){ctx.fillStyle='#cdb891';ctx.fillRect(-30,-70,60,9);ctx.fillRect(-26,-61,8,61);ctx.fillRect(18,-61,8,61);torch(ctx,0,-40);}
  else if(s.type==='rock-anchor'){ctx.fillStyle='#655967';ctx.fillRect(-width/2,-15,width,15);}
  ctx.restore();
 }}
}
// Body is behind the walkways; seals, warnings and the exact exit wall stay in front.
export function drawWarden(ctx,level,cameraX,width,{reduceMotion=false,bodyOnly=false}={}){
 const boss=level.warden;if(!boss)return;const c=boss.config;if(c.exitGate.x<cameraX||c.entryX>cameraX+width)return;
 if(bodyOnly){const b=c.body,dim=boss.state==='defeated'?1:boss.state==='defeating'?Math.min(1,boss.defeatTime/c.defeatDuration):0;
  ctx.save();ctx.translate(b.x,b.y);ctx.scale(1,1-dim*.15);ctx.fillStyle='#433c4d';ctx.strokeStyle='#a28a89';ctx.lineWidth=3;
  ctx.fillRect(-b.width*.36,-b.height*.72,b.width*.72,b.height*.65);ctx.strokeRect(-b.width*.36,-b.height*.72,b.width*.72,b.height*.65);
  for(const sign of[-1,1]){ctx.fillRect(sign<0?-b.width*.63:b.width*.4,-b.height*.7,b.width*.23,b.height*.57);ctx.strokeRect(sign<0?-b.width*.63:b.width*.4,-b.height*.7,b.width*.23,b.height*.57);ctx.fillRect(sign<0?-45:12,-25,33,25);}
  ctx.fillRect(-36,-b.height,72,58);ctx.strokeRect(-36,-b.height,72,58);ctx.fillStyle=dim>.5?'#897b77':'#eab36a';ctx.fillRect(-22,-b.height+22,13,7);ctx.fillRect(9,-b.height+22,13,7);
  ctx.strokeStyle=dim>.5?'#79665e':'#d78451';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-28,-123);ctx.lineTo(-14,-100);ctx.lineTo(-25,-68);ctx.moveTo(31,-130);ctx.lineTo(13,-109);ctx.lineTo(26,-75);ctx.stroke();
  ctx.fillStyle=dim>.5?'#81716c':'#e9a45d';ctx.beginPath();ctx.arc(0,-91,18-boss.progress*2+(reduceMotion||dim?0:Math.sin(boss.time*3)*1.5),0,Math.PI*2);ctx.fill();ctx.fillStyle=dim>.5?'#62565a':'#f6d69a';ctx.beginPath();ctx.arc(0,-91,7,0,Math.PI*2);ctx.fill();ctx.restore();return;
 }
 drawSunPulses(ctx,boss.attacks,cameraX,width,{reduceMotion});
 for(const[i,s]of boss.seals.entries()){
  ctx.save();ctx.fillStyle=s.active?'#c5d69b':i===boss.progress?'#e9bf73':'#827b86';ctx.fillRect(s.x,s.y+5,s.width,s.height-5);ctx.strokeStyle='#f5dfab';ctx.lineWidth=2;ctx.strokeRect(s.x,s.y+5,s.width,s.height-5);ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.fillStyle='#f5e4bd';ctx.fillText(s.active?'SEALED':`SEAL ${i+1}`,s.x+s.width/2,s.y-10);
  if(!s.active&&i===boss.progress&&boss.state==='active'&&boss.phaseTime<boss.config.phases[i].minimumTime){ctx.font='10px Arial';ctx.fillText('SURVIVE THE WARNING',s.x+s.width/2,s.y-24);}ctx.restore();
 }
 const g=c.exitGate;ctx.save();ctx.strokeStyle=boss.defeated?'#c6d6a2':'#dfb97c';ctx.lineWidth=3;ctx.strokeRect(g.x,g.y,g.width,g.height);
 if(!boss.defeated){ctx.fillStyle='#524754';ctx.fillRect(g.x,g.y,g.width,g.height);for(let y=g.y+20;y<g.y+g.height;y+=32){ctx.fillStyle='#d8a76a';ctx.fillRect(g.x+7,y,g.width-14,9);}}
 ctx.restore();
}
