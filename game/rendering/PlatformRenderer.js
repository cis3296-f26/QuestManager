// Cosmetic warning shake never moves the collision surface or the player's feet.
export function drawInteractivePlatforms(ctx, platforms, cameraX, viewWidth, { reduceMotion = false } = {}) {
    for (const platform of platforms) {
        if (!platform.type || platform.state === "gone" || platform.x + platform.width < cameraX ||
            platform.x > cameraX + viewWidth) continue;
        const { width, height, config } = platform;
        const falling = platform.state === "falling";
        const progress = falling ? Math.min(1, platform.collapseTime / 0.35) : 0;
        const shake = platform.state === "warning" && !reduceMotion ? Math.sin(platform.warningTime * 45) * 2 : 0;
        ctx.save();
        ctx.translate(platform.x + width / 2 + shake, platform.y + progress * progress * 85);
        if (falling) { ctx.rotate(progress * 0.12); ctx.globalAlpha *= 1 - progress; }
        ctx.translate(-width / 2, 0);
        ctx.fillStyle = "#aa8055";
        ctx.strokeStyle = "#51452b";
        ctx.lineWidth = 2;
        ctx.fillRect(0, 0, width, height);
        ctx.strokeRect(1, 1, width - 2, height - 2);
        ctx.fillStyle = "#638647";
        ctx.fillRect(0, 0, width, config.appearance === "grass" ? 8 : 4);
        ctx.strokeStyle = "#795c3f";
        for (let x = 28; x < width - 4; x += 28) {
            ctx.beginPath(); ctx.moveTo(x, 5); ctx.lineTo(x, height - 2); ctx.stroke();
        }
        if (platform.type === "moving") {
            // Simple cream arrows distinguish ferries and lifts from static terrain.
            ctx.strokeStyle = "#faedca";
            ctx.lineWidth = 2;
            ctx.save(); ctx.translate(width / 2, height / 2 + 1);
            if (config.axis === "y") ctx.rotate(Math.PI / 2);
            ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0);
            ctx.moveTo(-5, -4); ctx.lineTo(-9, 0); ctx.lineTo(-5, 4);
            ctx.moveTo(5, -4); ctx.lineTo(9, 0); ctx.lineTo(5, 4); ctx.stroke();
            ctx.restore();
        } else if (platform.state !== "stable") {
            ctx.strokeStyle = "#51452b";
            ctx.lineWidth = 2;
            for (const x of [width * 0.28, width * 0.7]) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 4, height * 0.35);
                ctx.lineTo(x + 3, height * 0.6); ctx.lineTo(x - 2, height); ctx.stroke();
            }
        }
        ctx.restore();
    }
}

