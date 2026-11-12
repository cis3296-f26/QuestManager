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
    else if(enemy.appearance==="scorpion")drawScorpion(ctx,enemy.walkTime);
    else if(enemy.appearance==="bat")drawBat(ctx,enemy.walkTime);
    else drawSlime(ctx, enemy.walkTime,enemy.appearance==="cave-slime");
    ctx.restore();
}

function drawSlime(ctx, time, cave=false) {
    const wobble = Math.sin(time * 9);
    ctx.fillStyle = cave?"#8c8dc4":"#6e944f";
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

    ctx.fillStyle = cave?"#a2ddd5":"#a5ba71";
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



function drawBat(ctx,time) {
    const flap=Math.sin(time*14)*5;
    ctx.fillStyle="#625078";ctx.strokeStyle="#e0cbe5";ctx.lineWidth=1;
    for(const side of [-1,1]) {
        ctx.beginPath();ctx.moveTo(16,12);ctx.lineTo(16+side*15,3+flap);
        ctx.lineTo(16+side*12,17);ctx.lineTo(16+side*7,14);ctx.lineTo(16+side*4,20);ctx.closePath();ctx.fill();ctx.stroke();
    }
    ctx.fillStyle="#8f78a2";ctx.beginPath();ctx.ellipse(16,13,5,8,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.moveTo(11,9);ctx.lineTo(11,2);ctx.lineTo(15,6);ctx.lineTo(18,6);ctx.lineTo(21,2);ctx.lineTo(21,10);ctx.fill();
    ctx.fillStyle="#faf0e6";ctx.fillRect(13,10,2,3);ctx.fillRect(18,10,2,3);
}

// Muted orange body, dark outline and lifted tail distinguish dangerous scorpions
// from green cacti. All limbs remain inside the existing normalized hitbox.
function drawScorpion(ctx,time) {
    const step=Math.sin(time*12)*1.5;
    ctx.strokeStyle="#62432e";ctx.lineWidth=1.7;ctx.lineCap="round";
    for(const side of [-1,1])for(let i=0;i<3;i++) {
        const x=10+i*4;ctx.beginPath();ctx.moveTo(x,18);ctx.lineTo(x+side*4+(i%2?step:-step),23);ctx.stroke();
    }
    ctx.strokeStyle="#805235";ctx.lineWidth=4;
    ctx.beginPath();ctx.moveTo(10,17);ctx.bezierCurveTo(-2,13,1,1,8,3);ctx.quadraticCurveTo(12,4,10,8);ctx.stroke();
    ctx.fillStyle="#62432e";ctx.beginPath();ctx.moveTo(9,6);ctx.lineTo(14,9);ctx.lineTo(9,10);ctx.fill();
    ctx.fillStyle="#c78650";ctx.strokeStyle="#62432e";ctx.lineWidth=1.5;
    ctx.beginPath();ctx.ellipse(16,17,9,5,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    for(const y of [12,20]) {
        ctx.beginPath();ctx.moveTo(21,17);ctx.lineTo(27,y);ctx.lineTo(30,y-2);ctx.moveTo(27,y);ctx.lineTo(31,y+2);ctx.stroke();
    }
    ctx.fillStyle="#faf0e6";ctx.fillRect(20,13,4,3);ctx.fillStyle="#403725";ctx.fillRect(22,13,2,2);
}
