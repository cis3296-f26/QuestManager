// Platforms are solid only when the player crosses their top while descending.
export function findLanding(player, platforms, previousBottom) {
    let landingY = Infinity;
    if (player.velocityY < 0) return landingY;

    for (const platform of platforms) {
        const overlapsHorizontally = player.x + player.width > platform.x &&
            player.x < platform.x + platform.width;
        const crossedTop = previousBottom <= platform.y &&
            player.y + player.height >= platform.y;

        if (overlapsHorizontally && crossedTop) {
            landingY = Math.min(landingY, platform.y);
        }
    }

    return landingY;
}
