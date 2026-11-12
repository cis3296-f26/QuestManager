// Placement rules describe a route, not a second movement/physics system.
// Continuous gameplay witnesses still establish boarding, timing and reachability.
export function validatePlatformPurpose(config) {
    const errors = [], platforms = config.platforms ?? [];
    const overlapX = (a,b) => a.x < b.x+b.width && a.x+a.width > b.x;
    for (const platform of platforms.filter(p => p.type)) {
        const from = platforms.find(p => p.id === platform.connection?.from);
        const to = platforms.find(p => p.id === platform.connection?.to);
        if (!from || !to || from === to || from === platform || to === platform) {
            errors.push(`Special platform ${platform.id} needs distinct valid connection endpoints.`);
            continue;
        }
        if (platform.type === "moving" && platform.axis === "y") {
            const highest = platform.y + Math.min(0, platform.distance);
            if (!(to.y < from.y) || highest > to.y) errors.push(`Vertical platform ${platform.id} must reach a higher destination.`);
        }
        if (platform.type === "moving" && platform.axis === "x") {
            if (!(from.x+from.width <= to.x || to.x+to.width <= from.x)) errors.push(`Horizontal platform ${platform.id} must connect separated landing areas.`);
        }
        if (platform.type === "collapsing") {
            const safeFloor = platforms.some(p => p !== platform && !p.type && p.y > platform.y && overlapX(p,platform));
            const danger = (config.hazards ?? []).some(h => h.y > platform.y && overlapX(h,platform)) ||
                (config.enemies ?? []).some(e => (e.feetY ?? config.groundY) > platform.y &&
                    overlapX({x:e.minX,width:e.maxX-e.minX+e.width},platform));
            if (safeFloor && !danger) errors.push(`Collapsing platform ${platform.id} needs a pit, enemy or hazard below.`);
        }
    }
    return errors;
}
