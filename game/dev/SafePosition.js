import { movement } from "../engine/Movement.js";
const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;

// Prefer stable surfaces near the requested point. Never land on a moving/cracked
// surface, in a sealed gate, or within an enemy's entire current patrol envelope.
export function safePosition(level, target) {
    const {player,config}=level, candidates=[];
    const dangers=[...(config.sunPulseTraps??[]),...level.puzzle.barriers,...(config.hazards??[]),...level.puzzle.gates.filter(g=>!g.open),
        ...level.enemies.filter(e=>e.active).map(e=>({x:e.minX-24,y:e.feetY-e.height-8,
            width:e.maxX-e.minX+e.width+48,height:e.height+16})),
        ...level.stalactites.filter(r=>["warning","falling"].includes(r.state)).map(r=>r.config.trigger)];
    for(const surface of level.platforms.filter(p=>!p.type&&p.solid!==false)) {
        if(surface.width<player.width||surface.y-player.height<movement.hudBottom+4)continue;
        const closest=Math.max(surface.x,Math.min(surface.x+surface.width-player.width,target.x-player.width/2));
        const xs=new Set([closest,surface.x,surface.x+surface.width-player.width]);
        for(let offset=40;offset<surface.width;offset+=40)for(const sign of [-1,1])xs.add(Math.max(surface.x,Math.min(surface.x+surface.width-player.width,closest+sign*offset)));
        for(const x of xs) {
            const box={x,y:surface.y-player.height,width:player.width,height:player.height};
            if(level.platforms.some(p=>p.solid!==false&&overlaps(box,p))||dangers.some(d=>overlaps(box,d)))continue;
            candidates.push({x,feetY:surface.y,surface,distance:(x+player.width/2-target.x)**2+(surface.y-target.feetY)**2});
        }
    }
    return candidates.sort((a,b)=>a.distance-b.distance)[0]??null;
}

export function placeSafely(level,target) {
    const position=safePosition(level,target);
    if(!position)return false;
    level.player.reset(position);
    level.player.supportPlatform=position.surface;
    return true;
}

// UI lists derive solely from authored configuration, never from panel coordinates.
export function locationsFor(config) {
    const locations=[{id:"start",label:"Level Start",target:{x:config.spawn.x+16,feetY:config.spawn.feetY}}];
    config.coins.forEach((coin,i)=>locations.push({id:coin.id,label:`Coin ${i+1}`,target:{x:coin.x,feetY:coin.y+30}}));
    for(const area of config.explorationAreas??[])locations.push({id:area.id,label:`Secret Entrance: ${area.title}`,
        target:{x:area.entrance.x+area.entrance.width/2,feetY:area.entrance.y+area.entrance.height}});
    for(const location of config.developerLocations??[])locations.push({id:location.id,label:location.label,target:{x:location.x,feetY:location.feetY}});
    const challenge=config.stages?.at(-2);
    if(challenge)locations.push({id:"challenge",label:`Final Challenge: ${challenge.title}`,target:{x:challenge.start+32,feetY:config.groundY}});
    if(config.finish)locations.push({id:"finish",label:"Finish Flag",target:{x:config.finish.platform.x+config.finish.platform.width-config.finish.flagInset-50,feetY:config.finish.platform.y}});
    return locations;
}
