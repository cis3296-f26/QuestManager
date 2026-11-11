// Appearance only. Patrols, collision bounds and reset behavior live in Enemy.js.
// These drawing helpers can be replaced with your own sprites later.
export function drawEnemy(ctx, enemy, cameraX = 0, viewWidth = Infinity) {
    if (enemy.state === "removed" || enemy.x + enemy.width < cameraX || enemy.x > cameraX + viewWidth) return;
    ctx.save();
    ctx.translate(enemy.x + enemy.width / 2, enemy.feetY);
    ctx.scale(enemy.direction, 1);
    if (enemy.state === "defeated") {
        const progress = Math.min(1, enemy.defeatTime / enemy.defeatDuration);
        ctx.scale(1 + progress * 0.2, 1 - progress * 0.9);
        ctx.globalAlpha *= 1 - progress;
    }
    ctx.translate(-enemy.width / 2, -enemy.height);
    ctx.scale(enemy.width / 32, enemy.height / 24);
    // The artwork and its animation stay within the existing hitbox.
    ctx.beginPath();
    ctx.rect(0, 0, 32, 24);
    ctx.clip();

    if (enemy.appearance === "mushroom") drawMushroom(ctx, enemy.walkTime);
    else drawSlime(ctx, enemy.walkTime);
    ctx.restore();
}

function drawSlime(ctx, time) {
    const wobble = Math.sin(time * 9);
    ctx.fillStyle = "#6e944f";
    ctx.strokeStyle = "#403725";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(2, 22);
    ctx.bezierCurveTo(1, 16, 5, 5 + wobble, 14, 4 + wobble);
    ctx.bezierCurveTo(25, 2 + wobble, 30, 13, 30, 22);
    ctx.quadraticCurveTo(23, 24, 17, 21.5);
    ctx.quadraticCurveTo(10, 24, 2, 22);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#a5ba71";
    ctx.beginPath();
    ctx.ellipse(10, 9 + wobble, 4, 2, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#faf0e6";
    ctx.fillRect(18, 11 + wobble * 0.3, 4, 5);
    ctx.fillRect(24, 11 + wobble * 0.3, 4, 5);
    ctx.fillStyle = "#403725";
    ctx.fillRect(20, 12 + wobble * 0.3, 2, 3);
    ctx.fillRect(26, 12 + wobble * 0.3, 2, 3);
    ctx.fillRect(21, 19, 4, 1);
}

function drawMushroom(ctx, time) {
    const step = Math.sin(time * 12);
    const bob = Math.abs(step) * 0.8;
    ctx.fillStyle = "#403725";
    ctx.beginPath();
    ctx.ellipse(11 + step, 22, 5, 1.6, 0, 0, Math.PI * 2);
    ctx.ellipse(23 - step, 22, 5, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#eee1bf";
    ctx.fillRect(11, 11 + bob, 13, 10 - bob);
    ctx.strokeStyle = "#403725";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(11, 11 + bob, 13, 10 - bob);

    // A small terracotta cap, with a few cream spots.
    ctx.fillStyle = "#b86d4d";
    ctx.beginPath();
    ctx.moveTo(2, 14 + bob);
    ctx.bezierCurveTo(2, 7 + bob, 8, 2 + bob, 16, 2 + bob);
    ctx.bezierCurveTo(25, 2 + bob, 30, 7 + bob, 30, 14 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#faf0e6";
    for (const [x, y, radius] of [[9, 9, 2], [18, 6, 2.1], [25, 11, 1.6]]) {
        ctx.beginPath();
        ctx.arc(x, y + bob, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = "#403725";
    ctx.fillRect(16, 16 + bob, 2, 3);
    ctx.fillRect(21, 16 + bob, 2, 3);
}

