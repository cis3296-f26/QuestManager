import { SunPulseTrap, validateSunPulses } from "../entities/SunPulseTrap.js";
import { GatePuzzle } from "./GatePuzzle.js";

// Isolated encounter state. No storage, rewards, DOM or bespoke combat physics.
export class EmberWarden {
    constructor(config) {
        this.config = config;
        this.patterns = config.phases.map(p => p.attacks.map(a => new SunPulseTrap(a)));
        this.lock = new GatePuzzle([], [], [config.exitGate]);
        this.reset();
    }
    reset() {
        this.state = "dormant"; this.phaseTime = 0; this.time = 0; this.defeatTime = 0;
        this.seals = this.config.seals.map(s => ({ ...s, active: false }));
        this.patterns.forEach(p => p.forEach(a => a.reset()));
        this.lock.barriers = [this.config.exitGate];
    }
    get progress() { return this.seals.filter(s => s.active).length; }
    get defeated() { return this.state === "defeated" && this.progress === 3; }
    get phaseNumber() { return Math.min(3, this.progress + 1); }
    get attacks() { return this.state === "active" ? this.patterns[this.progress] : []; }
    update(player, previous, dt, { flight = false, invincible = false } = {}) {
        this.time += dt;
        this.lock.barriers = this.defeated ? [] : [this.config.exitGate];
        this.lock.update(player, previous, dt, { ignoreWalls: flight });
        if (this.state === "dormant" && player.x + player.width >= this.config.entryX && player.x < this.config.exitGate.x) this.state = "active";
        if (this.state === "defeating") {
            this.defeatTime += dt;
            if (this.defeatTime >= this.config.defeatDuration) { this.state = "defeated"; this.lock.barriers = []; }
            return false;
        }
        if (this.state !== "active") return false;
        this.phaseTime += dt;
        let damage = false;
        for (const a of this.attacks) damage = a.update(dt, player, previous) || damage;
        // Damage wins over a seal touched in the same tick. Flying never presses plates.
        if (damage && !flight && !invincible) return true;
        const seal = this.seals[this.progress], phase = this.config.phases[this.progress];
        const support = player.supportPlatform?.id ?? player.supportPlatform?.config?.id;
        if (!flight && this.phaseTime >= phase.minimumTime && player.grounded && support === seal.platformId &&
            Math.abs(player.y + player.height - seal.y - seal.height) < 1e-6 &&
            player.x + player.width > seal.x && player.x < seal.x + seal.width) {
            seal.active = true;
            this.phaseTime = 0;
            if (this.progress === 3) { this.state = "defeating"; this.defeatTime = 0; }
            else this.patterns[this.progress].forEach(a => a.reset());
        }
        return false;
    }
}
export function validateWarden(level) {
    const c = level.warden;
    if (!c) return [];
    const errors = [];
    if (c.seals?.length !== 3 || c.phases?.length !== 3 || !(c.defeatDuration > 0)) errors.push("Warden requires three physical seals, three phases and a defeat duration.");
    for (const s of c.seals ?? []) if (!level.platforms.some(p => p.id === s.platformId && !p.type && p.y === s.y + s.height && s.x >= p.x && s.x + s.width <= p.x + p.width)) errors.push(`Unsupported Ember Seal ${s.id}.`);
    for (const p of c.phases ?? []) {
        errors.push(...validateSunPulses({ ...level, sunPulseTraps: p.attacks }));
        if (!(p.minimumTime > 0) || !p.attacks.length) errors.push("Warden phases require a visible attack and observation interval.");
    }
    if (c.exitGate.y > 84 || c.exitGate.y + c.exitGate.height < 540 || c.exitGate.width < 16 || c.exitGate.x < c.entryX || c.cameraX < 0 || c.cameraX + 960 > level.worldWidth) errors.push("Warden exit must block the full playfield with a visible bounded arena.");
    return errors;
}
export const sceneForLevel = level => level.warden?.state === "active" ? "warden" :
    ["defeating", "defeated"].includes(level.warden?.state) ? "ending" : level.config.audio?.music ?? "grassland";
