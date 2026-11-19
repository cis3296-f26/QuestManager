import { climbStep, detachClimb } from "./Climbing.js";
import { movement } from "./Movement.js";
import { moveHorizontally, applyGravity, carryPlayer } from "./Physics.js";
import { resolveEnemyInteractions } from "./EnemyInteractions.js";
import { updateCheckpoint } from "../levels/AttemptCheckpoints.js";
import { touchesHazard, touchesLava } from "./Hazards.js";

// One gameplay tick, shared with route validation. No DOM, persistence or navigation.
export function stepLevel(level, direction, dt, { invincible = false, flight = null, climbVertical = 0 } = {}) {
    const { player, platforms, enemies, config } = level;
    const previous = { x: player.x, y: player.y, width: player.width, height: player.height };
    level.updatePlatforms(dt);
    const windDisplacement = level.wind.update(player, dt, { enabled: !flight });
    if (!flight) carryPlayer(player, config.worldWidth);
    const previousX = player.x;
    if (flight) {
        if (player.climbingId) detachClimb(player);
        const magnitude = Math.hypot(direction, flight.vertical) || 1;
        player.x = Math.max(0, Math.min(config.worldWidth - player.width,
            player.x + direction / magnitude * flight.speed * dt));
        player.y = Math.max(movement.hudBottom + 2, Math.min(movement.viewHeight - player.height - 2,
            player.y + flight.vertical / magnitude * flight.speed * dt));
        player.trackMovement(previousX);
        player.velocityY = 0; player.velocityX = 0; player.iceAirborne = false; player.grounded = false; player.supportPlatform = null;
    } else if (!climbStep(level, climbVertical, dt)) {
        moveHorizontally(player, direction, movement.speed, config.worldWidth, dt);
        if (windDisplacement) {
            player.x = Math.max(0, Math.min(config.worldWidth - player.width, player.x + windDisplacement));
            player.trackMovement(previousX);
        }
        applyGravity(player, movement.gravity, platforms, dt, { previousX });
    }
    const proposedX = player.x, proposedY = player.y;
    level.puzzle.update(player, previous, dt, { ignoreWalls: Boolean(flight) });
    if (player.x !== proposedX) player.velocityX = 0;
    if (player.climbingId && (player.x !== proposedX || player.y !== proposedY)) detachClimb(player);
    enemies.forEach((enemy) => enemy.update(dt));
    const contact = flight ? { deadly: false, stomped: [] } :
        resolveEnemyInteractions(player, previous, enemies, { dt, gravity: movement.gravity, platforms, ignoreDamage: invincible });
    // Update every rock, even if the first one hits. Audio/reset snapshots must
    // never depend on hazard ordering or short-circuit an active timer.
    let fallingRock = false;
    for (const rock of level.stalactites) fallingRock = rock.update(dt, player, previous, platforms) || fallingRock;
    let sunPulse = false;
    for (const trap of level.sunPulses) sunPulse = trap.update(dt, player, previous) || sunPulse;
    let eruption = false;
    for (const geyser of level.geysers) eruption = geyser.update(dt, player, previous) || eruption;
    const guardian = level.warden?.update(player, previous, dt, { flight: Boolean(flight), invincible }) ?? false;
    const death = invincible || flight ? null : guardian ? "warden" : contact.deadly ? "enemy" : player.y >= movement.viewHeight ? "fall" :
        touchesLava(player, previous, config.hazards ?? []) ? "lava" :
        touchesHazard(player, (config.hazards ?? []).filter(h=>h.type!=="lava")) ? "thorns" : eruption ? "eruption" : fallingRock ? "stalactite" : sunPulse ? "sun-pulse" : null;
    if (death && player.climbingId) detachClimb(player);
    const discovered = death ? [] : level.exploration.update(player, dt);
    const checkpoint = death || flight ? null : updateCheckpoint(level);
    return { death, stomped: contact.stomped, discovered, checkpoint };
}

