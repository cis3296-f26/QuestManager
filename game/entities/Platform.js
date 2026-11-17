// Only interactive terrain gets a runtime object. Static level rectangles stay unchanged.
export class Platform {
    constructor(config) {
        this.config = { ...config };
        const moving = config.type === "moving";
        if (!["moving", "collapsing"].includes(config.type) ||
            !Number.isFinite(config.x) || !Number.isFinite(config.y) ||
            !Number.isFinite(config.width) || !(config.width > 0) ||
            !Number.isFinite(config.height) || !(config.height > 0) ||
            (moving && (!["x", "y"].includes(config.axis) || !Number.isFinite(config.speed) || !(config.speed > 0) ||
                !Number.isFinite(config.distance) || config.distance === 0 ||
                !Number.isFinite(config.pause ?? 0.25) || (config.pause ?? 0.25) < 0 ||
                !Number.isFinite(config.startProgress ?? 0) || (config.startProgress ?? 0) < 0 || (config.startProgress ?? 0) > 1 ||
                ![1, -1].includes(config.startDirection ?? 1))) ||
            (!moving && (!Number.isFinite(config.collapseDelay ?? 1) || !((config.collapseDelay ?? 1) > 0)))) {
            throw new Error("Interactive platforms need valid positions, dimensions and movement or collapse settings.");
        }
        this.type = config.type;
        this.width = config.width;
        this.height = config.height;
        this.reset();
    }

    get solid() { return this.state !== "falling" && this.state !== "gone"; }

    reset() {
        this.elapsed = 0;
        this.state = "stable";
        this.warningTime = 0;
        this.collapseTime = 0;
        this.position();
        this.previousX = this.x;
        this.previousY = this.y;
        this.deltaX = 0;
        this.deltaY = 0;
    }

    position() {
        if (this.type === "collapsing") {
            this.x = this.config.x;
            this.y = this.config.y;
            return;
        }
        const { x, y, axis, distance, speed, pause = 0.25, startProgress = 0, startDirection = 1 } = this.config;
        const travel = Math.abs(distance) / speed;
        const offset = startDirection < 0 ? travel + pause + (1 - startProgress) * travel : startProgress * travel;
        const time = (this.elapsed + offset) % (2 * (travel + pause));
        const progress = time < travel ? time / travel : time < travel + pause ? 1 :
            time < 2 * travel + pause ? 1 - (time - travel - pause) / travel : 0;
        this.x = x + (axis === "x" ? distance * progress : 0);
        this.y = y + (axis === "y" ? distance * progress : 0);
    }

    update(dt) {
        this.previousX = this.x;
        this.previousY = this.y;
        this.elapsed += dt;
        if (this.type === "moving") this.position();
        else if (this.state === "warning") {
            this.warningTime += dt;
            const delay = this.config.collapseDelay ?? 1;
            if (this.warningTime + 1e-9 >= delay) {
                this.state = "falling";
                this.collapseTime = Math.max(0, this.warningTime - delay);
                this.warningTime = delay;
            }
        } else if (this.state === "falling") this.collapseTime += dt;
        if (this.state === "falling" && this.collapseTime + 1e-9 >= 0.35) this.state = "gone";
        this.deltaX = this.x - this.previousX;
        this.deltaY = this.y - this.previousY;
    }

    onLand() {
        if (this.type === "collapsing" && this.state === "stable") this.state = "warning";
    }
}
