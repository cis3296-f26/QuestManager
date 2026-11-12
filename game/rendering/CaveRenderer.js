// Cave scenery is cosmetic. Light ledge edges and teal hazard tips remain distinct
// from these low-contrast, sparse silhouettes. No tree art or foliage in this theme.
export function drawCrystalCluster(ctx,x,y,size=1,color="#71d7d0") {
    ctx.save();ctx.translate(x,y);ctx.scale(size,size);
    ctx.fillStyle=color;ctx.strokeStyle="#526477";ctx.lineWidth=1;
    for(const [dx,h,w] of [[-14,19,9],[0,32,12],[13,23,9]]) {
        ctx.beginPath();ctx.moveTo(dx-w/2,0);ctx.lineTo(dx-w/2,-h+7);
        ctx.lineTo(dx,-h);ctx.lineTo(dx+w/2,-h+7);ctx.lineTo(dx+w/2,0);ctx.closePath();ctx.fill();ctx.stroke();
        ctx.strokeStyle="#d3eeea";ctx.beginPath();ctx.moveTo(dx,-h+6);ctx.lineTo(dx,-4);ctx.stroke();ctx.strokeStyle="#526477";
    }
    ctx.restore();
}
export class CaveRenderer {
    drawBackground(ctx,width,height,cameraX,groundY,theme,landscape) {
        ctx.save();ctx.fillStyle="#59576c";ctx.fillRect(0,0,width,height);
        for(const [depth,color,period] of [[.15,"#646078",390],[.3,"#726c85",510]]) {
            const offset=cameraX*depth, first=Math.floor(offset/period)-1;
            ctx.fillStyle=color;
            for(let i=first;i<first+Math.ceil(width/period)+3;i++) {
                const x=i*period-offset;
                ctx.beginPath();ctx.moveTo(x,height);ctx.lineTo(x,groundY-40);
                ctx.lineTo(x+period*.18,groundY-155);ctx.lineTo(x+period*.37,groundY-65);
                ctx.lineTo(x+period*.6,groundY-105);ctx.lineTo(x+period,groundY-20);
                ctx.lineTo(x+period,height);ctx.closePath();ctx.fill();
            }
        }
        if(landscape?.caveRooms) {
            ctx.fillStyle="#59576c";ctx.fillRect(0,0,width,height);
            for(const room of landscape.caveRooms) {
                const x=room.x-cameraX*.22,w=room.width;
                if(x+w<0||x>width)continue;
                ctx.fillStyle="#6a647d";ctx.beginPath();ctx.moveTo(x,height);ctx.lineTo(x,330);
                ctx.quadraticCurveTo(x+w*.08,room.roof,x+w*.5,room.roof);
                ctx.quadraticCurveTo(x+w*.92,room.roof,x+w,330);
                ctx.lineTo(x+w,height);ctx.closePath();ctx.fill();
                ctx.fillStyle="#736d85";ctx.fillRect(x+22,350,20,height-350);
            }
        }
        // A quiet ceiling band frames pointed, teal-tipped interactive rocks at y=92.
        ctx.fillStyle="#484656";ctx.fillRect(0,0,width,82);
        const offset=cameraX*.3;
        for(let i=Math.floor(offset/210);i<(offset+width)/210+1;i++) {
            const x=i*210-offset;ctx.beginPath();ctx.moveTo(x,80);ctx.lineTo(x+19,96);
            ctx.lineTo(x+42,80);ctx.closePath();ctx.fill();
        }
        ctx.restore();
    }
    drawDecorations(ctx,decorations,groundY,cameraX,width) {
        for(const d of decorations) {
            const reach=d.reach??80,baseY=d.baseY??groundY;
            if(d.x+reach<cameraX||d.x-reach>cameraX+width)continue;
            if(d.type==="cave-arch") {
                // Recessed masonry outlines sit behind gameplay. They frame the
                // actual ledge without adding a false floor or foreground wall.
                ctx.save();ctx.strokeStyle="#79718b";ctx.lineWidth=12;
                ctx.beginPath();ctx.moveTo(d.x-d.reach,baseY);
                ctx.lineTo(d.x-d.reach,d.top+35);
                ctx.quadraticCurveTo(d.x,d.top-20,d.x+d.reach,d.top+35);
                ctx.lineTo(d.x+d.reach,baseY);ctx.stroke();ctx.restore();continue;
            }
            if(d.type==="crystals") {
                ctx.save();ctx.fillStyle="rgba(113,215,208,0.07)";ctx.beginPath();
                ctx.ellipse(d.x,baseY-18,48,36,0,0,Math.PI*2);ctx.fill();ctx.restore();
                drawCrystalCluster(ctx,d.x,baseY,d.size,d.color);
            } else if(d.type==="wall-crystals") {
                ctx.save();ctx.globalAlpha*=.55;drawCrystalCluster(ctx,d.x,210,.8,"#a49ad1");ctx.restore();
            } else {
                ctx.fillStyle="#8b8097";ctx.beginPath();ctx.moveTo(d.x-17,baseY);
                ctx.lineTo(d.x-10,baseY-18);ctx.lineTo(d.x+7,baseY-24);
                ctx.lineTo(d.x+18,baseY);ctx.closePath();ctx.fill();
            }
        }
    }
}
