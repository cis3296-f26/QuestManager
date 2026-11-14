export function followCamera(cameraX, player, worldWidth, viewWidth, dt) {
    const playerCenter = player.x + player.width / 2;
    const maxCameraX = Math.max(0, worldWidth - viewWidth);
    // Leave a little more space ahead of the player.
    const targetX = Math.max(0, Math.min(maxCameraX, playerCenter - viewWidth * 0.45));
    return cameraX + (targetX - cameraX) * (1 - Math.exp(-8 * dt));
}


// Only an authored guardian arena opts into framing. Earlier levels use the
// identical follow calculation. Keep a rider visible during the short transition.
export function followLevelCamera(cameraX, level, viewWidth, dt) {
    const b=level.warden,p=level.player;
    if(!b || b.state==='dormant' || b.defeated && p.x>b.config.exitGate.x)
        return followCamera(cameraX,p,level.config.worldWidth,viewWidth,dt);
    const target=b.config.cameraX;
    const blended=cameraX+(target-cameraX)*(1-Math.exp(-8*dt));
    return Math.max(0,Math.min(level.config.worldWidth-viewWidth,
        Math.max(p.x+p.width-viewWidth+12,Math.min(p.x-12,blended))));
}
