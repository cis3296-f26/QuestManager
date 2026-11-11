import { Player } from "../entities/Player.js";
import { Enemy } from "../entities/Enemy.js";
import { Platform } from "../entities/Platform.js";
import { Exploration } from "./Exploration.js";

export class LevelManager {
    constructor(config) {
        this.load(config);
    }

    load(config) {
        this.config = config;
        this.player = new Player(config.spawn);
        this.platforms = config.platforms.map((platform) => platform.type ? new Platform(platform) : platform);
        this.enemies = config.enemies.map((enemy) => new Enemy(enemy, enemy.feetY ?? config.groundY));
        this.exploration = new Exploration(config.explorationAreas);
        const { platform, flagInset } = config.finish;
        this.flagX = platform.x + platform.width - flagInset;
        this.complete = false;
    }

    restart() {
        this.player.reset(this.config.spawn);
        this.enemies.forEach((enemy) => enemy.reset());
        this.platforms.forEach((platform) => platform.reset?.());
        this.exploration.reset();
        this.complete = false;
    }

    updatePlatforms(dt) {
        this.platforms.forEach((platform) => platform.update?.(dt));
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


