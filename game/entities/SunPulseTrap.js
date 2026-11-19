import { movement } from "../engine/Movement.js";
import { sweepAABB } from "../engine/Collision.js";

// A predictable world-space hazard. The emitter direction affects presentation;
// its explicit beam rectangle is the sole damage area. No proximity trigger.
export class SunPulseTrap {
    constructor(config) {
        this.config = { initialDelay: 0, ...config };
        if (validateSunPulses({ worldWidth: Infinity, sunPulseTraps: [this.config] }).length)
            throw new TypeError("Sun pulse traps need valid beam geometry, direction and positive cycle durations.");
        this.reset();
    }
    reset() { this.time = 0; }
    phaseAt(time) {
        const c = this.config;
        const elapsed = time - c.initialDelay;
        if (elapsed < 0) return { state: "cooldown", remaining: -elapsed + c.cooldown, progress: 0 };
        const cycle = c.cooldown + c.warningDuration + c.activeDuration;
        let phase = ((elapsed + 1e-9) % cycle + cycle) % cycle;
        for (const [state, duration] of [["cooldown", c.cooldown], ["charging", c.warningDuration], ["active", c.activeDuration]]) {
            if (phase < duration) return { state, remaining: duration - phase, progress: phase / duration };
            phase -= duration;
        }
    }
    get phase() { return this.phaseAt(this.time); }
    get state() { return this.phase.state; }
    update(dt, player, previous) {
        if (!Number.isFinite(dt) || dt < 0) throw new TypeError("Invalid sun pulse timestep.");
        if (dt === 0) return false;
        const start = this.time, end = start + dt;
        this.time = end;
        let at = start, hit = false;
        const interpolate = t => ({ x: previous.x + (player.x - previous.x) * t,
            y: previous.y + (player.y - previous.y) * t, width: player.width, height: player.height });
        // Split the tick at temporal boundaries: crossing an inactive beam earlier
        // in a long tick must not become lethal merely because it activates later.
        while (at < end - 1e-10) {
            const phase = this.phaseAt(at);
            const until = Math.min(end, at + Math.max(phase.remaining, 1e-8));
            if (phase.state === "active" && until - at > 1e-8) {
                const contact = sweepAABB(interpolate((at - start) / dt), interpolate((until - start) / dt), this.config, this.config);
                if (contact && (contact.time < 1 - 1e-8 || this.phaseAt(until).state === "active")) hit = true;
            }
            at = until;
        }
        return hit;
    }
}

export function validateSunPulses(config) {
    return (config.sunPulseTraps ?? []).flatMap(c => {
        const valid = [c.x,c.y,c.width,c.height,c.cooldown,c.warningDuration,c.activeDuration].every(Number.isFinite) &&
            c.x >= 0 && c.x + c.width <= config.worldWidth && c.y >= movement.hudBottom && c.y + c.height <= movement.viewHeight &&
            c.width > 0 && c.height > 0 && c.cooldown > 0 && c.warningDuration > 0 && c.activeDuration > 0 &&
            Number.isFinite(c.initialDelay ?? 0) && (c.initialDelay ?? 0) >= 0 &&
            ["up","down","left","right"].includes(c.direction);
        return valid ? [] : [`Invalid sun pulse trap: ${c.id}.`];
    });
}
