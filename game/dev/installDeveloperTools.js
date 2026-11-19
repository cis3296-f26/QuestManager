import { DeveloperModeManager, simulationSteps } from "./DeveloperModeManager.js";
import { DeveloperToolsPanel } from "./DeveloperToolsPanel.js";
import { drawDebug, drawDeveloperIndicator } from "./DebugRenderer.js";

export function installDeveloperTools(options) {
    const manager=new DeveloperModeManager({available:true,getLevel:options.getLevel});
    options.pause.registerScreens({developer:"settings",admin:"developer"});
    const panel=new DeveloperToolsPanel({...options,manager});
    manager.panel=panel;
    manager.draw=(ctx,coins,camera)=>{
        if(manager.enabled&&manager.hitboxes)drawDebug(ctx,manager.getLevel(),coins,camera);
        drawDeveloperIndicator(ctx,manager.getLevel().developerAssisted,manager.enabled);
    };
    manager.steps=dt=>simulationSteps(dt,manager.enabled?manager.speed:1);
    return manager;
}
