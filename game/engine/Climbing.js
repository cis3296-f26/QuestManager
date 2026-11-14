import { movement } from "./Movement.js";

const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
export function detachClimb(player) {
    player.climbingId=null; player.climbMotion=0;
    player.grounded=false; player.supportPlatform=null; player.velocityY=0;
}
// A key press toggles attachment; held W/S is processed by the shared simulation.
export function toggleClimb(level) {
    const p=level.player;
    if(p.climbingId){detachClimb(p);return true;}
    const walls=[...level.puzzle.barriers,...level.puzzle.gates.filter(g=>!g.open)];
    const candidates=(level.config.climbables??[]).filter(c=>
        Math.abs(p.x+p.width/2-c.x)<=c.attachRadius &&
        p.y+p.height>=c.topFeet && p.y+p.height<=c.bottomFeet &&
        !walls.some(w=>overlap({x:Math.min(p.x,c.x-p.width/2),y:p.y,
            width:p.width+Math.abs(p.x+p.width/2-c.x),height:p.height},w)));
    const c=candidates.sort((a,b)=>Math.abs(p.x+p.width/2-a.x)-Math.abs(p.x+p.width/2-b.x))[0];
    if(!c)return false;
    p.climbingId=c.id;p.velocityX=0;p.velocityY=0;p.iceAirborne=false;
    p.grounded=false;p.supportPlatform=null;return true;
}
export function climbStep(level,vertical,dt) {
    const p=level.player,c=(level.config.climbables??[]).find(c=>c.id===p.climbingId);
    if(!c){if(p.climbingId)detachClimb(p);return false;}
    const dx=c.x-p.width/2-p.x;
    p.x+=Math.sign(dx)*Math.min(Math.abs(dx),220*dt);
    // Ease into alignment rather than snapping sideways on attachment.
    p.climbMotion=Math.abs(dx)<=2?vertical:0;
    p.y=Math.max(c.topFeet-p.height,Math.min(c.bottomFeet-p.height,
        p.y+p.climbMotion*c.speed*dt));
    p.velocityY=0;p.velocityX=0;p.grounded=false;p.supportPlatform=null;
    p.isMoving=false;p.climbPhase=(p.climbPhase??0)+Math.abs(p.climbMotion)*dt*7;
    return true;
}
export function climbVertical(keys){return Number(keys.has("KeyS")||keys.has("ArrowDown"))-Number(keys.has("KeyW")||keys.has("ArrowUp"));}
export function validateClimbables(config){
 const errors=[];
 for(const c of config.climbables??[]){
  if(![c.x,c.topFeet,c.bottomFeet,c.speed,c.attachRadius].every(Number.isFinite)||c.x<16||c.x>config.worldWidth-16||
   c.topFeet<movement.hudBottom+movement.playerHeight+4||c.bottomFeet>movement.viewHeight-4||c.topFeet>=c.bottomFeet||c.speed<=0||c.attachRadius<8||c.attachRadius>32||!['rope','ladder'].includes(c.kind)||!c.purpose)
   errors.push(`Invalid climbable ${c.id}.`);
  if(!config.platforms.some(p=>p.id===c.connection?.from)||!config.platforms.some(p=>p.id===c.connection?.to))errors.push(`Climbable ${c.id} needs landing endpoints.`);
 }
 return errors;
}
