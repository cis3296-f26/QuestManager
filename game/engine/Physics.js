import { findLanding } from "./Collision.js";

export function moveHorizontally(player, direction, speed, worldWidth, dt) {
    const previousX = player.x;
    player.x += direction * speed * dt;
    player.x = Math.max(0, Math.min(worldWidth - player.width, player.x));
    player.trackMovement(previousX);
}

export function jump(player, strength) {
    player.velocityY = -strength;
    player.grounded = false;
}

export function applyGravity(player, gravity, platforms, dt) {
    const previousBottom = player.y + player.height;
    player.velocityY += gravity * dt;
    player.y += player.velocityY * dt;
    player.grounded = false;

    const landingY = findLanding(player, platforms, previousBottom);
    if (landingY !== Infinity) {
        player.y = landingY - player.height;
        player.velocityY = 0;
        player.grounded = true;
    }
}
