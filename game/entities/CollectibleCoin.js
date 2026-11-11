// Position is the coin's center in world space. IDs never depend on array order.
export class CollectibleCoin {
    constructor({ id, x, y }) {
        Object.assign(this, { id, x, y });
        this.radius = 12;
    }

    centerY(time) { return this.y + Math.sin(time * 2.8 + this.x) * 3; }

    touches(player, time) {
        const y = this.centerY(time);
        const nearX = Math.max(player.x, Math.min(this.x, player.x + player.width));
        const nearY = Math.max(player.y, Math.min(y, player.y + player.height));
        return (nearX - this.x) ** 2 + (nearY - y) ** 2 <= this.radius ** 2;
    }

    draw(ctx, time, earned) {
        ctx.save();
        ctx.translate(this.x, this.centerY(time));
        ctx.globalAlpha *= earned ? 0.28 : 1;
        ctx.scale(0.3 + Math.abs(Math.cos(time * 2.4)) * 0.7, 1);
        ctx.fillStyle = earned ? "#cbb69f" : "#efbd43";
        ctx.strokeStyle = "#795b29";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = earned ? "#faf0e6" : "#fff0a1";
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -5);
        ctx.lineTo(0, 5);
        ctx.stroke();
        ctx.restore();
    }
}
