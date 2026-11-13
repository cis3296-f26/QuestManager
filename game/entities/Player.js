import { PlayerAnimation } from "./PlayerAnimation.js";
import { movement } from "../engine/Movement.js";

export class Player {
    constructor(spawn) {
        this.width = movement.playerWidth;
        this.height = movement.playerHeight;
        this.animation = new PlayerAnimation();
        this.reset(spawn);
    }

    reset(spawn) {
        this.x = spawn.x;
        this.y = spawn.feetY - this.height;
        this.velocityY = 0;
        this.velocityX = 0;
        this.iceAirborne = false;
        this.grounded = true;
        this.supportPlatform = null;
        this.facing = 1;
        this.walkPhase = 0;
        this.isMoving = false;
        this.animation.reset();
    }

    trackMovement(previousX) {
        const distance = this.x - previousX;
        this.isMoving = distance !== 0;
        if (this.isMoving) {
            this.facing = Math.sign(distance);
            this.walkPhase = (this.walkPhase + Math.abs(distance) / 12) % (Math.PI * 2);
        } else {
            this.walkPhase = 0;
        }
    }
}


