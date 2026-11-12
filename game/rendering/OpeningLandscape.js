// An authored opening vista, not another scenery generator. It fades back to
// the existing grassland art before the next section; other levels never use it.
export function drawOpeningLandscape(ctx, renderer, width, height, cameraX, scene) {
    if (cameraX >= scene.end) return;
    const opacity = Math.max(0, Math.min(1, (scene.end - cameraX) / (scene.end - scene.fadeStart)));
    ctx.save();
    ctx.globalAlpha *= opacity;
    ctx.fillStyle = "#b9e1ef";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#f6edc7";
    ctx.beginPath(); ctx.arc(width - 115, 108, 23, 0, Math.PI * 2); ctx.fill();
    for (const cloud of scene.clouds) {
        ctx.save(); ctx.translate(cloud.x - cameraX * .12, cloud.y); ctx.scale(cloud.scale, cloud.scale);
        renderer.drawCloud(ctx, 0, 0); ctx.restore();
    }
    // Unequal, broad hills frame the oak and the dell, avoiding identical short
    // repeating humps. Low contrast keeps the real grass edge unambiguous.
    for (const [depth, color, points] of [
        [.16, "#a3c7b0", [-500, 430, 200, 220, 840, 470, 1500, 260, 2350, 450]],
        [.3, "#83ae8d", [-400, 505, 60, 320, 750, 515, 1450, 350, 2380, 485]]
    ]) {
        ctx.save(); ctx.translate(-cameraX * depth, 0); ctx.fillStyle = color;
        ctx.beginPath(); ctx.moveTo(points[0], height); ctx.lineTo(points[0], points[1]);
        ctx.quadraticCurveTo(points[2], points[3], points[4], points[5]);
        ctx.quadraticCurveTo(points[6], points[7], points[8], points[9]);
        ctx.lineTo(points[8], height); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    ctx.restore();
}
