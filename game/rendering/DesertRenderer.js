import { GrasslandRenderer } from "./GrasslandRenderer.js";

// Canvas-only desert materials and landmarks. All visible slopes/dunes are behind
// the rectangular gameplay surfaces; the pool is decorative water below its bank.
export class DesertRenderer extends GrasslandRenderer {
    drawBackground(ctx,width,height,cameraX,groundY,theme,landscape) {
        ctx.save();ctx.fillStyle="#b9deeb";ctx.fillRect(0,0,width,height);
        ctx.fillStyle="#fff0be";ctx.beginPath();ctx.arc(width-120,118,28,0,Math.PI*2);ctx.fill();
        for(const [x,y] of landscape?.desertClouds??[[210,145],[810,180],[1390,130],[2080,165]]) {
            const screen=x-cameraX*.12;if(screen>-70&&screen<width+70){ctx.save();ctx.globalAlpha=.8;this.drawCloud(ctx,screen,y);ctx.restore();}
        }
        // Distant mesas, then broad dunes: different scales/colors establish depth.
        ctx.fillStyle="#d3af91";
        for(const [x,y,w] of landscape?.desertMesas??[[-200,290,400],[460,255,260],[1020,310,350],[1650,270,330],[2350,300,400]]) {
            const at=x-cameraX*.16;
            ctx.beginPath();ctx.moveTo(at,height);ctx.lineTo(at+35,y+60);ctx.lineTo(at+90,y);
            ctx.lineTo(at+w-80,y);ctx.lineTo(at+w,y+100);ctx.lineTo(at+w+70,height);ctx.closePath();ctx.fill();
        }
        this.drawHills(ctx,width,height,cameraX*.24,510,1100,180,"#eac98e");
        this.drawHills(ctx,width,height,cameraX*.37,550,840,150,"#dab078");
        ctx.restore();
    }
    drawDecorations(ctx,decorations,groundY,cameraX,width) {
        for(const d of decorations) {
            const reach=d.reach??95,base=d.baseY??groundY;
            if(d.x+reach<cameraX||d.x-reach>cameraX+width)continue;
            ctx.save();ctx.translate(d.x,base);
            const top=(d.top??base-140)-base;
            if(d.type==="cactus") {
                ctx.scale(d.scale??1,d.scale??1);ctx.strokeStyle="#42684e";ctx.lineWidth=14;ctx.lineCap="round";
                ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(0,-62);ctx.moveTo(0,-27);
                ctx.lineTo(-20,-27);ctx.lineTo(-20,-45);ctx.moveTo(0,-40);ctx.lineTo(19,-40);ctx.lineTo(19,-53);ctx.stroke();
                ctx.strokeStyle="#83a66b";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-2,-8);ctx.lineTo(-2,-60);ctx.stroke();
            } else if(d.type==="palm") {
                ctx.scale(d.scale??1,d.scale??1);ctx.strokeStyle="#8d6b44";ctx.lineWidth=12;
                ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(12,-60,0,-125);ctx.stroke();
                ctx.strokeStyle="#c0a171";ctx.lineWidth=3;
                for(let y=-15;y>-120;y-=18){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(9,y-4);ctx.stroke();}
                ctx.fillStyle="#4d865d";
                for(const side of [-1,1])for(const rise of [0,25,48]) {
                    ctx.beginPath();ctx.moveTo(0,-125);ctx.quadraticCurveTo(side*44,-160-rise*.2,side*75,-105-rise);
                    ctx.quadraticCurveTo(side*38,-125-rise*.4,0,-125);ctx.fill();
                }
            } else if(d.type==="oasis-pool") {
                ctx.fillStyle="#76b6b5";ctx.beginPath();ctx.ellipse(0,-18,d.reach,18,0,0,Math.PI*2);ctx.fill();
                ctx.strokeStyle="#b5e2d4";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-130,-19);ctx.lineTo(-20,-19);ctx.moveTo(40,-12);ctx.lineTo(120,-12);ctx.stroke();
                // Reeds hug the pool's edge, leaving the player's route legible.
                ctx.strokeStyle="#5c8763";for(const x of [-185,-172,165,180]){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x-4,-22);ctx.stroke();}
            } else if(d.type==="stone-arch"||d.type==="ruin-arch") {
                ctx.strokeStyle=d.type==="stone-arch"?"#c5a078":"#b79770";ctx.lineWidth=18;
                ctx.beginPath();ctx.moveTo(-reach+15,0);ctx.lineTo(-reach+15,top+30);
                ctx.quadraticCurveTo(0,top-5,reach-15,top+30);ctx.lineTo(reach-15,0);ctx.stroke();
                ctx.strokeStyle="#e6c599";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-reach+5,top+25);ctx.quadraticCurveTo(0,top-17,reach-5,top+25);ctx.stroke();
            } else if(d.type==="cave-mouth") {
                ctx.fillStyle="#8c7e78";ctx.beginPath();ctx.moveTo(-95,0);ctx.lineTo(-80,-135);ctx.lineTo(18,-155);ctx.lineTo(78,-83);ctx.lineTo(82,0);ctx.fill();
                ctx.fillStyle="#5e575b";ctx.beginPath();ctx.ellipse(-7,-35,40,64,0,Math.PI,Math.PI*2);ctx.lineTo(33,0);ctx.lineTo(-47,0);ctx.fill();
            } else if(d.type==="ruin-pillar") {
                ctx.fillStyle="#c5a078";ctx.fillRect(-17,top,34,-top);ctx.fillRect(-27,top-10,54,15);
                ctx.strokeStyle="#edd3a5";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-10,top+8);ctx.lineTo(-10,-7);ctx.stroke();
                ctx.strokeStyle="#9e7c5c";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(12,top+28);ctx.lineTo(-4,top+43);ctx.lineTo(7,top+57);ctx.stroke();
            } else if(d.type==="sandstone-spire") {
                ctx.fillStyle="#be9870";ctx.beginPath();ctx.moveTo(-42,0);ctx.lineTo(-28,top+15);ctx.lineTo(28,top+15);ctx.lineTo(42,0);ctx.closePath();ctx.fill();
                ctx.strokeStyle="#dabc8c";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-30,-40);ctx.lineTo(30,-40);ctx.moveTo(-27,-85);ctx.lineTo(27,-85);ctx.stroke();
            } else {
                ctx.strokeStyle="#8c9b5b";ctx.lineWidth=2;
                for(const dx of [-9,0,8]){ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(dx,-14-Math.abs(dx)/2);ctx.stroke();}
            }
            ctx.restore();
        }
    }
}

export function drawWind(ctx,wind,cameraX,width,{reduceMotion=false}={}) {
    for(const z of wind.zones) {
        if(z.x+z.width<cameraX||z.x>cameraX+width)continue;
        const state=wind.state(z),active=state.phase==="gust",warning=state.phase==="warning";
        ctx.save();ctx.strokeStyle=active?"#8e603d":warning?"#b2763f":"#a19779";
        ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=2;
        const sign=z.direction,anchor=z.x+45;
        ctx.font="bold 12px Arial";
        ctx.fillText(`${sign>0?"→":"←"} ${active?"GUST":warning?"WIND SOON":"CALM"}${Number.isFinite(state.remaining)?` · ${state.remaining.toFixed(1)}s`:""}`,anchor,150);
        // Wind ribbons sit above the jumping line, never in front of the player.
        for(let i=0;i<3;i++) {
            const x=anchor+i*21, flutter=reduceMotion?0:Math.sin(wind.time*8+i)*3;
            ctx.beginPath();ctx.moveTo(x,164);ctx.lineTo(x+sign*14,164+flutter);
            ctx.lineTo(x+sign*10,160+flutter);ctx.stroke();
        }
        ctx.globalAlpha*=active?.5:warning?.28:.13;ctx.fillStyle="#9f7750";
        const span=z.width;
        for(let i=0;i<16;i++) {
            const drift=reduceMotion?0:wind.time*sign*(active?90:15);
            const x=z.x+((i*73+drift)%span+span)%span,y=z.y+20+(i*37)%(z.height-35);
            ctx.fillRect(x,y,active?8:4,1.5);
        }
        ctx.restore();
    }
}
