// Opt-in surface physics. Earlier levels retain their instantaneous controls.
export const surfaceOf = platform => platform?.surface ?? platform?.config?.surface;
export const isIce = platform => surfaceOf(platform)?.type === "ice";

// Exact constant-acceleration displacement, including the moment the target
// velocity is reached. Splitting the same interval into frames preserves travel.
export function accelerate(velocity, target, rate, dt) {
    if (velocity === target) return { velocity, distance: velocity * dt };
    const sign = Math.sign(target - velocity);
    const accelerating = Math.min(dt, Math.abs(target - velocity) / rate);
    return { velocity: accelerating < dt ? target : velocity + sign * rate * accelerating,
        distance: velocity * accelerating + sign * rate * accelerating ** 2 / 2 + target * (dt - accelerating) };
}

export function surfaceDisplacement(player, direction, speed, dt) {
    const ice = player.grounded && isIce(player.supportPlatform);
    if (!ice && (player.grounded || !player.iceAirborne)) {
        player.iceAirborne = false;
        player.velocityX = direction * speed;
        return player.velocityX * dt;
    }
    if (ice) player.iceAirborne = true;
    const profile = ice ? surfaceOf(player.supportPlatform) : null;
    const target = direction ? direction * speed : ice ? 0 : player.velocityX;
    let rate = 1800; // Responsive steering in an ice-launched jump.
    if (ice) {
        if (!direction) rate = profile.friction;
        else rate = player.velocityX * direction < 0 ? profile.braking : profile.acceleration;
    }
    const result = accelerate(player.velocityX, target, rate, dt);
    player.velocityX = result.velocity;
    return result.distance;
}

export function validateSurfaces(config) {
    return config.platforms.flatMap(p => {
        if (!p.surface) return [];
        const s = p.surface;
        return s.type === "ice" && p.appearance === "ice" &&
            [s.acceleration,s.braking,s.friction].every(n => Number.isFinite(n) && n > 0)
            ? [] : [`Invalid surface movement profile: ${p.id}.`];
    });
}
