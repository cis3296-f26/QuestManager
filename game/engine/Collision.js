// Platforms are solid only when the player crosses their top while descending.
export function findLanding(player, platforms, previousBottom) {
    return findLandingSurface(player, platforms, previousBottom)?.platform.y ?? Infinity;
}

export function findLandingSurface(player, platforms, previousBottom, previousX = player.x, frameStart = 0) {
    let landing = null;
    if (player.velocityY < 0) return landing;

    for (const platform of platforms) {
        if (platform.solid === false) continue;
        if (platform.type === "moving" && platform.previousY !== undefined) {
            const startY = platform.previousY + (platform.y - platform.previousY) * frameStart;
            const startX = platform.previousX + (platform.x - platform.previousX) * frameStart;
            const relativeFall = player.y + player.height - previousBottom - (platform.y - startY);
            if (relativeFall <= 0 || previousBottom > startY + 1e-7 || player.y + player.height < platform.y) continue;
            const time = Math.max(0, Math.min(1, (startY - previousBottom) / relativeFall));
            const x = previousX + (player.x - previousX) * time;
            const surfaceX = startX + (platform.x - startX) * time;
            if (x + player.width <= surfaceX || x >= surfaceX + platform.width) continue;
            if (!landing || time < landing.time) landing = { platform, time };
            continue;
        }
        const overlapsHorizontally = player.x + player.width > platform.x &&
            player.x < platform.x + platform.width;
        const crossedTop = previousBottom <= platform.y &&
            player.y + player.height >= platform.y;

        if (overlapsHorizontally && crossedTop) {
            const fall = player.y + player.height - previousBottom;
            const time = fall > 0 ? (platform.y - previousBottom) / fall : 0;
            if (!landing || time < landing.time) landing = { platform, time };
        }
    }

    return landing;
}

// Continuous AABB contact using relative movement. This detects a fast object
// passing entirely through another between frames, rather than checking only overlap.
export function sweepAABB(start, end, targetStart, targetEnd) {
    const overlaps = start.x < targetStart.x + targetStart.width &&
        start.x + start.width > targetStart.x && start.y < targetStart.y + targetStart.height &&
        start.y + start.height > targetStart.y;
    if (overlaps) return { time: 0, normalX: 0, normalY: 0 }; // Embedded/side contact is never a stomp.

    const axis = (min, size, targetMin, targetSize, delta) => {
        if (delta === 0) {
            if (min + size <= targetMin || min >= targetMin + targetSize) return null;
            return { enter: -Infinity, exit: Infinity };
        }
        const a = (targetMin - min - size) / delta;
        const b = (targetMin + targetSize - min) / delta;
        return { enter: Math.min(a, b), exit: Math.max(a, b) };
    };
    const x = axis(start.x, start.width, targetStart.x, targetStart.width,
        end.x - start.x - (targetEnd.x - targetStart.x));
    const y = axis(start.y, start.height, targetStart.y, targetStart.height,
        end.y - start.y - (targetEnd.y - targetStart.y));
    if (!x || !y) return null;
    const enter = Math.max(x.enter, y.enter), exit = Math.min(x.exit, y.exit);
    if (enter < 0 || enter > 1 || enter > exit) return null;
    const dx = end.x - start.x - (targetEnd.x - targetStart.x);
    const dy = end.y - start.y - (targetEnd.y - targetStart.y);
    // Exact corner contacts have no top normal, so diagonal side grazes cannot defeat enemies.
    return {
        time: enter,
        normalX: x.enter > y.enter + 1e-9 ? -Math.sign(dx) : 0,
        normalY: y.enter > x.enter + 1e-9 ? -Math.sign(dy) : 0
    };
}


