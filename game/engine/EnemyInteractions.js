import { sweepAABB } from "./Collision.js";
import { applyGravity, bounce } from "./Physics.js";

const positionAt = (start, end, time) => ({
    x: start.x + (end.x - start.x) * time,
    y: start.y + (end.y - start.y) * time,
    width: start.width, height: start.height
});

function firstContact(start, end, enemy, since) {
    // Split at a patrol boundary so even a fast enemy's stop is represented correctly.
    const times = [since];
    if (enemy.moveUntil > since && enemy.moveUntil < 1) times.push(enemy.moveUntil);
    times.push(1);
    for (let i = 0; i < times.length - 1; i++) {
        const from = times[i], to = times[i + 1];
        const contact = sweepAABB(
            positionAt(start, end, (from - since) / (1 - since)),
            positionAt(start, end, (to - since) / (1 - since)),
            enemy.boundsAt(from), enemy.boundsAt(to)
        );
        if (contact) return { ...contact, time: from + (to - from) * contact.time, enemy };
    }
    return null;
}

// Resolve contacts in time order, independent of the order enemies appear in a level.
// No level geometry, persistence, appearance names or death UI belongs here.
export function resolveEnemyInteractions(player, previous, enemies, { dt, gravity, platforms }) {
    let start = previous, since = 0;
    const stomped = [];
    // Every successful pass removes at least one active enemy from collision checks.
    for (let pass = 0; pass <= enemies.length && since < 1; pass++) {
        const end = { x: player.x, y: player.y, width: player.width, height: player.height };
        const contacts = enemies.filter((enemy) => enemy.active)
            .map((enemy) => firstContact(start, end, enemy, since)).filter(Boolean)
            .sort((a, b) => a.time - b.time);
        if (!contacts.length) break;
        const time = contacts[0].time;
        const simultaneous = contacts.filter((contact) => Math.abs(contact.time - time) < 1e-9);
        const descending = end.y > start.y && player.velocityY >= 0;
        const deadly = simultaneous.some((contact) =>
            !contact.enemy.stompable || contact.normalY !== -1 || !descending);
        const position = positionAt(start, end, (time - since) / (1 - since));
        if (deadly) {
            player.x = position.x;
            player.y = position.y;
            return { deadly: true, stomped };
        }

        const surfaceY = simultaneous[0].enemy.boundsAt(time).y;
        simultaneous.forEach(({ enemy }) => {
            enemy.defeat(time);
            stomped.push(enemy);
        });
        bounce(player, surfaceY);
        start = { x: position.x, y: player.y, width: player.width, height: player.height };
        since = time;
        // Continue the smaller bounce for the unused part of this frame. Horizontal
        // movement is preserved, and a second enemy can still be dangerous afterward.
        const remaining = dt * (1 - time);
        if (remaining > 0) applyGravity(player, gravity, platforms, remaining);
    }
    return { deadly: false, stomped };
}
