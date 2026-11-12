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
    drawBackground(ctx,width,height,cameraX,groundY) {
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
            if(d.x<cameraX-80||d.x>cameraX+width+80)continue;
            if(d.type==="crystals") {
                ctx.save();ctx.fillStyle="rgba(113,215,208,0.07)";ctx.beginPath();
                ctx.ellipse(d.x,groundY-18,48,36,0,0,Math.PI*2);ctx.fill();ctx.restore();
                drawCrystalCluster(ctx,d.x,groundY,d.size,d.color);
            } else if(d.type==="wall-crystals") {
                ctx.save();ctx.globalAlpha*=.55;drawCrystalCluster(ctx,d.x,210,.8,"#a49ad1");ctx.restore();
            } else {
                ctx.fillStyle="#8b8097";ctx.beginPath();ctx.moveTo(d.x-17,groundY);
                ctx.lineTo(d.x-10,groundY-18);ctx.lineTo(d.x+7,groundY-24);
                ctx.lineTo(d.x+18,groundY);ctx.closePath();ctx.fill();
            }
        }
    }
}
