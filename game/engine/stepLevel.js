import { movement } from "./Movement.js";
import { moveHorizontally, applyGravity, carryPlayer } from "./Physics.js";
import { resolveEnemyInteractions } from "./EnemyInteractions.js";
import { touchesHazard } from "./Hazards.js";

// One gameplay tick, shared with route validation. No DOM, persistence or navigation.
export function stepLevel(level, direction, dt, { invincible = false, flight = null } = {}) {
    const { player, platforms, enemies, config } = level;
    const previous = { x: player.x, y: player.y, width: player.width, height: player.height };
    level.updatePlatforms(dt);
    const windDisplacement = level.wind.update(player, dt, { enabled: !flight });
    if (!flight) carryPlayer(player, config.worldWidth);
    const previousX = player.x;
    if (flight) {
        const magnitude = Math.hypot(direction, flight.vertical) || 1;
        player.x = Math.max(0, Math.min(config.worldWidth - player.width,
            player.x + direction / magnitude * flight.speed * dt));
        player.y = Math.max(movement.hudBottom + 2, Math.min(movement.viewHeight - player.height - 2,
            player.y + flight.vertical / magnitude * flight.speed * dt));
        player.trackMovement(previousX);
        player.velocityY = 0; player.velocityX = 0; player.iceAirborne = false; player.grounded = false; player.supportPlatform = null;
    } else {
        moveHorizontally(player, direction, movement.speed, config.worldWidth, dt);
        if (windDisplacement) {
            player.x = Math.max(0, Math.min(config.worldWidth - player.width, player.x + windDisplacement));
            player.trackMovement(previousX);
        }
        applyGravity(player, movement.gravity, platforms, dt, { previousX });
    }
    const proposedX = player.x;
    level.puzzle.update(player, previous, dt, { ignoreWalls: Boolean(flight) });
    if (player.x !== proposedX) player.velocityX = 0;
    enemies.forEach((enemy) => enemy.update(dt));
    const contact = flight ? { deadly: false, stomped: [] } :
        resolveEnemyInteractions(player, previous, enemies, { dt, gravity: movement.gravity, platforms, ignoreDamage: invincible });
    // Update every rock, even if the first one hits. Audio/reset snapshots must
    // never depend on hazard ordering or short-circuit an active timer.
    let fallingRock = false;
    for (const rock of level.stalactites) fallingRock = rock.update(dt, player, previous, platforms) || fallingRock;
    let sunPulse = false;
    for (const trap of level.sunPulses) sunPulse = trap.update(dt, player, previous) || sunPulse;
    const death = invincible || flight ? null : contact.deadly ? "enemy" : player.y >= movement.viewHeight ? "fall" :
        touchesHazard(player, config.hazards ?? []) ? "thorns" : fallingRock ? "stalactite" : sunPulse ? "sun-pulse" : null;
    const discovered = death ? [] : level.exploration.update(player, dt);
    return { death, stomped: contact.stomped, discovered };
}

