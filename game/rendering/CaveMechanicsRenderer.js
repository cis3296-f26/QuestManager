// Render current state only; warning shake never moves the collision rectangles.
export function drawCaveMechanics(ctx,level,cameraX,width,{reduceMotion=false}={}) {
    const temple=level.config.theme==="temple", mountainBiome=level.config.theme==="mountain";
    // Sealed alcoves are visibly stone, unlike blue-edged jump-through runways.
    for(const wall of level.config.barriers??[]) {
        if(wall.x+wall.width<cameraX||wall.x>cameraX+width)continue;
        ctx.fillStyle=mountainBiome?"#888b87":temple?"#9c8662":"#91869f";ctx.fillRect(wall.x,wall.y,wall.width,wall.height);
        ctx.strokeStyle=mountainBiome?"#626d70":temple?"#d6bd8a":"#d0c7d7";ctx.lineWidth=2;ctx.strokeRect(wall.x,wall.y,wall.width,wall.height);
        ctx.fillStyle=mountainBiome?"#9da19a":temple?"#b8a17a":"#b4a7c2";
        for(let y=wall.y+8;y<wall.y+wall.height;y+=28)
            ctx.fillRect(wall.x+5,y,Math.min(12,wall.width-10),3);
    }
    for(const rock of level.stalactites) {
        if(rock.x+rock.width<cameraX||rock.x>cameraX+width)continue;
        const {x,y,width:w,height:h,state}=rock;
        const ice=rock.config.appearance==="icicle", mountain=rock.config.appearance==="rock";
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
        ctx.translate(x+shake,y);ctx.fillStyle=ice?(warning?"#e1f7fa":"#87c5dd"):warning?"#c0b2c9":"#968ca8";
        ctx.strokeStyle=ice?"#356d8b":"#e1d4e5";ctx.lineWidth=1.5;
        if(mountain){
            ctx.fillStyle=warning?"#c4b896":"#8c9494";ctx.strokeStyle="#535f64";
            ctx.beginPath();ctx.moveTo(w*.2,0);ctx.lineTo(w*.75,2);ctx.lineTo(w,h*.4);ctx.lineTo(w*.8,h);ctx.lineTo(w*.2,h*.9);ctx.lineTo(0,h*.35);ctx.closePath();ctx.fill();ctx.stroke();
            ctx.beginPath();ctx.moveTo(w*.4,3);ctx.lineTo(w*.5,h*.4);ctx.lineTo(w*.3,h*.55);ctx.stroke();
        }else{ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(w,0);ctx.lineTo(w/2,h);ctx.closePath();ctx.fill();ctx.stroke();}
        ctx.fillStyle=ice?"#e4faff":mountain?"#a8a69b":"#86e2da";ctx.beginPath();ctx.moveTo(w*.36,h*.7);ctx.lineTo(w*.64,h*.7);
        ctx.lineTo(w/2,h);ctx.closePath();ctx.fill();
        if(warning) {
            ctx.fillStyle="#faedca";ctx.font="bold 16px Arial";ctx.textAlign="center";
            ctx.fillText("!",w/2,h+19);ctx.textAlign="start";
        }
        ctx.restore();
        if(warning) {
            const floor=level.platforms.filter(p=>p.solid!==false&&p.y>=y+h&&x<p.x+p.width&&x+w>p.x)
                .reduce((top,p)=>Math.min(top,p.y),540);
            ctx.save();ctx.fillStyle="#e9bd74";ctx.globalAlpha*=.8;
            ctx.fillRect(x-5,floor-5,w+10,4);ctx.restore();
        }
    }
    for(const s of level.puzzle.switches) {
        if(s.x+s.width<cameraX||s.x>cameraX+width)continue;
        ctx.fillStyle="#586275";ctx.fillRect(s.x,s.y+8,s.width,s.height-8);
        const pressed=s.active?(reduceMotion?1:Math.min(1,s.activationTime/.18)):0;
        ctx.fillStyle=s.active?"#b1eee2":temple?"#dcb867":"#75bed2";
        ctx.fillRect(s.x+3,s.y+2+pressed*5,s.width-6,8-pressed*5);
        ctx.fillStyle="#f2ecd1";ctx.font="bold 11px Arial";ctx.textAlign="center";
        ctx.fillText(s.active?(s.openDuration?`${s.remainingTime.toFixed(1)}s`:"OPEN"):
            s.openDuration?`${s.openDuration}s SWITCH`:(s.label??"BLUE SEAL"),s.x+s.width/2,s.y-5);
        if(s.openDuration) {
            ctx.fillStyle="#b1eee2";ctx.fillText(s.active?"← RUN BACK":s.mode==="stomp"?"STOMP TO OPEN":"STEP TO OPEN",s.x+s.width/2,s.y-23);
        }
        ctx.textAlign="start";
    }
    for(const s of level.puzzle.switches)for(const id of s.routePlatformIds??[]) {
        const p=level.platforms.find(p=>p.id===id);
        if(!p||p.x+p.width<cameraX||p.x>cameraX+width)continue;
        ctx.fillStyle=temple?"#dcb867":"#75bed2";ctx.fillRect(p.x+3,p.y,p.width-6,4);
    }
    for(const g of level.puzzle.gates) {
        if(g.x+g.width<cameraX||g.x>cameraX+width)continue;
        ctx.save();ctx.strokeStyle=g.open?"#9be0d5":temple?"#dcb867":"#81c5db";ctx.lineWidth=3;
        const progress=g.open?(reduceMotion?1:Math.min(1,g.openTime/.35)):0;
        if(g.open) {
            ctx.globalAlpha*=.45;ctx.strokeRect(g.x,g.y,g.width,g.height);ctx.globalAlpha/=.45;
        }
        if(!g.open||progress<1) {
            ctx.beginPath();ctx.rect(g.x-2,g.y-2,g.width+4,g.height+4);ctx.clip();
            ctx.translate(0,-progress*g.height);
            ctx.globalAlpha*=1-progress;
            ctx.fillStyle=temple?"#685c47":"#414b64";ctx.fillRect(g.x,g.y,g.width,g.height);ctx.strokeRect(g.x,g.y,g.width,g.height);
            for(let y=g.y+15;y<g.y+g.height-5;y+=28){ctx.beginPath();ctx.moveTo(g.x+6,y);ctx.lineTo(g.x+g.width/2,y-7);
                ctx.lineTo(g.x+g.width-6,y);ctx.lineTo(g.x+g.width/2,y+7);ctx.closePath();ctx.stroke();}
        }
        ctx.restore();
        if(g.exitSide==="left") {
            ctx.save();ctx.fillStyle="#b1eee2";ctx.font="10px Arial";ctx.textAlign="right";
            ctx.fillText("EXIT →",g.x-10,g.y+g.height-32);ctx.restore();
        }
        if(g.open&&g.remainingTime>0) {
            ctx.save();ctx.fillStyle=g.remainingTime<1.5?"#f2c57e":"#b1eee2";
            ctx.font="bold 13px Arial";ctx.textAlign="center";
            ctx.fillText(`${g.remainingTime.toFixed(1)}s`,g.x+g.width/2,g.countdownY??g.y+g.height+18);ctx.restore();
        }
    }
}
