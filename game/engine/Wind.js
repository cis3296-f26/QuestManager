const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x &&
    a.y < b.y + b.height && a.y + a.height > b.y;

// Attempt-local clock and horizontal drift. No input, gravity or collision rules
// live here: stepLevel applies the displacement before its normal collision pass.
export class Wind {
    constructor(zones = []) { this.zones = zones; this.reset(); }
    reset() { this.time = 0; this.velocity = 0; }

    state(zone, time = this.time) {
        if (!zone.period) return { phase: "gust", gain: 1, remaining: Infinity };
        const t = ((time + (zone.offset ?? 0)) % zone.period + zone.period) % zone.period;
        if (t < zone.warning) return { phase: "warning", gain: 0, remaining: zone.warning - t };
        const age = t - zone.warning;
        if (age < zone.duration) return { phase: "gust",
            gain: Math.max(0, Math.min(1, age / .25, (zone.duration - age) / .25)), remaining: zone.duration - age };
        return { phase: "calm", gain: 0, remaining: zone.period - t };
    }

    update(player, dt, { enabled = true } = {}) {
        if (!this.zones.length) return 0;
        if (!enabled) { this.time += dt; this.velocity = 0; return 0; }
        const nearby = this.zones.filter(z => overlaps(player, z));
        let displacement = 0, remaining = dt;
        // Small bounded force steps sample warning/gust boundaries consistently.
        // Exact exponential integration gives gradual acceleration, not a position
        // snap; ground friction makes observation ledges safe and steerable.
        while (remaining > 1e-10) {
            const slice = Math.min(remaining, 1 / 120);
            const strength = nearby.reduce((sum, zone) => sum + zone.direction * zone.strength *
                this.state(zone, this.time + slice / 2).gain, 0);
            const target = Math.max(-120, Math.min(120, strength)) * (player.grounded ? .2 : 1);
            const response = .18, decay = Math.exp(-slice / response);
            displacement += target * slice + (this.velocity - target) * response * (1 - decay);
            this.velocity = target + (this.velocity - target) * decay;
            this.time += slice; remaining -= slice;
        }
        return displacement;
    }
}

export function validateWind(config) {
    const errors = [], ids = new Set();
    for (const z of config.windZones ?? []) {
        if (!z.id || ids.has(z.id)) errors.push(`Duplicate or missing wind ID: ${z.id}.`);
        ids.add(z.id);
        if (![z.x,z.y,z.width,z.height,z.strength].every(Number.isFinite) || z.x < 0 || z.y < 84 ||
            z.width <= 0 || z.height <= 0 || z.x + z.width > config.worldWidth || z.y + z.height > 540 ||
            z.strength <= 0 || z.strength > 120 || ![-1,1].includes(z.direction) || !z.purpose)
            errors.push(`Invalid wind zone: ${z.id}.`);
        if (z.period !== undefined && (!Number.isFinite(z.period) || z.period <= 0 ||
            !Number.isFinite(z.warning) || z.warning < .5 || !Number.isFinite(z.duration) || z.duration <= .5 ||
            z.warning + z.duration >= z.period || (z.offset !== undefined && !Number.isFinite(z.offset))))
            errors.push(`Invalid gust timing: ${z.id}.`);
    }
    return errors;
}
