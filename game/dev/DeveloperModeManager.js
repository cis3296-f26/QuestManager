import { stepLevel } from "../engine/stepLevel.js";
import { movement } from "../engine/Movement.js";
import { locationsFor, placeSafely } from "./SafePosition.js";

// Memory-only testing state. Availability is supplied by the build entry point,
// never a cookie, query string, localStorage preference, password or account role.
export class DeveloperModeManager {
    constructor({ available = false, getLevel, flightSpeed = 560 }) {
        this.available = available === true;
        this.getLevel = getLevel;
        this.flightSpeed = flightSpeed;
        this.resetSession();
    }

    resetSession() {
        this.enabled = false;
        this.fly = false;
        this.invincible = false;
        this.hitboxes = false;
        this.speed = 1;
        this.testLevelId = null;
    }

    get activeCheats() {
        return this.available && this.enabled && (this.fly || this.invincible || this.speed !== 1);
    }

    markAttempt() {
        if (this.available) this.getLevel().developerAssisted = true;
    }

    enable(value) {
        if (!this.available) return false;
        if (!value && this.fly && !this.set("fly", false)) return false;
        this.enabled = Boolean(value);
        if (!this.enabled) {
            this.invincible = false;
            this.hitboxes = false;
            this.speed = 1;
        }
        return true;
    }

    set(key, value) {
        if (!this.available || !this.enabled || !["fly", "invincible", "hitboxes", "speed"].includes(key)) return false;
        if (key === "speed" && ![.5, 1, 2].includes(value)) return false;
        if (key !== "speed" && typeof value !== "boolean") return false;
        if (key === "fly" && this.fly && !value) {
            const player = this.getLevel().player;
            if (!placeSafely(this.getLevel(), { x: player.x + player.width / 2, feetY: player.y + player.height })) return false;
        }
        this[key] = value;
        if (this.activeCheats) this.markAttempt();
        return true;
    }

    beginAttempt({ bypass = false } = {}) {
        // LevelManager.restart clears the old marker; active cheats immediately
        // re-taint the new run. Disabling tools never clears the current marker.
        if (this.activeCheats || bypass) this.markAttempt();
    }

    canLoad(id, levels) {
        return this.available && this.enabled && levels.some(level => level.id === Number(id));
    }

    teleport(id) {
        if (!this.available || !this.enabled) return false;
        const level = this.getLevel();
        const location = locationsFor(level.config).find(location => location.id === id);
        if (!location || !placeSafely(level, location.target)) return false;
        this.markAttempt();
        return true;
    }

    step(direction, keys, dt) {
        const level = this.getLevel();
        if (!this.available || !this.enabled) return stepLevel(level, direction, dt);
        if (this.activeCheats) this.markAttempt();
        const vertical = Number(keys.has("KeyS") || keys.has("ArrowDown")) - Number(keys.has("KeyW") || keys.has("ArrowUp"));
        const boost = keys.has("ShiftLeft") || keys.has("ShiftRight");
        const result = stepLevel(level, direction, dt, {
            invincible: this.invincible || this.fly,
            flight: this.fly ? { vertical, speed: this.flightSpeed * (boost ? 1.6 : 1) } : null
        });
        if (this.invincible && !this.fly && level.player.y >= movement.viewHeight) {
            const player = level.player;
            placeSafely(level, { x: player.x + player.width / 2, feetY: level.config.groundY });
        }
        return result;
    }

    checkFlyingFinish() {
        const level = this.getLevel(), player = level.player;
        if (!this.available || !this.enabled || !this.fly || level.complete) return false;
        if (player.x <= level.flagX + 4 && player.x + player.width >= level.flagX &&
            player.y < level.config.finish.platform.y && player.y + player.height >= level.config.finish.platform.y - 60) {
            this.markAttempt();
            level.complete = true;
            return true;
        }
        return false;
    }
}

// Speed scales simulation, not menus or Web Audio wall time. Subdivide modified
// rates so 2x at 30 FPS never becomes an unstable 1/15-second physics step.
export function simulationSteps(dt, speed = 1) {
    if (speed === 1) return [dt];
    const total = dt * speed, count = Math.max(1, Math.ceil(total / (1 / 120)));
    return Array.from({ length: count }, () => total / count);
}
