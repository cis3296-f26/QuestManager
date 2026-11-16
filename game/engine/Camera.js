export function followCamera(cameraX, player, worldWidth, viewWidth, dt) {
    const playerCenter = player.x + player.width / 2;
    const maxCameraX = Math.max(0, worldWidth - viewWidth);
    // Leave a little more space ahead of the player.
    const targetX = Math.max(0, Math.min(maxCameraX, playerCenter - viewWidth * 0.45));
    return cameraX + (targetX - cameraX) * (1 - Math.exp(-8 * dt));
}
