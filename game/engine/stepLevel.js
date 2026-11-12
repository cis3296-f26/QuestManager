import { movement } from "./Movement.js";
import { moveHorizontally, applyGravity, carryPlayer } from "./Physics.js";
import { resolveEnemyInteractions } from "./EnemyInteractions.js";
import { touchesHazard } from "./Hazards.js";

// One gameplay tick, shared with route validation. No DOM, persistence or navigation.
export function stepLevel(level, direction, dt) {
    const { player, platforms, enemies, config } = level;
    const previous = { x: player.x, y: player.y, width: player.width, height: player.height };
    level.updatePlatforms(dt);
    carryPlayer(player, config.worldWidth);
    const previousX = player.x;
    moveHorizontally(player, direction, movement.speed, config.worldWidth, dt);
    applyGravity(player, movement.gravity, platforms, dt, { previousX });
    level.puzzle.update(player, previous, dt);
    enemies.forEach((enemy) => enemy.update(dt));
    const contact = resolveEnemyInteractions(player, previous, enemies, { dt, gravity: movement.gravity, platforms });
    // Update every rock, even if the first one hits. Audio/reset snapshots must
    // never depend on hazard ordering or short-circuit an active timer.
    let fallingRock = false;
    for (const rock of level.stalactites) fallingRock = rock.update(dt, player, previous, platforms) || fallingRock;
    const death = contact.deadly ? "enemy" : player.y >= movement.viewHeight ? "fall" :
        touchesHazard(player, config.hazards ?? []) ? "thorns" : fallingRock ? "stalactite" : null;
    const discovered = death ? [] : level.exploration.update(player, dt);
    return { death, stomped: contact.stomped, discovered };
}

