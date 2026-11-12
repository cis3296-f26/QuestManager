import { Player } from "../entities/Player.js";
import { Enemy } from "../entities/Enemy.js";
import { Platform } from "../entities/Platform.js";
import { Stalactite } from "../entities/Stalactite.js";
import { GatePuzzle } from "./GatePuzzle.js";
import { Exploration } from "./Exploration.js";
import { Wind } from "../engine/Wind.js";

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
        this.wind = new Wind(config.windZones);
        this.stalactites = (config.stalactites ?? []).map(c => new Stalactite(c));
        this.puzzle = new GatePuzzle(config.switches, config.gates,
            [...this.platforms.filter(p=>p.collision==="solid"), ...(config.barriers??[])]);
        const { platform, flagInset } = config.finish;
        this.flagX = platform.x + platform.width - flagInset;
        this.complete = false;
        this.developerAssisted = false;
    }

    restart() {
        this.player.reset(this.config.spawn);
        this.enemies.forEach((enemy) => enemy.reset());
        this.platforms.forEach((platform) => platform.reset?.());
        this.exploration.reset();
        this.wind.reset();
        this.stalactites.forEach(s => s.reset());
        this.puzzle.reset();
        this.complete = false;
        this.developerAssisted = false;
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


