// Architectural depth uses muted background walls. Only outlined platform tops
// and gold/teal mechanisms promise contact; pale wall brackets are scenery.
export class TempleRenderer {
 drawBackground(ctx,w,h,cameraX) {
  const region=cameraX<8500?"court":cameraX<13600?"hall":cameraX<18500?"buried":"summit";
  const indoor=region==="hall"||region==="buried";
  ctx.fillStyle=region==="buried"?"#47423e":region==="hall"?"#756754":region==="summit"?"#b8d9df":"#dfcba1";
  ctx.fillRect(0,0,w,h);
  if(!indoor){
   ctx.fillStyle="#f6e5ac";ctx.beginPath();ctx.arc(w*.8,155,29,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=region==="summit"?"#b8bdba":"#c1ac84";
   ctx.beginPath();ctx.moveTo(0,h);for(let x=-200;x<=w+250;x+=230){const sx=x-(cameraX*.08)%230;ctx.lineTo(sx,region==="summit"?350:390);ctx.lineTo(sx+100,region==="summit"?245:335);}ctx.lineTo(w,h);ctx.fill();
   if(region==="summit"&&cameraX>21600){ctx.fillStyle="#e5edf0";ctx.beginPath();ctx.moveTo(w*.55,350);ctx.lineTo(w*.78,205);ctx.lineTo(w,350);ctx.fill();ctx.fillStyle="#c2ced1";ctx.beginPath();ctx.moveTo(w*.7,260);ctx.lineTo(w*.78,205);ctx.lineTo(w*.86,260);ctx.lineTo(w*.79,245);ctx.fill();}
  } else {
   ctx.strokeStyle=region==="buried"?"#575049":"#83735b";ctx.lineWidth=2;
   for(let y=125;y<h;y+=85) {ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  }
  const landmarks=region==="buried"?[14380,15500,16380,18480]:region==="hall"?[9410,10050,11200,12580,13780]:region==="summit"?[19300,20090,21450,22720]:[270,1550,3030,4300,5580,6800,8500];
  ctx.save();ctx.translate(-cameraX*.35,0);
  for(const [index,x] of landmarks.entries()) {
   const wx=x*.35;if(wx+220<cameraX*.35||wx>cameraX*.35+w)continue;
   if(region==="hall") {
    // High clerestory windows and broad shafts distinguish this timing hall.
    ctx.fillStyle="#9e8965";ctx.fillRect(wx,140,100,290);
    ctx.fillStyle="#c6ad78";ctx.fillRect(wx+15,160,70,220);
    ctx.fillStyle="#f6df9d";ctx.globalAlpha=.15;
    ctx.beginPath();ctx.moveTo(wx+15,160);ctx.lineTo(wx+85,160);ctx.lineTo(wx+210,460);ctx.lineTo(wx-40,460);ctx.fill();ctx.globalAlpha=1;
   }else if(region==="buried") {
    // Underground rooms have dark arch recesses, narrow cracks and muted runes,
    // rather than repeating the hall's bright outdoor windows.
    ctx.fillStyle="#3e3b37";ctx.beginPath();ctx.moveTo(wx-20,470);ctx.lineTo(wx-20,235);
    ctx.quadraticCurveTo(wx+70,155,wx+160,235);ctx.lineTo(wx+160,470);ctx.fill();
    ctx.strokeStyle="#655d4f";ctx.lineWidth=3;ctx.stroke();
    ctx.fillStyle="#a8956d";ctx.fillRect(wx+35,120,40,10);
    ctx.fillStyle="#d1b77e";ctx.globalAlpha=.08;
    ctx.beginPath();ctx.moveTo(wx+35,130);ctx.lineTo(wx+75,130);ctx.lineTo(wx+115,330);ctx.lineTo(wx+15,330);ctx.fill();ctx.globalAlpha=1;
    ctx.strokeStyle="#79998c";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(wx+55,240);ctx.lineTo(wx+67,255);ctx.lineTo(wx+55,270);ctx.lineTo(wx+43,255);ctx.closePath();ctx.stroke();
    ctx.fillStyle="#657e76";for(const [dx,dy]of[[5,415],[24,400],[40,420]]){ctx.beginPath();ctx.moveTo(wx+dx,450);ctx.lineTo(wx+dx+6,dy);ctx.lineTo(wx+dx+13,450);ctx.fill();}
   }else {
    // Low, broken silhouettes leave the outdoor skyline open and emphasize
    // the foreground's real columns, terraces and lift architecture.
    ctx.fillStyle=region==="summit"?"#a7b2aa":"#c3ac82";
    const top=region==="summit"?340-index%2*25:280+index%3*30;
    ctx.fillRect(wx,top,25,500-top);ctx.fillRect(wx+145,top+45,22,455-top);
    ctx.fillRect(wx-8,top,80,14);ctx.fillRect(wx+138,top+45,36,12);
    if(index%2===0)ctx.fillRect(wx+25,top+25,60,12);
   }
  }ctx.restore();
 }
 // Overlay stone joints on the shared sandstone rectangles. This is visual
 // dressing only; physics still uses the exact existing platform geometry.
 drawMasonry(ctx,platforms,cameraX,w) {
  ctx.save();ctx.strokeStyle="#9b7654";ctx.lineWidth=1;
  for(const p of platforms){if(p.type||p.x+p.width<cameraX||p.x>cameraX+w)continue;
   ctx.save();ctx.beginPath();ctx.rect(p.x,p.y+10,p.width,p.height-10);ctx.clip();
   for(let row=0;row*30<p.height;row++){
    const offset=row%2?45:0;
    const first=Math.max(0,Math.floor((cameraX-p.x-offset)/90));
    for(let col=first;col*90+offset<p.width&&p.x+col*90+offset<cameraX+w;col++){
     const x=p.x+col*90+offset;if(x<=p.x+4)continue;
     ctx.beginPath();ctx.moveTo(x,p.y+row*30);ctx.lineTo(x,p.y+row*30+27);ctx.stroke();
    }
   }ctx.restore();
  }ctx.restore();
 }
 drawDecorations(ctx,items,groundY,cameraX,w) {
  for(const s of items){const span=s.width??160;if(s.x+span<cameraX||s.x-span>cameraX+w)continue;
   ctx.save();ctx.translate(s.x,s.baseY);ctx.strokeStyle="#8c7655";ctx.fillStyle="#b9a17a";ctx.lineWidth=2;
   if(s.type==="sun-relief"){
    ctx.strokeStyle="#b39b6b";ctx.fillStyle="#bda474";ctx.beginPath();ctx.arc(0,0,26,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(0,0,12,0,Math.PI*2);ctx.fill();
    for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*17,Math.sin(a)*17);ctx.lineTo(Math.cos(a)*23,Math.sin(a)*23);ctx.stroke();}
   }else if(s.type==="broken-arch"){
    const height=s.baseY-s.top;ctx.globalAlpha=.5;
    ctx.fillRect(-span/2, -height,22,height);ctx.fillRect(span/2-22,-height*.8,22,height*.8);
    ctx.fillRect(-span/2,-height,span*.62,22);ctx.strokeRect(-span/2,-height,span*.62,22);
    for(let y=-height+30;y<0;y+=36){ctx.beginPath();ctx.moveTo(-span/2,y);ctx.lineTo(-span/2+22,y);ctx.stroke();}
   }else if(s.type==="balcony-bracket"){
    ctx.globalAlpha=.38;ctx.beginPath();ctx.moveTo(-10,24);ctx.lineTo(span,24);ctx.lineTo(span*.65,75);ctx.lineTo(20,75);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillRect(20,75,14,120);ctx.fillRect(span*.65-14,75,14,120);
   }else if(s.type==="lift-frame"){
    ctx.globalAlpha=.45;const top=s.top-s.baseY;ctx.fillRect(-80,top,12,-top);ctx.fillRect(80,top,12,-top);ctx.fillRect(-80,top,172,14);ctx.strokeStyle="#d3b675";ctx.setLineDash([5,8]);ctx.beginPath();ctx.moveTo(0,top);ctx.lineTo(0,-20);ctx.stroke();
   }else if(s.type==="pottery"){
    ctx.fillStyle="#ae7650";ctx.beginPath();ctx.moveTo(-8,-20);ctx.lineTo(8,-20);ctx.lineTo(13,-6);ctx.lineTo(8,0);ctx.lineTo(-9,0);ctx.lineTo(-13,-7);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(-3,-10);ctx.lineTo(3,-5);ctx.stroke();
   }else if(s.type==="statue"){
    ctx.fillStyle="#948469";ctx.fillRect(-19,-8,38,8);ctx.fillRect(-12,-48,24,40);ctx.fillRect(-17,-66,34,20);ctx.fillStyle="#5c584e";ctx.fillRect(-8,-60,4,4);ctx.fillRect(5,-60,4,4);ctx.fillStyle="#d5b675";ctx.beginPath();ctx.arc(0,-31,6,0,Math.PI*2);ctx.fill();
   }else if(s.type==="fallen-pillar"){
    ctx.globalAlpha=.6;ctx.fillRect(-span/2,-24,span,24);for(let x=-span/2+20;x<span/2;x+=32){ctx.beginPath();ctx.moveTo(x,-24);ctx.lineTo(x-6,0);ctx.stroke();}
   }else if(s.type==="sand-drift"){
    ctx.fillStyle="#bca375";ctx.beginPath();ctx.moveTo(-span/2,0);ctx.quadraticCurveTo(0,-18,span/2,0);ctx.fill();
   }else if(s.type==="cistern"){
    ctx.globalAlpha=.5;ctx.fillStyle="#7d9a8d";ctx.fillRect(-span/2,-12,span,25);ctx.strokeStyle="#b0c4ac";ctx.beginPath();ctx.moveTo(-span/2,-12);ctx.lineTo(span/2,-12);ctx.stroke();
   }ctx.restore();
  }
 }
}
