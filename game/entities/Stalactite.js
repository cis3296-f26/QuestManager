import { sweepAABB } from "../engine/Collision.js";
import { movement } from "../engine/Movement.js";

const bounds = p => ({ x: p.x, y: p.y, width: p.width, height: p.height });

// One attempt's hazard: hanging → warning → falling → spent. Only a falling
// rock is dangerous. Restarting restores its authored position and trigger.
export class Stalactite {
    constructor(config) {
        this.config = config;
        this.reset();
    }

    reset() {
        Object.assign(this, bounds(this.config));
        this.state = "hanging";
        this.warningTime = 0;
        this.warningCount = 0;
        this.impactCount = 0;
        this.impactTime = 0;
    }

    update(dt, player, previous, platforms) {
        const config = this.config;
        if (this.state === "spent") {
            this.impactTime = Math.max(0, this.impactTime - dt);
            return false;
        }
        let remaining = dt, startFraction = 0;
        if (this.state === "hanging") {
            const entry = sweepAABB(previous, bounds(player), config.trigger, config.trigger);
            if (!entry) return false;
            this.state = "warning";
            this.warningCount++;
            // Count only time spent inside/after entering the trigger this tick.
            startFraction = entry.time;
            remaining = dt * (1 - entry.time);
        }
        if (this.state === "warning") {
            const used = Math.min(remaining, Math.max(0, config.warningDuration - this.warningTime));
            this.warningTime += used;
            remaining -= used;
            startFraction += dt > 0 ? used / dt : 0;
            if (this.warningTime + 1e-9 < config.warningDuration) return false;
            this.state = "falling";
        }
        if (this.state !== "falling") return false;

        const start = bounds(this);
        const floor = platforms.filter(p => p.solid !== false && p.y >= this.y + this.height - 1e-7 &&
            this.x < p.x + p.width && this.x + this.width > p.x)
            .reduce((y, p) => Math.min(y, p.y), movement.viewHeight + 80);
        const distance = Math.max(0, floor - this.height - this.y);
        const travel = Math.min(remaining, distance / config.speed);
        this.y += travel * config.speed;

        // Sweep both bodies only during the dangerous part of this frame. A
        // warning ending mid-tick or an impact cannot create a phantom hit.
        const endFraction = dt > 0 ? startFraction + travel / dt : 1;
        const at = t => ({ ...previous,
            x: previous.x + (player.x - previous.x) * t,
            y: previous.y + (player.y - previous.y) * t });
        const hit = travel > 0 && sweepAABB(at(startFraction), at(endFraction), start, bounds(this));
        if (travel < remaining || this.y + this.height >= floor - 1e-7) {
            this.state = "spent";
            this.impactCount++;
            this.impactTime = 0.3;
        }
        return Boolean(hit);
    }
}
