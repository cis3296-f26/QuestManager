// Render current state only; warning shake never moves the collision rectangles.
export function drawCaveMechanics(ctx,level,cameraX,width,{reduceMotion=false}={}) {
    for(const rock of level.stalactites) {
        if(rock.x+rock.width<cameraX||rock.x>cameraX+width)continue;
        const {x,y,width:w,height:h,state}=rock;
        ctx.save();
        if(state==="spent") {
            if(rock.impactTime>0) {
                ctx.globalAlpha*=rock.impactTime/.3;ctx.fillStyle="#b6acbf";
                for(const dx of [-10,0,12])ctx.fillRect(x+w/2+dx,y+h-4,5,4);
            }
            ctx.restore();continue;
        }
        const warning=state==="warning";
        const shake=warning&&!reduceMotion?Math.sin(rock.warningTime*45)*2:0;
        ctx.translate(x+shake,y);ctx.fillStyle=warning?"#c0b2c9":"#968ca8";
        ctx.strokeStyle="#e1d4e5";ctx.lineWidth=1.5;
        ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(w,0);ctx.lineTo(w/2,h);ctx.closePath();ctx.fill();ctx.stroke();
        ctx.fillStyle="#86e2da";ctx.beginPath();ctx.moveTo(w*.36,h*.7);ctx.lineTo(w*.64,h*.7);
        ctx.lineTo(w/2,h);ctx.closePath();ctx.fill();
        if(warning) {
            ctx.fillStyle="#faedca";ctx.font="bold 16px Arial";ctx.textAlign="center";
            ctx.fillText("!",w/2,h+19);ctx.textAlign="start";
        }
        ctx.restore();
    }
    for(const s of level.puzzle.switches) {
        ctx.fillStyle="#586275";ctx.fillRect(s.x,s.y+8,s.width,s.height-8);
        const pressed=s.active?(reduceMotion?1:Math.min(1,s.activationTime/.18)):0;
        ctx.fillStyle=s.active?"#b1eee2":"#75bed2";
        ctx.fillRect(s.x+3,s.y+2+pressed*5,s.width-6,8-pressed*5);
        ctx.fillStyle="#f2ecd1";ctx.font="bold 11px Arial";ctx.textAlign="center";
        ctx.fillText(s.active?"OPEN":"BLUE SEAL",s.x+s.width/2,s.y-5);ctx.textAlign="start";
    }
    for(const g of level.puzzle.gates) {
        if(g.x+g.width<cameraX||g.x>cameraX+width)continue;
        ctx.save();ctx.strokeStyle=g.open?"#9be0d5":"#81c5db";ctx.lineWidth=3;
        const progress=g.open?(reduceMotion?1:Math.min(1,g.openTime/.35)):0;
        if(g.open) {
            ctx.globalAlpha*=.45;ctx.strokeRect(g.x,g.y,g.width,g.height);ctx.globalAlpha/=.45;
        }
        if(!g.open||progress<1) {
            ctx.beginPath();ctx.rect(g.x-2,g.y-2,g.width+4,g.height+4);ctx.clip();
            ctx.translate(0,-progress*g.height);
            ctx.globalAlpha*=1-progress;
            ctx.fillStyle="#414b64";ctx.fillRect(g.x,g.y,g.width,g.height);ctx.strokeRect(g.x,g.y,g.width,g.height);
            for(let y=g.y+15;y<g.y+g.height-5;y+=28){ctx.beginPath();ctx.moveTo(g.x+6,y);ctx.lineTo(g.x+g.width/2,y-7);
                ctx.lineTo(g.x+g.width-6,y);ctx.lineTo(g.x+g.width/2,y+7);ctx.closePath();ctx.stroke();}
        }
        ctx.restore();
    }
}
