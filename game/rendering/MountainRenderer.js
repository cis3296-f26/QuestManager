// Mountain artwork is native canvas geometry. Dark cliff bodies support light,
// outlined walkable edges; pale distant walls never imply collision surfaces.
export class MountainRenderer {
 region(x){return x<4500?0:x<9500?1:x<14500?2:x<20000?3:4;}
 drawBackground(ctx,w,h,cameraX){
  const region=this.region(cameraX+360),sky=['#c2e2ed','#bbdce9','#b6d6e8','#a5bdcf','#d2e1eb'][region];
  ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
  // Region-specific silhouettes, not a single repeated mountain pattern.
  const profiles=[[[0,350],[180,260],[340,335],[530,225],[740,315],[960,250]],[[0,260],[200,150],[390,330],[560,210],[740,280],[960,170]],[[0,340],[150,230],[350,295],[530,125],[720,250],[960,190]],[[0,300],[180,205],[340,260],[540,170],[710,300],[960,210]],[[0,380],[210,310],[420,370],[620,280],[800,345],[960,300]]];
  for(const layer of [0,1]){
   ctx.fillStyle=layer?'#9baeb5':'#b3c2cc';ctx.globalAlpha=layer?.45:.8;
   ctx.beginPath();ctx.moveTo(-100,h);
   const origin=[0,4500,9500,14500,20000][region],shift=((cameraX-origin)*(.12+layer*.08))%960;
   for(let tile=-1;tile<3;tile++)for(const [x,y]of profiles[region])ctx.lineTo(x-shift+tile*960,(x===960?profiles[region][0][1]:y)+layer*90);
   ctx.lineTo(w+100,h);ctx.fill();
  }ctx.globalAlpha=1;
  // Clouds are highest/most prominent near the summit, behind every landing.
  ctx.fillStyle='#edf0ed';ctx.globalAlpha=.55;
  const clouds=region===4?[[120,210,180],[500,390,280],[830,150,180]]:region===3?[[160,180,150],[740,330,210]]:[[250,185,150],[780,240,190]];
  for(const [x,y,size]of clouds){ctx.beginPath();ctx.ellipse(x-Math.sin(cameraX*.0003)*25,y,size/2,16,0,0,Math.PI*2);ctx.ellipse(x+size*.15,y-10,size*.23,21,0,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;
  if(region===4){
   // Only a distant landmark: Level 9 has no gameplay here.
   ctx.fillStyle='#69636d';ctx.beginPath();ctx.moveTo(680,400);ctx.lineTo(805,226);ctx.lineTo(827,238);ctx.lineTo(852,226);ctx.lineTo(980,400);ctx.fill();
   ctx.strokeStyle='#d39c72';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(807,232);ctx.lineTo(827,242);ctx.lineTo(851,232);ctx.stroke();
   ctx.strokeStyle='#a6a1ab';ctx.lineWidth=12;ctx.globalAlpha=.4;ctx.beginPath();ctx.moveTo(830,223);ctx.bezierCurveTo(805,190,865,185,840,156);ctx.stroke();ctx.globalAlpha=1;
  }
 }
 drawPlatforms(ctx,platforms,cameraX,w){for(const p of platforms){if(p.type||p.x+p.width<cameraX||p.x>cameraX+w)continue;
  if(p.appearance==='rope-bridge'){drawBridgeDeck(ctx,p);continue;}
  drawMountainSurface(ctx,p);
 }}
 drawDecorations(ctx,items,groundY,cameraX,w){
  for(const s of items){const width=s.width??100;if(s.x+width<cameraX||s.x-width>cameraX+w)continue;
   ctx.save();ctx.translate(s.x,s.baseY);ctx.lineWidth=3;ctx.strokeStyle='#75624c';ctx.fillStyle='#8c9696';
   if(s.type==='buttress'){
    const height=s.baseY-s.top;ctx.globalAlpha=.55;ctx.fillStyle='#7d8b90';ctx.beginPath();ctx.moveTo(-width*.35,0);ctx.lineTo(-width*.5,-height+8);ctx.lineTo(width*.5,-height+8);ctx.lineTo(width*.3,0);ctx.closePath();ctx.fill();ctx.strokeStyle='#a7afaa';ctx.beginPath();ctx.moveTo(-width*.2,-height+35);ctx.lineTo(width*.05,-height*.4);ctx.lineTo(-width*.1,-8);ctx.stroke();
   }else if(s.type==='cliff-arch'){
    const height=s.baseY-s.top;ctx.globalAlpha=.6;ctx.beginPath();ctx.moveTo(-width/2,0);ctx.lineTo(-width/2,-height+30);ctx.lineTo(-width*.25,-height);ctx.lineTo(width*.3,-height+12);ctx.lineTo(width/2,-height+50);ctx.lineTo(width/2,0);ctx.lineTo(width*.34,0);ctx.lineTo(width*.3,-height+65);ctx.lineTo(-width*.26,-height+55);ctx.lineTo(-width*.32,0);ctx.fill();
   }else if(s.type==='pine'){
    ctx.scale(s.scale??1,s.scale??1);ctx.fillStyle='#7a6d50';ctx.fillRect(-7,-100,14,100);ctx.fillStyle='#66846d';
    for(const[y,span]of[[-155,35],[-115,46],[-75,55]]){ctx.beginPath();ctx.moveTo(0,y-35);ctx.lineTo(-span,y+35);ctx.lineTo(span,y+35);ctx.fill();}
   }else if(s.type==='snow-cap'){ctx.fillStyle='#e9eeee';ctx.beginPath();ctx.ellipse(0,-4,width/2,8,0,0,Math.PI*2);ctx.fill();
   }else if(s.type==='waterfall'){ctx.fillStyle='#86b5c5';ctx.globalAlpha=.55;ctx.fillRect(-width/2,s.top-s.baseY,width,s.baseY-s.top);ctx.fillStyle='#c4dde0';ctx.fillRect(-width*.2,s.top-s.baseY,width*.2,s.baseY-s.top);
   }else if(s.type==='bridge'){
    // Railings connect the real banks. Collapsing plank physics remain separate.
    ctx.strokeStyle='#8a7457';ctx.lineWidth=3;for(const y of[-28,-13]){ctx.beginPath();ctx.moveTo(-width/2,y);ctx.quadraticCurveTo(0,y+10,width/2,y);ctx.stroke();}
    for(const x of[-width/2,width/2]){ctx.fillStyle='#786044';ctx.fillRect(x-4,-36,8,36);}
   }else if(['climbing-frame','lift-frame'].includes(s.type)){
    const height=s.baseY-s.top;ctx.globalAlpha=.55;ctx.fillStyle='#8b7b65';ctx.fillRect(-width/2,-height,9,height);ctx.fillRect(width/2-9,-height,9,height);ctx.fillRect(-width/2,-height,width,10);
    ctx.beginPath();ctx.moveTo(-width/2,-height+55);ctx.lineTo(width/2,-height+10);ctx.stroke();
   }else if(s.type==='rock-anchor'){ctx.fillStyle='#727c85';ctx.beginPath();ctx.moveTo(-width/2,-25);ctx.lineTo(width/2,-25);ctx.lineTo(width*.4,0);ctx.lineTo(-width*.3,-4);ctx.fill();
   }else if(s.type==='cairn'){for(const[y,size]of[[0,40],[-12,30],[-25,20]]){ctx.fillStyle='#9b9e95';ctx.beginPath();ctx.ellipse(0,y,size/2,8,0,0,Math.PI*2);ctx.fill();}
   }else if(s.type==='trail-marker'){ctx.fillStyle='#8a7557';ctx.fillRect(-3,-35,6,35);ctx.fillStyle='#d5c3a0';ctx.fillRect(-18,-35,32,12);ctx.strokeStyle='#5b624c';ctx.beginPath();ctx.moveTo(4,-29);ctx.lineTo(-9,-29);ctx.lineTo(-4,-33);ctx.stroke();}
   ctx.restore();
  }
 }
}
export function drawMountainSurface(ctx,p){
 ctx.fillStyle='#888b87';ctx.fillRect(p.x,p.y,p.width,p.height);
 ctx.fillStyle='#b5a88c';ctx.fillRect(p.x,p.y,p.width,7);
 ctx.strokeStyle='#626d70';ctx.lineWidth=2;ctx.strokeRect(p.x+1,p.y+1,p.width-2,p.height-2);
 // Large staggered facets, not noisy per-pixel texture.
 ctx.strokeStyle='#9da19a';ctx.lineWidth=2;
 for(let x=p.x+35;x<p.x+p.width-15;x+=95){ctx.beginPath();ctx.moveTo(x,p.y+15);ctx.lineTo(x+13,p.y+Math.min(p.height-3,48));ctx.lineTo(x-3,p.y+Math.min(p.height-2,76));ctx.stroke();}
 if(p.terrain){ctx.fillStyle='#718665';for(let x=p.x+14;x<p.x+p.width-25;x+=170)ctx.fillRect(x,p.y-2,25,4);}
}
export function drawBridgeDeck(ctx,p){
 ctx.fillStyle='#ab8a5e';ctx.fillRect(p.x,p.y,p.width,p.height);ctx.strokeStyle='#6d604b';ctx.lineWidth=2;ctx.strokeRect(p.x+1,p.y+1,p.width-2,p.height-2);
 for(let x=p.x+16;x<p.x+p.width;x+=20){ctx.beginPath();ctx.moveTo(x,p.y+2);ctx.lineTo(x,p.y+p.height-2);ctx.stroke();}
}
export function drawClimbables(ctx,level,cameraX,w,{reduceMotion=false}={}){
 for(const c of level.config.climbables??[]){if(c.x+30<cameraX||c.x-30>cameraX+w)continue;
  ctx.save();const top=c.topFeet-42,bottom=c.bottomFeet-20;
  ctx.strokeStyle='#70553b';ctx.lineWidth=c.kind==='ladder'?4:5;ctx.lineCap='round';
  const sway=!reduceMotion&&level.player.climbingId===c.id?Math.sin(level.player.climbPhase)*1.3:0;
  for(const dx of c.kind==='ladder'?[-13,13]:[0]){ctx.beginPath();ctx.moveTo(c.x+dx,top);ctx.lineTo(c.x+dx+sway,bottom);ctx.stroke();}
  ctx.strokeStyle='#d2ba89';ctx.lineWidth=3;
  for(let y=top+14;y<bottom;y+=18){ctx.beginPath();ctx.moveTo(c.x+(c.kind==='ladder'?-13:-3),y);ctx.lineTo(c.x+(c.kind==='ladder'?13:3),y);ctx.stroke();}
  ctx.fillStyle='#555e5c';ctx.fillRect(c.x-20,top-5,40,8);
  if(Math.abs(level.player.x+16-c.x)<75&&Math.abs(level.player.y+64-c.bottomFeet)<85){ctx.fillStyle='#faf0d6';ctx.fillRect(c.x-22,bottom-50,44,18);ctx.fillStyle='#494b3d';ctx.font='bold 10px Arial';ctx.textAlign='center';ctx.fillText('E · ↕',c.x,bottom-37);}
  ctx.restore();
 }
}
