// Render-only instrumentation in world space. Circular coin pickup geometry uses
// the same animated center/radius as collection, not a misleading square outline.
export function drawDebug(ctx,level,coins,cameraX) {
    ctx.save();ctx.translate(-cameraX,0);ctx.lineWidth=1.5;ctx.setLineDash([]);
    const rect=(box,color)=>{ctx.strokeStyle=color;ctx.strokeRect(box.x,box.y,box.width,box.height);};
    rect(level.player,"#ffffff");
    level.platforms.filter(p=>p.solid!==false).forEach(p=>rect(p,p.type==="moving"?"#63e8ff":p.type==="collapsing"?"#ffae54":"#9bea82"));
    level.enemies.filter(e=>e.active).forEach(e=>rect({x:e.x,y:e.feetY-e.height,width:e.width,height:e.height},"#ff759a"));
    (level.config.hazards??[]).forEach(h=>rect(h,"#ff6b61"));
    level.stalactites.forEach(r=>{if(r.state!=="spent")rect(r,"#ff6b61");ctx.setLineDash([4,3]);rect(r.config.trigger,"#bcb1ff");ctx.setLineDash([]);});
    for(const trap of level.sunPulses){rect(trap.config,trap.state==="active"?"#ff6b61":trap.state==="charging"?"#ffe573":"#b5c8c3");ctx.fillStyle="#fff4c5";ctx.font="11px Arial";ctx.fillText(`${trap.config.id} · ${trap.state} ${trap.phase.remaining.toFixed(1)}s`,trap.config.x+28,trap.config.y+15);}
    level.puzzle.barriers.forEach(b=>rect(b,"#cfbda6"));
    for(const zone of level.wind.zones){ctx.setLineDash([6,4]);rect(zone,"#dfc475");ctx.setLineDash([]);}
    level.puzzle.switches.forEach(s=>rect(s,"#76e0d3"));
    level.puzzle.gates.forEach(g=>{ctx.setLineDash(g.open?[3,3]:[]);rect(g,"#76e0d3");ctx.setLineDash([]);});
    for(const c of coins.coins)if(!coins.pending.has(c.id)) {
        ctx.strokeStyle="#ffe573";ctx.beginPath();ctx.arc(c.x,c.centerY(coins.time),c.radius,0,Math.PI*2);ctx.stroke();
    }
    // Normal completion requires feet exactly on the flag's support. Outline the
    // flag contact line and its support, rather than implying a broad auto-finish.
    rect({x:level.flagX,y:level.config.finish.platform.y-60,width:4,height:60},"#fff2bb");
    ctx.restore();
}
export function drawDeveloperIndicator(ctx,assisted,enabled) {
    if(!assisted&&!enabled)return;
    ctx.save();ctx.fillStyle="#403725";ctx.fillRect(assisted?646:776,505,assisted?302:172,23);
    ctx.fillStyle="#faedca";ctx.font="bold 12px Arial";
    ctx.fillText(assisted?"DEV MODE · TEST RUN — PROGRESS NOT SAVED":"DEV MODE · TOOLS ENABLED",assisted?654:784,521);ctx.restore();
}
