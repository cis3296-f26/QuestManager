import { CollectibleCoin } from "../entities/CollectibleCoin.js";

// Attempt state only. This module never reads or writes persistent progress.
export class CoinManager {
    constructor(definitions = []) {
        const ids = definitions.map((coin) => coin.id);
        if (definitions.length !== 3 || new Set(ids).size !== 3 ||
            definitions.some((coin) => typeof coin.id !== "string" || !coin.id ||
                !Number.isFinite(coin.x) || !Number.isFinite(coin.y))) {
            throw new Error("A collectible level needs exactly three coins with unique IDs and positions.");
        }
        this.coins = definitions.map((coin) => new CollectibleCoin(coin));
        this.reset();
    }

    reset(savedIds = []) {
        this.saved = new Set(savedIds);
        this.pending = new Set();
        this.effects = [];
        this.time = 0;
    }

    discard() {
        this.pending.clear();
        this.effects = [];
    }

    get count() { return this.coins.filter((coin) => this.saved.has(coin.id) || this.pending.has(coin.id)).length; }

    update(player, dt) {
        this.time += dt;
        this.effects = this.effects.filter((effect) => (effect.age += dt) < 0.55);
        let changed = false;
        for (const coin of this.coins) {
            if (this.saved.has(coin.id) || this.pending.has(coin.id) || !coin.touches(player, this.time)) continue;
            this.pending.add(coin.id);
            this.effects.push({ x: coin.x, y: coin.centerY(this.time), age: 0 });
            changed = true;
        }
        return changed;
    }

    draw(ctx, cameraX, viewWidth) {
        for (const coin of this.coins) {
            if (this.pending.has(coin.id) || coin.x + 18 < cameraX || coin.x - 18 > cameraX + viewWidth) continue;
            coin.draw(ctx, this.time, this.saved.has(coin.id));
        }
        for (const effect of this.effects) {
            const progress = effect.age / 0.55;
            ctx.save();
            ctx.translate(effect.x, effect.y - progress * 25);
            ctx.globalAlpha *= 1 - progress;
            ctx.strokeStyle = "#efbd43";
            ctx.lineWidth = 2;
            for (let i = 0; i < 6; i++) {
                const angle = i * Math.PI / 3;
                const radius = 10 + progress * 20;
                ctx.beginPath();
                ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
                ctx.lineTo(Math.cos(angle) * (radius + 4), Math.sin(angle) * (radius + 4));
                ctx.stroke();
            }
            ctx.fillStyle = "#795b29";
            ctx.font = "bold 16px Georgia";
            ctx.textAlign = "center";
            ctx.fillText("+1", 0, -12);
            ctx.restore();
        }
    }
}
