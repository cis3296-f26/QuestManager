// All hazards use level-defined bounds. Add new renderers by type as needed.
export function touchesHazard(player, hazards) {
    return hazards.some((hazard) =>
        player.x < hazard.x + hazard.width &&
        player.x + player.width > hazard.x &&
        player.y < hazard.y + hazard.height &&
        player.y + player.height > hazard.y);
}

export function drawHazards(ctx, hazards) {
    ctx.save();
    for (const hazard of hazards) {
        if (hazard.type !== "spikes") continue;
        ctx.fillStyle = "#754c3b";
        ctx.strokeStyle = "#51452b";
        ctx.lineWidth = 2;
        const count = Math.max(1, Math.round(hazard.width / 20));
        const width = hazard.width / count;
        for (let i = 0; i < count; i++) {
            const x = hazard.x + i * width;
            ctx.beginPath();
            ctx.moveTo(x, hazard.y + hazard.height);
            ctx.lineTo(x + width / 2, hazard.y);
            ctx.lineTo(x + width, hazard.y + hazard.height);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    }
    ctx.restore();
}
