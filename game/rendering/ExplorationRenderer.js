import { drawCrystalCluster } from "./CaveRenderer.js";
// World-space foliage hides a portion of optional terrain, never collision geometry.
// Draw before hazards/enemies/coins/player so threats and collectible silhouettes stay legible.
export function drawExplorationFoliage(ctx, exploration, cameraX, viewWidth) {
    for (const area of exploration.areas) for (const veil of area.foreground ?? []) {
        if (veil.x + veil.width < cameraX || veil.x > cameraX + viewWidth) continue;
        ctx.save();
        ctx.globalAlpha *= 0.52 - (exploration.reveal.get(area.id) ?? 0) * 0.40;
        ctx.translate(veil.x, veil.y);
        if(veil.kind==="crystals") {
            for(let i=0;i<3;i++)drawCrystalCluster(ctx,(i+.5)*veil.width/3,veil.height,(veil.height/40),i%2?"#a99bdf":"#71d7d0");
            ctx.restore();continue;
        }
        if (veil.kind === "roots") {
            ctx.strokeStyle = "#795c3f";
            ctx.lineWidth = 7;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(0, veil.height);
            ctx.quadraticCurveTo(veil.width * 0.15, -veil.height * 0.25, veil.width * 0.52, 6);
            ctx.quadraticCurveTo(veil.width * 0.82, -6, veil.width, veil.height);
            ctx.stroke();
        }
        if (veil.organic) {
            ctx.strokeStyle = "#795c3f"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(0, 9);
            ctx.quadraticCurveTo(veil.width * .5, -8, veil.width, 14); ctx.stroke();
            for (let i = 0; i < 7; i++) {
                const x = (i + .5) * veil.width / 7, y = 5 + (i % 2) * 7;
                ctx.fillStyle = i % 2 ? "#729252" : "#4e7446";
                ctx.beginPath(); ctx.ellipse(x, y, 11, 4, i % 2 ? -.5 : .5, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore(); continue;
        }
        for (let i = 0; i < 5; i++) {
            ctx.fillStyle = i % 2 ? "#729252" : "#4e7446";
            ctx.beginPath();
            const x = (i + 0.5) * veil.width / 5;
            const y = veil.kind === "hedge" ? veil.height * (i % 2 ? 0.65 : 0.4) : veil.height * (i % 2 ? 0.25 : 0.55);
            ctx.ellipse(x, y, veil.width / 7, veil.height * 0.43, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

export function drawDiscoveryNotice(ctx, exploration) {
    if (!exploration.notice || exploration.noticeTime <= 0) return;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, exploration.noticeTime / 0.3);
    ctx.font = "bold 15px Georgia";
    const text = `Found: ${exploration.notice}`;
    const width = Math.min(420, ctx.measureText(text).width + 28);
    // Below the walkable ground, away from the top HUD and jumping routes.
    ctx.fillStyle = "#faf0e6";
    ctx.fillRect(16, 501, width, 27);
    ctx.fillStyle = "#3d5f26";
    ctx.fillText(text, 30, 520, width - 20);
    ctx.restore();
}
