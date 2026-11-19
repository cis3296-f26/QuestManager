// Rendering never advances clocks. Reduced motion preserves words, color and
// the full beam silhouette; only cosmetic shimmer is suppressed.
export function drawSunPulses(ctx,traps,cameraX,width,{reduceMotion=false}={}) {
 for(const trap of traps) {
  const c=trap.config;if(c.x+c.width<cameraX||c.x>cameraX+width)continue;
  const {state,remaining,progress}=trap.phase;
  const active=state==="active",charging=state==="charging";
  ctx.save();
  ctx.fillStyle=active?"#f5c657":charging?"#d5913f":"#6e675c";
  ctx.globalAlpha=active?.85:charging?.18:.06;ctx.fillRect(c.x,c.y,c.width,c.height);ctx.globalAlpha=1;
  ctx.strokeStyle=active?"#fff1aa":charging?"#efbd64":"#94836a";ctx.lineWidth=active?2:1;
  ctx.setLineDash(active?[]:[3,5]);ctx.strokeRect(c.x,c.y,c.width,c.height);ctx.setLineDash([]);
  if(active) {ctx.globalAlpha=reduceMotion?.9:.75+Math.sin(trap.time*25)*.15;ctx.fillStyle="#fff3b0";
   if(c.width<c.height)ctx.fillRect(c.x+c.width*.35,c.y,c.width*.3,c.height);
   else ctx.fillRect(c.x,c.y+c.height*.35,c.width,c.height*.3);ctx.globalAlpha=1;}
  const vertical=c.direction==="down"||c.direction==="up";
  const ex=vertical?c.x+c.width/2:c.direction==="right"?c.x:c.x+c.width;
  const ey=vertical?(c.direction==="down"?c.y:c.y+c.height):c.y+c.height/2;
  ctx.fillStyle="#68543b";ctx.fillRect(ex-10,ey-9,20,18);ctx.strokeStyle="#d9bf8b";ctx.strokeRect(ex-10,ey-9,20,18);
  ctx.fillStyle=active?"#fff1aa":charging?"#efbd64":"#a89776";ctx.beginPath();ctx.arc(ex,ey,5,0,Math.PI*2);ctx.fill();
  ctx.font="bold 10px Arial";ctx.textAlign="center";
  const labelY=Math.max(100,ey-16);ctx.fillStyle="#352b23";
  const label=active?"PULSE":charging?`CHARGING ${remaining.toFixed(1)}s`:"DARK · SAFE";
  const textWidth=ctx.measureText(label).width+10;ctx.fillRect(ex-textWidth/2,labelY-10,textWidth,14);
  ctx.fillStyle=charging||active?"#fff0ae":"#e0d2b9";ctx.fillText(label,ex,labelY);
  if(charging){ctx.fillStyle="#f2c267";ctx.fillRect(ex-18,ey+13,36*progress,3);}
  ctx.restore();
 }
}
