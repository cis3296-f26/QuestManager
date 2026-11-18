import { surfaceDisplacement, isIce } from "./SurfaceMovement.js";
import { findLandingSurface } from "./Collision.js";

export function moveHorizontally(player, direction, speed, worldWidth, dt) {
    const previousX = player.x;
    player.x += surfaceDisplacement(player, direction, speed, dt);
    const clamped = Math.max(0, Math.min(worldWidth - player.width, player.x));
    if (clamped !== player.x) player.velocityX = 0;
    player.x = clamped;
    player.trackMovement(previousX);
}

export function jump(player, strength) {
    player.climbingId = null; player.climbMotion = 0;
    if (player.grounded) player.iceAirborne = isIce(player.supportPlatform);
    player.velocityY = -strength;
    player.grounded = false;
    player.supportPlatform = null;
}

// Shared stomp response, smaller than the normal 650-speed jump. No horizontal reset.
export function bounce(player, surfaceY, strength = 420) {
    player.y = surfaceY - player.height;
    jump(player, strength);
}

// Carry only a grounded rider who still overlaps the platform's previous position.
export function carryPlayer(player, worldWidth) {
    const support = player.supportPlatform;
    if (!support || !player.grounded) return;
    const oldX = support.previousX ?? support.x;
    const oldY = support.previousY ?? support.y;
    if (support.solid === false || player.x + player.width <= oldX || player.x >= oldX + support.width ||
        Math.abs(player.y + player.height - oldY) > 1e-6) {
        player.supportPlatform = null;
        player.grounded = false;
        return;
    }
    player.x = Math.max(0, Math.min(worldWidth - player.width, player.x + (support.deltaX ?? 0)));
    player.y = support.y - player.height;
}

export function applyGravity(player, gravity, platforms, dt, { previousX = player.x, frameStart = 0 } = {}) {
    const previousBottom = player.y + player.height;
    const support = player.supportPlatform;
    if (player.grounded && support && platforms.includes(support) && support.solid !== false &&
        Math.abs(previousBottom - support.y) < 1e-6 &&
        player.x + player.width > support.x && player.x < support.x + support.width) {
        player.velocityY = 0;
        support.onLand?.();
        return;
    }
    const departed = player.grounded ? support : null;
    player.supportPlatform = null;
    player.velocityY += gravity * dt;
    player.y += player.velocityY * dt;
    player.grounded = false;

    const surfaces = departed ? platforms.filter((platform) => platform !== departed) : platforms;
    const landing = findLandingSurface(player, surfaces, previousBottom, previousX, frameStart);
    if (landing) {
        const { platform, time } = landing;
        player.y = platform.y - player.height;
        if (platform.type === "moving") player.x += (platform.deltaX ?? 0) * (1 - frameStart) * (1 - time);
        player.velocityY = 0;
        player.grounded = player.x + player.width > platform.x && player.x < platform.x + platform.width;
        player.supportPlatform = player.grounded ? platform : null;
        if (player.grounded) platform.onLand?.();
    }
}



