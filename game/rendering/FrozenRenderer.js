import { drawFrozenSurface } from "./FrozenTerrain.js";

export class FrozenRenderer {
 region(cameraX){const x=cameraX+360;return x<4000?"foothills":x<9000?"lake":x<14000?"glacier":x<19000?"blizzard":"overlook";}
 drawBackground(ctx,w,h,cameraX){
  const region=this.region(cameraX);
  ctx.fillStyle={foothills:"#c8dfe5",lake:"#c4e4ee",glacier:"#446b81",blizzard:"#b1c9d5",overlook:"#cae4ee"}[region];ctx.fillRect(0,0,w,h);
  if(region==="glacier"){
   // Large, irregular wall facets and an enclosed ceiling replace outdoor peaks.
   const facets=[[9000,170,330],[9610,225,410],[10340,145,330],[11020,205,400],[11980,125,470],[12620,190,350],[13560,155,400]];
   for(const [i,[worldX,top,size]]of facets.entries()){
    const x=(worldX-cameraX)*.6;if(x+size<0||x>w)continue;
    ctx.fillStyle=i%2?"#547f94":"#4c758d";ctx.beginPath();ctx.moveTo(x,90);ctx.lineTo(x+size*.7,top);ctx.lineTo(x+size,450);ctx.lineTo(x+size*.3,540);ctx.lineTo(x-60,300);ctx.fill();
    ctx.strokeStyle="#7ebbc9";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+size*.3,top+30);ctx.lineTo(x+size*.42,top+100);ctx.lineTo(x+size*.2,top+190);ctx.stroke();
   }
   ctx.fillStyle="#304f66";ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(w,0);ctx.lineTo(w,102);
   for(let x=w;x>=0;x-=135)ctx.lineTo(x,98+Math.sin((x+cameraX*.18)*.009)*5);ctx.closePath();ctx.fill();
   ctx.fillStyle="#90d5dd";ctx.globalAlpha=.1;ctx.fillRect(0,480,w,60);ctx.globalAlpha=1;
   return;
  }
  const peaks=region==="lake"?[[4350,260,440],[6700,290,530],[8550,220,400]]:
   region==="foothills"?[[300,300,380],[1550,260,520],[3250,320,430]]:
   region==="blizzard"?[[14100,240,450],[15500,170,550],[17200,220,540],[18700,190,500]]:
   [[19000,240,510],[20500,175,610],[22200,135,600],[23700,165,550]];
  for(const [i,[worldX,top,width]]of peaks.entries()){
   const x=(worldX-cameraX)*.22+100;if(x+width<0||x>w)continue;
   ctx.fillStyle=region==="blizzard"?"#90a9b7":region==="overlook"?"#91abb8":"#abc5cf";
   ctx.beginPath();ctx.moveTo(x-width*.3,480);ctx.lineTo(x+width*.3,top);ctx.lineTo(x+width,480);ctx.closePath();ctx.fill();
   ctx.fillStyle="#e6f1f1";ctx.beginPath();ctx.moveTo(x+width*.08,top+100);ctx.lineTo(x+width*.3,top);ctx.lineTo(x+width*.53,top+100);ctx.lineTo(x+width*.35,top+75);ctx.lineTo(x+width*.25,top+90);ctx.fill();
  }
  if(region==="lake"){
   ctx.fillStyle="#9ecbd9";ctx.fillRect(0,360,w,180);ctx.fillStyle="#c4e6ea";
   for(const [worldX,width]of [[4230,210],[5210,145],[6480,310],[7670,190],[8560,245]]){const x=(worldX-cameraX)*.4+80;ctx.beginPath();ctx.moveTo(x,400);ctx.lineTo(x+width*.7,386);ctx.lineTo(x+width,402);ctx.lineTo(x+width*.6,414);ctx.closePath();ctx.fill();}
   ctx.strokeStyle="#bce0e8";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,365);ctx.lineTo(w,365);ctx.stroke();
  }else{
   ctx.fillStyle=region==="blizzard"?"#c0d1d6":"#dcebed";ctx.beginPath();ctx.moveTo(0,470);ctx.quadraticCurveTo(w*.28,385,w*.52,465);ctx.quadraticCurveTo(w*.8,395,w,440);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();
  }
  // A distant mist band never obscures foreground landings or warning markers.
  ctx.fillStyle="#edf5f3";ctx.globalAlpha=.15;ctx.fillRect(0,335,w,30);ctx.globalAlpha=1;
 }
 drawPlatforms(ctx,platforms,cameraX,w){for(const p of platforms)if(!p.type&&p.x+p.width>=cameraX&&p.x<=cameraX+w)drawFrozenSurface(ctx,p);}
 drawAtmosphere(ctx,time,cameraX,{reduceMotion=false}={}){
  const region=this.region(cameraX);if(region==="glacier")return;
  const count=region==="blizzard"?28:10;ctx.save();ctx.fillStyle="#f9ffff";ctx.globalAlpha=region==="blizzard"?.6:.45;
  for(let i=0;i<count;i++){
   const t=reduceMotion?0:time, x=((i*173+Math.sin(i)*70-t*(region==="blizzard"?25:8)-cameraX*.06)%960+960)%960;
   const y=100+((i*79+t*17)%390);ctx.fillRect(x,y,i%3===0?3:2,2);
  }ctx.restore();
 }
 drawDecorations(ctx,items,groundY,cameraX,w){
  for(const s of items){const width=s.width??120;if(s.x+width<cameraX||s.x-width>cameraX+w)continue;
   ctx.save();ctx.translate(s.x,s.baseY);ctx.strokeStyle="#7e9ba7";ctx.lineWidth=2;ctx.fillStyle="#8faab5";
   if(s.type==="pine"){
    ctx.scale(s.scale??1,s.scale??1);ctx.fillStyle="#667e7d";ctx.fillRect(-7,-75,14,75);
    for(const [y,span]of[[-145,29],[-105,40],[-65,50]]){
     ctx.fillStyle="#527d78";ctx.beginPath();ctx.moveTo(0,y-45);ctx.lineTo(-span,y+22);ctx.lineTo(span,y+22);ctx.closePath();ctx.fill();
     ctx.fillStyle="#edf6f2";ctx.beginPath();ctx.moveTo(0,y-45);ctx.lineTo(-span*.65,y);ctx.lineTo(-span*.18,y-5);ctx.lineTo(span*.2,y+4);ctx.lineTo(span*.65,y);ctx.closePath();ctx.fill();
    }
   }else if(s.type==="snow-boulder"){
    ctx.fillStyle="#8da5b0";ctx.beginPath();ctx.moveTo(-25,0);ctx.lineTo(-29,-13);ctx.lineTo(-12,-31);ctx.lineTo(15,-29);ctx.lineTo(32,-10);ctx.lineTo(25,0);ctx.closePath();ctx.fill();
    ctx.fillStyle="#edf6f3";ctx.beginPath();ctx.moveTo(-27,-14);ctx.lineTo(-12,-31);ctx.lineTo(15,-29);ctx.lineTo(27,-15);ctx.lineTo(5,-18);ctx.lineTo(-8,-14);ctx.fill();
   }else if(["lake-pool","frozen-stream"].includes(s.type)){
    ctx.fillStyle="#8fc6d5";ctx.globalAlpha=.65;ctx.beginPath();ctx.ellipse(0,0,width/2,14,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#d5edf1";ctx.beginPath();ctx.moveTo(-width*.4,-4);ctx.lineTo(width*.3,-4);ctx.stroke();
   }else if(s.type==="snow-arch"){
    const height=s.baseY-s.top;ctx.globalAlpha=.45;ctx.fillStyle="#9fb8c2";
    ctx.beginPath();ctx.moveTo(-width/2,0);ctx.lineTo(-width/2,-height+28);ctx.quadraticCurveTo(0,-height-15,width/2,-height+28);ctx.lineTo(width/2,0);ctx.lineTo(width/2-35,0);ctx.lineTo(width/2-35,-height+55);ctx.quadraticCurveTo(0,-height+12,-width/2+35,-height+55);ctx.lineTo(-width/2+35,0);ctx.fill();
   }else if(["snow-spire","glacier-mouth","blue-window"].includes(s.type)){
    const height=s.baseY-(s.top??s.baseY-90);ctx.globalAlpha=s.type==="blue-window"?.7:.4;
    ctx.fillStyle=s.type==="blue-window"?"#6eb3c8":"#9ebac8";
    ctx.beginPath();ctx.moveTo(-width/2,0);ctx.lineTo(-width*.42,-height*.7);ctx.lineTo(0,-height);ctx.lineTo(width*.45,-height*.8);ctx.lineTo(width/2,0);ctx.closePath();ctx.fill();
    if(s.type!=="snow-spire"){
     ctx.fillStyle="#365d76";ctx.beginPath();ctx.moveTo(-width*.3,0);ctx.lineTo(-width*.3,-height*.55);ctx.quadraticCurveTo(0,-height*.95,width*.3,-height*.55);ctx.lineTo(width*.3,0);ctx.fill();
     ctx.strokeStyle="#9ee0e7";ctx.beginPath();ctx.moveTo(-width*.38,-height*.48);ctx.lineTo(-width*.3,-height*.67);ctx.lineTo(-width*.15,-height*.73);ctx.stroke();
    }
   }else if(s.type==="ice-spire"){
    ctx.fillStyle="#8cbac9";ctx.beginPath();ctx.moveTo(-width/2,0);ctx.lineTo(-width*.25,-45);ctx.lineTo(0,-58);ctx.lineTo(width*.4,-25);ctx.lineTo(width/2,0);ctx.closePath();ctx.fill();ctx.strokeStyle="#b8e7eb";ctx.beginPath();ctx.moveTo(0,-56);ctx.lineTo(5,-6);ctx.stroke();
   }else if(s.type==="icicle-anchor"){
    ctx.fillStyle="#31556d";ctx.fillRect(-35,-20,70,20);ctx.fillStyle="#84b7cb";ctx.fillRect(-28,-4,56,4);
   }else if(s.type==="lift-frame"){
    const height=s.baseY-s.top;ctx.globalAlpha=.4;ctx.fillRect(-width/2,-height,12,height);ctx.fillRect(width/2-12,-height,12,height);ctx.fillRect(-width/2,-height,width,12);
    ctx.strokeStyle="#daeef0";ctx.setLineDash([4,7]);ctx.beginPath();ctx.moveTo(0,-height);ctx.lineTo(0,-20);ctx.stroke();
   }else if(s.type==="old-ruin"){
    ctx.fillStyle="#a9aaa0";ctx.fillRect(-45,-105,24,105);ctx.fillRect(-45,-105,90,15);ctx.fillStyle="#f1f7f3";ctx.fillRect(-47,-110,95,6);
   }else if(s.type==="cliff-marker"){
    ctx.fillStyle="#7b8e96";ctx.fillRect(-12,-50,24,50);ctx.fillStyle="#edf5f1";ctx.fillRect(-14,-55,28,7);ctx.strokeStyle="#c5d8db";ctx.beginPath();ctx.moveTo(-5,-35);ctx.lineTo(6,-27);ctx.lineTo(-4,-20);ctx.stroke();
   }ctx.restore();
  }
 }
}
