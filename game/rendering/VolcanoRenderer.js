const visible=(p,x,w)=>p.x+(p.width??150)>=x&&p.x-(p.width??150)<=x+w;
export function drawBasalt(ctx,p){
 ctx.fillStyle=p.appearance==='ash-stone'?'#777478':'#514f55';ctx.fillRect(p.x,p.y,p.width,p.height);
 ctx.fillStyle='#aaa18e';ctx.fillRect(p.x,p.y,p.width,7);
 ctx.strokeStyle='#302f38';ctx.lineWidth=2;ctx.strokeRect(p.x+1,p.y+1,p.width-2,p.height-2);
 // Wide vertical joints communicate natural columns. Small ember seams are
 // decorative: the cream-edged deck remains safe until a timed slab collapses.
 for(let x=p.x+36;x<p.x+p.width-15;x+=82){ctx.strokeStyle='#6e6565';ctx.beginPath();ctx.moveTo(x,p.y+12);ctx.lineTo(x-8,p.y+Math.min(p.height-3,55));ctx.lineTo(x+4,p.y+Math.min(p.height-3,105));ctx.stroke();}
 if(p.height>50){ctx.strokeStyle='#ab6747';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x+14,p.y+36);ctx.lineTo(p.x+26,p.y+44);ctx.lineTo(p.x+21,p.y+59);ctx.stroke();}
}
export class VolcanoRenderer {
 region(x){return x<5000?0:x<10500?1:x<16000?2:x<22000?3:4;}
 drawBackground(ctx,w,h,cameraX){
  const r=this.region(cameraX+360),origins=[0,5000,10500,16000,22000];
  ctx.fillStyle=['#aaa2a8','#a58c91','#756775','#94767e','#9e7b87'][r];ctx.fillRect(0,0,w,h);
  if(r===2){
   // Broad, enclosed hexagonal magma chambers, rather than Crystal Cave's roof.
   ctx.fillStyle='#655b6c';
   for(const[x,top,span]of[[10500,150,460],[11250,230,520],[12250,140,440],[13300,200,580],[14400,145,490],[15350,200,430]]){
    const sx=(x-cameraX)*.65;ctx.beginPath();ctx.moveTo(sx,90);ctx.lineTo(sx+span*.55,top);ctx.lineTo(sx+span,460);ctx.lineTo(sx+span*.6,540);ctx.lineTo(sx-80,380);ctx.fill();
   }
   ctx.fillStyle='#4c4659';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(w,0);ctx.lineTo(w,95);for(let x=w;x>=0;x-=120)ctx.lineTo(x,96+Math.sin((cameraX*.1+x)*.02)*5);ctx.closePath();ctx.fill();
   ctx.fillStyle='#c57953';ctx.globalAlpha=.12;ctx.fillRect(0,420,w,120);ctx.globalAlpha=1;
  }else{
   const profiles=[[[0,360],[200,250],[380,310],[610,220],[790,320],[960,360]],[[0,330],[170,260],[330,170],[530,295],[760,240],[960,330]],[[0,0]],[[0,350],[170,210],[350,300],[540,160],[730,260],[960,350]],[[0,380],[210,300],[450,360],[640,285],[820,330],[960,380]]][r];
   for(const layer of[0,1]){const shift=((cameraX-origins[r])*(.12+layer*.08))%960;ctx.fillStyle=layer?'#6d5f70':'#8b7887';ctx.globalAlpha=layer?.5:.75;ctx.beginPath();ctx.moveTo(-100,h);for(let tile=-1;tile<3;tile++)for(const[x,y]of profiles)ctx.lineTo(x-shift+tile*960,y+layer*80);ctx.lineTo(w+100,h);ctx.fill();}ctx.globalAlpha=1;
   ctx.fillStyle='#c0aaac';ctx.globalAlpha=.3;for(const[x,y,span]of[[150,190,150],[720,150,220]]){ctx.beginPath();ctx.ellipse(x-(cameraX*.04%100),y,span/2,17,0,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
  }
  if(r===4){
   // The distant castle grows across this area; it has no gameplay geometry yet.
   const progress=Math.max(0,Math.min(1,(cameraX-22000)/4040)),scale=.7+progress*.4;
   ctx.save();ctx.translate(620-progress*80,465);ctx.scale(scale,scale);ctx.fillStyle='#4f4558';ctx.fillRect(-160,-160,320,160);
   for(const[x,top]of[[-170,-250],[-75,-200],[65,-225],[155,-290]]){ctx.fillRect(x-28,top,56,-top);for(let dx=-28;dx<28;dx+=20)ctx.fillRect(x+dx,top-10,12,12);ctx.fillStyle='#cc8a53';ctx.fillRect(x-5,top+40,10,22);ctx.fillStyle='#4f4558';}
   ctx.fillStyle='#352f43';ctx.beginPath();ctx.moveTo(-40,0);ctx.lineTo(-40,-80);ctx.quadraticCurveTo(0,-135,40,-80);ctx.lineTo(40,0);ctx.fill();ctx.strokeStyle='#b98057';ctx.lineWidth=3;ctx.stroke();ctx.restore();
  }
 }
 drawPlatforms(ctx,ps,cameraX,w){for(const p of ps)if(!p.type&&visible(p,cameraX,w))drawBasalt(ctx,p);}
 drawDecorations(ctx,items,groundY,cameraX,w){for(const s of items){if(!visible(s,cameraX,w))continue;const span=s.width??100,height=s.baseY-(s.top??s.baseY-100);ctx.save();ctx.translate(s.x,s.baseY);ctx.fillStyle='#70636e';ctx.strokeStyle='#8e7a72';ctx.lineWidth=3;
  if(s.type==='lavafall'){ctx.globalAlpha=.22;ctx.fillStyle='#ce8a63';ctx.fillRect(-span/2,-height,span,height);ctx.fillStyle='#e5bd87';ctx.fillRect(-span*.1,-height,span*.2,height);}
  else if(['basalt-arch','broken-arch','vault-shell'].includes(s.type)){
   ctx.globalAlpha=.55;ctx.beginPath();ctx.moveTo(-span/2,0);ctx.lineTo(-span/2,-height+30);ctx.lineTo(-span*.3,-height);ctx.lineTo(span*.3,-height+10);ctx.lineTo(span/2,-height+40);ctx.lineTo(span/2,0);ctx.lineTo(span*.35,0);ctx.lineTo(span*.3,-height+70);ctx.lineTo(-span*.3,-height+65);ctx.lineTo(-span*.35,0);ctx.fill();
  }else if(['climbing-frame','lift-frame','ferry-chain'].includes(s.type)){
   ctx.globalAlpha=.45;ctx.fillRect(-span/2,-height,9,height);ctx.fillRect(span/2-9,-height,9,height);ctx.fillRect(-span/2,-height,span,9);ctx.strokeStyle='#b49d80';ctx.beginPath();ctx.moveTo(-span*.2,-height);ctx.lineTo(-span*.2,-20);ctx.moveTo(span*.2,-height);ctx.lineTo(span*.2,-20);ctx.stroke();
  }else if(s.type==='buttress'){ctx.globalAlpha=.5;ctx.beginPath();ctx.moveTo(-span*.3,0);ctx.lineTo(-span/2,-height+8);ctx.lineTo(span/2,-height+8);ctx.lineTo(span*.3,0);ctx.fill();}
  else if(s.type==='obsidian'){ctx.fillStyle='#514858';ctx.beginPath();ctx.moveTo(-span/2,0);ctx.lineTo(-span*.3,-45);ctx.lineTo(0,-70);ctx.lineTo(span*.3,-55);ctx.lineTo(span/2,0);ctx.fill();ctx.strokeStyle='#a97660';ctx.beginPath();ctx.moveTo(0,-60);ctx.lineTo(-5,-20);ctx.stroke();}
  else if(s.type==='vent-marker'){ctx.fillStyle='#b8aa8e';ctx.fillRect(-11,-38,22,34);ctx.fillStyle='#514d4b';ctx.font='bold 22px Arial';ctx.textAlign='center';ctx.fillText('!',0,-12);}
  else if(s.type==='refuge'){ctx.fillStyle='#d1b88b';ctx.fillRect(-28,-65,56,6);ctx.fillStyle='#756158';ctx.fillRect(-25,-59,7,59);ctx.fillRect(18,-59,7,59);}
  else if(['dark-tower','castle-pier'].includes(s.type)){ctx.globalAlpha=.5;ctx.fillStyle='#574b5d';ctx.fillRect(-span/2,-height,span,height);ctx.fillStyle='#7b6a76';ctx.fillRect(-span/2-3,-height,span+6,8);ctx.fillStyle='#ca8b52';ctx.fillRect(-6,-height+30,12,25);}
  else if(s.type==='broken-masonry'){ctx.globalAlpha=.6;ctx.fillRect(-span/2,-height,24,height);ctx.fillRect(-span/2,-height,span,16);ctx.fillRect(span/2-24,-height+50,24,height-50);}
  else if(s.type==='old-stone'){ctx.fillStyle='#918f8b';ctx.fillRect(-span/2,-20,span,20);}
  else if(s.type==='smoke-vent'){ctx.fillStyle='#6d616d';ctx.globalAlpha=.35;for(const[x,y,r]of[[-10,-25,14],[4,-50,20],[-5,-80,25]]){ctx.beginPath();ctx.ellipse(x,y,r,r*.6,0,0,Math.PI*2);ctx.fill();}}
  ctx.restore();
 }}
}
export function drawVolcanoHazards(ctx,level,cameraX,w,{reduceMotion=false,poolsOnly=false}={}){
 const t=reduceMotion?0:level.wind.time;
 if(poolsOnly){ctx.save();ctx.fillStyle='#dfc6b0';ctx.globalAlpha=.25;for(let i=0;i<10;i++){const x=cameraX+((i*113+20-t*9)%960+960)%960,y=110+((i*57+t*6)%330);ctx.fillRect(x,y,2,2);}ctx.restore();for(const h of level.config.hazards??[]){if(h.type!=='lava'||!visible(h,cameraX,w))continue;
  ctx.fillStyle='#c75938';ctx.fillRect(h.x,h.y,h.width,h.height);ctx.fillStyle='#ed9947';ctx.fillRect(h.x,h.y,h.width,10);ctx.fillStyle='#f6cd73';ctx.fillRect(h.x,h.y,h.width,3);
  // Ripples stay inside the exact damage rectangle.
  for(let x=h.x+10;x<h.x+h.width-20;x+=48){ctx.fillRect(x,h.y+16+Math.sin(t*2+x*.01)*2,18,2);}ctx.strokeStyle='#873e35';ctx.lineWidth=2;ctx.strokeRect(h.x+1,h.y+1,h.width-2,h.height-2);
 }return;}
 for(const g of level.geysers){const c=g.config;if(!visible(c,cameraX,w))continue;const base=c.y+c.height;
  ctx.save();ctx.fillStyle='#302d37';ctx.fillRect(c.x-5,base-4,c.width+10,5);
  if(g.state==='eruption'){
   ctx.fillStyle='#e77a3e';ctx.fillRect(c.x,c.y,c.width,c.height);ctx.strokeStyle='#f7cf7d';ctx.lineWidth=2;ctx.strokeRect(c.x+1,c.y+1,c.width-2,c.height-2);ctx.fillStyle='#f4b65b';ctx.fillRect(c.x+c.width*.3,c.y+2,c.width*.4,c.height-4);
   if(!reduceMotion){ctx.fillStyle='#ffc668';for(let j=0;j<3;j++)ctx.fillRect(c.x+8+j*15,c.y+8+((t*100+j*79)%Math.max(1,c.height-20)),7,9);}
  }else if(g.state==='warning'){
   // Shape, label and full column outline survive Reduce Motion and low vision.
   ctx.strokeStyle='#f8d48c';ctx.setLineDash([5,5]);ctx.strokeRect(c.x,c.y,c.width,c.height);ctx.setLineDash([]);ctx.fillStyle='#faedca';ctx.fillRect(c.x-10,c.y+c.height*.4-20,c.width+20,36);ctx.fillStyle='#653f37';ctx.textAlign='center';ctx.font='bold 15px Arial';ctx.fillText('!',c.x+c.width/2,c.y+c.height*.4-5);ctx.font='11px Arial';ctx.fillText(g.phase.remaining.toFixed(1)+'s',c.x+c.width/2,c.y+c.height*.4+9);
   ctx.fillStyle='#f6cd73';for(const dx of[8,c.width/2,c.width-8]){ctx.beginPath();ctx.arc(c.x+dx,base-9-(reduceMotion?0:Math.sin(t*8+dx)*3),4,0,Math.PI*2);ctx.fill();}
  }else if(g.state==='recovery'){ctx.fillStyle='#cfb1a2';ctx.globalAlpha=.5*(1-g.phase.progress);ctx.fillRect(c.x+8,base-25,c.width-16,22);}
  else{ctx.fillStyle='#b28b6a';ctx.font='10px Arial';ctx.textAlign='center';ctx.fillText('VENT',c.x+c.width/2,base-10);}
  ctx.restore();
 }
}
export function drawCheckpoints(ctx,level,cameraX,w){for(const[i,c]of(level.config.checkpoints??[]).entries()){
 if(c.x+50<cameraX||c.x>cameraX+w)continue;ctx.save();ctx.fillStyle='#756158';ctx.fillRect(c.x+14,c.feetY-54,5,54);ctx.fillStyle=i<=level.checkpointIndex?'#c3d295':'#ead7ac';ctx.beginPath();ctx.moveTo(c.x+19,c.feetY-53);ctx.lineTo(c.x+45,c.feetY-44);ctx.lineTo(c.x+19,c.feetY-34);ctx.fill();ctx.font='10px Arial';ctx.textAlign='center';ctx.fillStyle='#faf0d5';ctx.fillText('REFUGE',c.x+18,c.feetY-66);ctx.restore();
}}
