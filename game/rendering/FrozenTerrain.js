// Reusable art for static cliffs and the existing dynamic platform renderer.
// Snow is white and matte; traction-bearing ice is distinctly blue and glossy.
export function drawFrozenSurface(ctx,{x,y,width,height,appearance,type}) {
 const ice=appearance==="ice";
 ctx.save();ctx.fillStyle=ice?"#76b9d1":"#879ea9";ctx.fillRect(x,y,width,height);
 ctx.strokeStyle=ice?"#427b96":"#627e8d";ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,width-2,height-2);
 ctx.fillStyle=ice?"#c1f0f4":"#f3f8f5";ctx.fillRect(x,y,width,ice?5:9);
 ctx.fillStyle=ice?"#a2dbe8":"#d0e3e7";ctx.fillRect(x,y+(ice?5:9),width,3);
 ctx.save();ctx.beginPath();ctx.rect(x+2,y+12,width-4,height-14);ctx.clip();
 if(ice){
  ctx.strokeStyle="#9bd5e3";ctx.lineWidth=2;
  for(let offset=20;offset<width;offset+=95){ctx.beginPath();ctx.moveTo(x+offset,y+15);ctx.lineTo(x+offset+38,y+15);ctx.stroke();}
  ctx.strokeStyle="#5a9bb8";ctx.lineWidth=1;
  for(let offset=50;offset<width;offset+=130){ctx.beginPath();ctx.moveTo(x+offset,y+18);ctx.lineTo(x+offset+15,y+45);ctx.lineTo(x+offset+5,y+68);ctx.stroke();}
 }else{
  ctx.fillStyle="#9bb1ba";
  for(let offset=0;offset<width;offset+=140){ctx.beginPath();ctx.moveTo(x+offset,y+18);ctx.lineTo(x+offset+70,y+height*.5);ctx.lineTo(x+offset+30,y+height-5);ctx.lineTo(x+offset+8,y+height*.5);ctx.fill();}
 }ctx.restore();
 if(type==="collapsing"){
  ctx.strokeStyle="#4b8ba5";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x+width*.55,y+2);ctx.lineTo(x+width*.45,y+9);ctx.lineTo(x+width*.57,y+15);ctx.lineTo(x+width*.48,y+height-2);ctx.stroke();
 }
 ctx.restore();
}
