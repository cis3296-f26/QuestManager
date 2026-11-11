// One menu state governs the whole game loop, never individual enemies/platforms.
export class GamePauseManager {
    constructor(canPause = () => true) {
        this.canPause = canPause;
        this.screen = null;
        this.listeners = new Set();
    }
    get paused() { return this.screen !== null; }
    subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
    change(screen) {
        if (screen === this.screen) return false;
        this.screen = screen;
        this.listeners.forEach((listener) => listener(screen));
        return true;
    }
    open(screen = "main") {
        if (this.paused || !this.canPause() || !["main", "restart", "map"].includes(screen)) return false;
        return this.change(screen);
    }
    navigate(screen) {
        if (!this.paused || !(screen === "main" || this.screen === "main" && ["settings", "restart", "map"].includes(screen))) return false;
        return this.change(screen);
    }
    close() { return this.change(null); }
    escape() { return this.screen === "main" ? this.close() : this.navigate("main"); }
}

// Wall time never enters gameplay after a pause, focus loss, or navigation.
export class GameClock {
    constructor() { this.reset(); }
    reset() { this.last = null; this.wasActive = false; }
    frame(time, active) {
        const dt = this.last === null ? 0 : Math.max(0, Math.min((time - this.last) / 1000, 1 / 30));
        this.last = time;
        if (!active) { this.wasActive = false; return null; }
        if (!this.wasActive) { this.wasActive = true; return 0; }
        return dt;
    }
}
