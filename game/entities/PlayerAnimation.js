// Visual state only: never writes to the player's position, velocity or hitbox.
export class PlayerAnimation {
    constructor() { this.reset(); }

    reset() {
        this.time = 0;
        this.wasGrounded = true;
        this.landingTime = 0;
        this.deathAnchor = null;
        this.state = "idle";
        this.pose = {
            xScale: 1, yScale: 1, tilt: 0, lift: 0,
            leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0,
            opacity: 1, spriteFrame: 0
        };
    }

    beginDeath(player, viewHeight) {
        // Keep the effect visible even when the physical player has fallen offscreen.
        this.deathAnchor = {
            x: player.x + player.width / 2,
            feetY: Math.min(player.y + player.height, viewHeight - 16)
        };
        this.landingTime = 0;
        this.state = "dead";
    }

    update(player, dt, { dead = false, deathProgress = 0, complete = false } = {}) {
        this.time += dt;
        const target = {
            xScale: 1, yScale: 1, tilt: 0, lift: 0,
            leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0
        };
        if (dead) {
            const progress = Math.max(0, Math.min(1, deathProgress));
            this.state = "dead";
            target.tilt = -progress * 1.2;
            target.lift = Math.sin(progress * Math.PI) * 25;
            target.leftArm = -0.85;
            target.rightArm = 0.85;
            target.leftLeg = -0.35;
            target.rightLeg = 0.35;
            this.pose.opacity = 1 - Math.max(0, progress - 0.35) / 0.65;
            this.pose.spriteFrame = 0;
        } else {
            this.pose.opacity = 1;
            this.landingTime = Math.max(0, this.landingTime - dt);
            if (player.grounded && !this.wasGrounded && !complete) this.landingTime = 0.18;

            if (complete) {
                this.state = "complete";
            } else if (!player.grounded) {
                this.state = player.velocityY < 0 ? "jump" : "fall";
                const air = Math.max(-1, Math.min(1, player.velocityY / 350));
                target.tilt = -air * 0.10;
                target.xScale = 1 + air * 0.05;
                target.yScale = 1 - air * 0.08;
                target.leftArm = -0.4 - Math.max(0, air) * 0.3;
                target.rightArm = 0.4 + Math.max(0, air) * 0.3;
                target.leftLeg = -0.25;
                target.rightLeg = 0.25;
            } else if (player.isMoving) {
                this.state = "run";
                const stride = Math.sin(player.walkPhase);
                target.leftArm = stride * 0.38;
                target.rightArm = -stride * 0.38;
                target.leftLeg = -stride * 0.48;
                target.rightLeg = stride * 0.48;
                target.lift = Math.abs(stride) * 1.5;
                target.tilt = 0.035;
            } else {
                this.state = "idle";
                const breath = Math.sin(this.time * 2.6);
                target.yScale = 1 + breath * 0.012;
                target.leftArm = breath * 0.025;
                target.rightArm = -breath * 0.025;
            }

            if (this.landingTime > 0 && player.grounded && !complete) {
                this.state = "land";
                const squash = Math.sin(this.landingTime / 0.18 * Math.PI);
                target.xScale *= 1 + squash * 0.12;
                target.yScale *= 1 - squash * 0.14;
            }
            // Idle equipment frames stay in step with the base avatar.
            this.pose.spriteFrame = this.state === "idle" ? Math.floor(this.time / 0.3) : 0;
        }

        const blend = 1 - Math.exp(-18 * dt);
        for (const key of Object.keys(target)) {
            this.pose[key] += (target[key] - this.pose[key]) * blend;
        }
        this.wasGrounded = player.grounded;
    }
}
