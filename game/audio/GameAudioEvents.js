// Translate confirmed gameplay transitions into cues. No hitbox, timer or save mutations.
export class GameAudioEvents {
    constructor(audio) { this.audio = audio; this.reset(); }
    reset() { this.footPhase = 0; }
    jump() { this.footPhase = 0; this.audio.stopEffect("footstep"); this.audio.play("jump"); }
    capture(level, coins) {
        return { grounded: level.player.grounded, walkPhase: level.player.walkPhase,
            coins: new Set(coins.pending), platforms: new Map(level.platforms.filter((p) => p.type === "collapsing").map((p) => [p, p.state])) };
    }
    after(before, level, coins, result) {
        const player = level.player;
        for (const id of coins.pending) if (!before.coins.has(id)) this.audio.play("coin");
        for (const enemy of result.stomped) this.audio.play("stomp");
        if (!before.grounded && player.grounded && !result.stomped.length) this.audio.play("land");
        if (player.grounded && player.isMoving) {
            this.footPhase += (player.walkPhase - before.walkPhase + Math.PI * 2) % (Math.PI * 2);
            if (this.footPhase >= Math.PI * 2) { this.footPhase %= Math.PI * 2; this.audio.play("footstep"); }
        } else { this.footPhase = 0; this.audio.stopEffect("footstep"); }
        for (const [platform, previous] of before.platforms) {
            if (previous === "stable" && platform.state === "warning") this.audio.play("crack");
            if (previous === "warning" && ["falling", "gone"].includes(platform.state)) this.audio.play("break");
        }
    }
}
