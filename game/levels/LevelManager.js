import { Player } from "../entities/Player.js";
import { Enemy } from "../entities/Enemy.js";

export class LevelManager {
    constructor(config) {
        this.config = config;
        this.player = new Player(config.spawn);
        this.enemy = new Enemy(config.creature, config.groundY);
        const { platform, flagInset } = config.finish;
        this.flagX = platform.x + platform.width - flagInset;
        this.complete = false;
    }

    restart() {
        this.player.reset(this.config.spawn);
        this.enemy.reset();
        this.complete = false;
    }

    // Report the first contact with the flag while standing on its platform.
    checkCompletion() {
        if (this.complete) return false;
        const { player, flagX } = this;
        this.complete = player.grounded &&
            player.y + player.height === this.config.finish.platform.y &&
            player.x <= flagX &&
            player.x + player.width >= flagX;
        return this.complete;
    }
}
