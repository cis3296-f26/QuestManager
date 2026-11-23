// One play session, from level start until its flag. Automatic death recovery
// keeps these totals; navigation, replay and manual restart explicitly reset them.
export class RunStats {
    constructor() { this.reset(); }
    reset() {
        this.elapsed = 0;
        this.deaths = 0;
        this.assisted = false;
        this.result = null;
    }
    advance(dt, { assisted = false } = {}) {
        if (!Number.isFinite(dt) || dt < 0) throw new RangeError("Invalid run timestep.");
        if (this.result) return;
        this.elapsed += dt;
        if (assisted) this.markAssisted();
    }
    markAssisted() { if (!this.result) this.assisted = true; }
    recordDeath() { if (!this.result) this.deaths++; }
    finish() {
        // Freeze before account verification: saving latency is never play time.
        this.result ??= Object.freeze({ timeMs: Math.round(this.elapsed * 1000),
            deaths: this.deaths, assisted: this.assisted });
        return this.result;
    }
}

export const validCompletionTime = ms => Number.isSafeInteger(ms) && ms > 0;
export function fastestTime(...times) {
    const valid = times.filter(validCompletionTime);
    return valid.length ? Math.min(...valid) : null;
}
