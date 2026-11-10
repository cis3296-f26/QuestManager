export class Enemy {
    constructor({ startX, minX, maxX, width, height, speed }, feetY) {
        Object.assign(this, { startX, minX, maxX, width, height, speed, feetY });
        this.reset();
    }

    reset() {
        this.x = this.startX;
        this.direction = 1;
        this.walkTime = 0;
    }

    update(dt) {
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
        return player.x < this.x + this.width &&
            player.x + player.width > this.x &&
            player.y < this.feetY &&
            player.y + player.height > this.feetY - this.height;
    }
}
