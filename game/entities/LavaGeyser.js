import { SunPulseTrap, validateSunPulses } from "./SunPulseTrap.js";

// Reuse the existing temporal slicing and swept damage implementation. Only the
// cycle and presentation differ: no second collision engine or proximity trigger.
export class LavaGeyser extends SunPulseTrap {
    constructor(config) {
        super({ direction: "up", initialDelay: 0, recoveryDuration: .4, ...config });
        if (!(this.config.recoveryDuration > 0) || !Number.isFinite(this.config.recoveryDuration))
            throw new TypeError("Geysers need a positive recovery duration.");
    }
    phaseAt(time) {
        const c = this.config, elapsed = time - c.initialDelay;
        if (elapsed < -1e-9) return { state: "cooldown", stage: "dormant", remaining: -elapsed, progress: 0 };
        const stages = [["charging", "warning", c.warningDuration], ["active", "eruption", c.activeDuration],
            ["cooldown", "recovery", c.recoveryDuration], ["cooldown", "cooldown", c.cooldown]];
        const cycle = stages.reduce((sum, s) => sum + s[2], 0);
        let phase = ((elapsed + 1e-9) % cycle + cycle) % cycle;
        for (const [state, stage, duration] of stages) {
            if (phase < duration) return { state, stage, remaining: duration - phase, progress: phase / duration };
            phase -= duration;
        }
    }
    get state() { return this.phase.stage; }
}
export function validateLavaGeysers(config) {
    const geysers = config.lavaGeysers ?? [];
    return [...validateSunPulses({ ...config, sunPulseTraps: geysers.map(c => ({ direction: "up", ...c })) }),
        ...geysers.filter(c => !Number.isFinite(c.recoveryDuration ?? .4) || (c.recoveryDuration ?? .4) <= 0)
            .map(c => `Invalid geyser recovery: ${c.id}.`)];
}
