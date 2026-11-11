export class Enemy {
    constructor({ startX, minX, maxX, width, height, speed, appearance = "slime", stompable = false }, feetY) {
        Object.assign(this, { startX, minX, maxX, width, height, speed, feetY, appearance, stompable });
        this.spawnFeetY = feetY;
        this.defeatDuration = 0.28;
        this.reset();
    }

    reset() {
        this.x = this.startX;
        this.direction = 1;
        this.walkTime = 0;
        this.feetY = this.spawnFeetY;
        this.previousX = this.x;
        this.previousFeetY = this.feetY;
        this.moveUntil = 1;
        this.state = "active";
        this.defeatTime = 0;
    }

    get active() { return this.state === "active"; }

    // Position within the last update. Patrols stop at their boundary for the rest
    // of that frame, just as before; collision sweeps must account for that stop.
    boundsAt(time) {
        const fraction = this.moveUntil > 0 ? Math.min(time / this.moveUntil, 1) : 1;
        return {
            x: this.previousX + (this.x - this.previousX) * fraction,
            y: this.previousFeetY + (this.feetY - this.previousFeetY) * time - this.height,
            width: this.width, height: this.height
        };
    }

    defeat(time = 1) {
        if (!this.active || !this.stompable) return false;
        const bounds = this.boundsAt(time);
        this.x = bounds.x;
        this.feetY = bounds.y + bounds.height;
        this.state = "defeated";
        this.defeatTime = 0;
        return true;
    }

    update(dt) {
        this.previousX = this.x;
        this.previousFeetY = this.feetY;
        this.moveUntil = 1;
        if (!this.active) {
            if (this.state === "defeated") {
                this.defeatTime = Math.min(this.defeatDuration, this.defeatTime + dt);
                if (this.defeatTime >= this.defeatDuration) this.state = "removed";
            }
            return;
        }
        const distance = this.direction > 0 ? this.maxX - this.x : this.x - this.minX;
        if (this.speed * dt > 0) this.moveUntil = Math.max(0, Math.min(1, distance / (this.speed * dt)));
        this.walkTime += dt;
        this.x += this.direction * this.speed * dt;

        if (this.x >= this.maxX) {
            this.x = this.maxX;
            this.direction = -1;
        } else if (this.x <= this.minX) {
            this.x = this.minX;
            this.direction = 1;
        }
    }

    touches(player) {
        return this.active && player.x < this.x + this.width &&
            player.x + player.width > this.x &&
            player.y < this.feetY &&
            player.y + player.height > this.feetY - this.height;
    }
}

