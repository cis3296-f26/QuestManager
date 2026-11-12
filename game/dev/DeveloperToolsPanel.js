import { locationsFor } from "./SafePosition.js";

// Mounted only by the development entry point, inside the existing native dialog.
export class DeveloperToolsPanel {
    constructor({document,pause,pauseMenu,manager,levels,loadLevel,restart,onMap,changed}) {
        Object.assign(this,{document,pause,manager,levels,loadLevel,restart,onMap,changed});
        const make=(tag,text,id)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(id)e.id=id;return e;};
        this.make=make;
        const button=(text,id,callback)=>{const e=make("button",text,id);e.type="button";e.addEventListener("click",callback);return e;};
        const toggle=(parent,text,id,onChange)=>{
            const label=make("label",null,null);label.className="setting-toggle dev-toggle";
            const input=make("input",null,id);input.type="checkbox";
            input.addEventListener("change",()=>{onChange(input.checked);this.sync();changed();});
            label.appendChild(make("span",text));label.appendChild(input);parent.appendChild(label);return input;
        };
        const nav=button("Developer Mode","openDeveloperMode",()=>pause.navigate("developer"));
        nav.className="dev-entry";document.getElementById("pauseSettingsPanel").appendChild(nav);
        this.access=make("section",null,"developerPanel");
        this.access.appendChild(make("p","Local development build · Testing tools only. No administrator permissions or account data are exposed."));
        this.enabled=toggle(this.access,"Enable Developer Tools","enableDeveloperTools",value=>manager.enable(value));
        this.admin=button("Admin Tools","openAdminTools",()=>{this.refreshLocations();pause.navigate("admin");});
        this.access.appendChild(this.admin);
        this.access.appendChild(button("Back to Settings","developerBack",()=>pause.navigate("settings")));
        this.tools=make("section",null,"adminToolsPanel");
        this.fly=toggle(this.tools,"Fly Mode","devFly",value=>manager.set("fly",value));
        this.invincible=toggle(this.tools,"Invincibility","devInvincible",value=>manager.set("invincible",value));
        this.hitboxes=toggle(this.tools,"Show Hitboxes","devHitboxes",value=>manager.set("hitboxes",value));
        const select=(parent,labelText,id)=>{const label=make("label",labelText);label.setAttribute("for",id);const input=make("select",null,id);parent.appendChild(label);parent.appendChild(input);return input;};
        this.speed=select(this.tools,"Game Speed","devSpeed");
        for(const value of [.5,1,2]){const o=make("option",`${value}x`);o.value=String(value);this.speed.appendChild(o);}
        this.speed.addEventListener("change",()=>{manager.set("speed",Number(this.speed.value));this.sync();changed();});
        const controls=make("div",null,"devFlyControls");controls.className="controls-reference dev-help";
        controls.appendChild(make("strong","FLY CONTROLS"));
        controls.appendChild(make("p","W / ↑ Up · S / ↓ Down · A / ← Left · D / → Right · Hold Shift to fly faster."));
        controls.appendChild(make("p","Turning Fly off places you on the nearest safe stable surface. Invincibility keeps gravity; falls recover safely."));
        this.tools.appendChild(controls);
        const navigation=make("fieldset");navigation.className="settings-group";navigation.appendChild(make("legend","Quick navigation"));
        this.level=select(navigation,"Implemented level","devLevel");
        for(const config of levels){const o=make("option",`${config.id}: ${config.name}`);o.value=String(config.id);this.level.appendChild(o);}
        navigation.appendChild(button("Load Level","devLoad",()=>{
            const id=Number(this.level.value);
            if(!manager.canLoad(id,levels))return;
            pause.close();loadLevel(id);
        }));
        this.location=select(navigation,"Safe location in current level","devLocation");
        navigation.appendChild(button("Teleport","devTeleport",()=>{
            if(manager.teleport(this.location.value))this.notice.textContent="Teleported safely. Resume to inspect this test run.";
            else this.notice.textContent="No safe position found; nothing moved.";
            changed();
        }));
        navigation.appendChild(button("Restart Current Level","devRestart",()=>{pause.close();restart();}));
        navigation.appendChild(button("Return to World Map","devMap",()=>{pause.close();onMap();}));
        this.tools.appendChild(navigation);
        this.notice=make("p","Using flight, invincibility, speed, teleport or level bypass marks the entire attempt TEST RUN — PROGRESS NOT SAVED.","devStatus");
        this.notice.className="settings-note";this.notice.setAttribute("role","status");this.tools.appendChild(this.notice);
        this.tools.appendChild(button("Back to Developer Mode","adminBack",()=>pause.navigate("developer")));
        this.tools.appendChild(button("Back to Pause","adminClose",()=>pause.navigate("main")));
        pauseMenu.registerPanel("developer",{element:this.access,title:"Developer Mode",description:"Development tools are session-only and disabled in normal builds.",focus:this.enabled});
        pauseMenu.registerPanel("admin",{element:this.tools,title:"Admin Tools",description:"Gameplay stays paused. Test runs never save progress.",focus:this.fly});
        this.sync();
    }
    sync() {
        this.enabled.checked=this.manager.enabled;this.admin.disabled=!this.manager.enabled;
        for(const key of ["fly","invincible","hitboxes"])this[key].checked=this.manager[key];
        this.speed.value=String(this.manager.speed);
    }
    refreshLocations() {
        const level=this.manager.getLevel();this.level.value=String(level.config.id);this.location.replaceChildren();
        for(const location of locationsFor(level.config)){const option=this.make("option",location.label);option.value=location.id;this.location.appendChild(option);}
        this.location.value="start";this.sync();
    }
}
