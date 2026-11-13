import { movement } from "../../engine/Movement.js";

// New hazards/puzzles use the same world coordinates and IDs as existing content.
export function validateCaveMechanics(config) {
    const errors=[];
    const box=p=>p&&[p.x,p.y,p.width,p.height].every(Number.isFinite)&&p.width>0&&p.height>0&&
        p.x>=0&&p.x+p.width<=config.worldWidth&&p.y>=movement.hudBottom&&p.y+p.height<=movement.viewHeight;
    const gates=config.gates??[], switches=config.switches??[];
    for(const barrier of config.barriers??[])if(!box(barrier))errors.push(`Invalid solid barrier: ${barrier.id}.`);
    for(const rock of config.stalactites??[]) {
        if(!box(rock)||!box(rock.trigger)||!(rock.speed>0)||!Number.isFinite(rock.speed)||
            !(rock.warningDuration>0)||!Number.isFinite(rock.warningDuration))errors.push(`Invalid stalactite: ${rock.id}.`);
    }
    for(const gate of gates) {
        if(!box(gate))errors.push(`Invalid gate: ${gate.id}.`);
        if(gate.exitSide!==undefined&&!["left","right"].includes(gate.exitSide))errors.push(`Invalid gate exit side: ${gate.id}.`);
        if(!switches.some(s=>s.gateIds?.includes(gate.id)))errors.push(`Gate ${gate.id} has no connected switch.`);
    }
    for(const s of switches) {
        if(s.openDuration !== undefined && (!Number.isFinite(s.openDuration) || s.openDuration <= 0))
            errors.push(`Invalid switch duration: ${s.id}.`);
        if(!box(s)||!["touch","plate","stomp"].includes(s.mode)||!s.gateIds?.length||
            s.gateIds.some(id=>!gates.some(g=>g.id===id)))errors.push(`Invalid switch: ${s.id}.`);
        if(s.mode!=="touch"&&!config.platforms.some(p=>!p.type&&p.y===s.y+s.height&&p.x<=s.x&&p.x+p.width>=s.x+s.width))
            errors.push(`Pressure plate ${s.id} needs a stable landing.`);
        if(s.routePlatformIds?.some(id=>!config.platforms.some(p=>p.id===id)))
            errors.push(`Switch ${s.id} has an unknown route platform.`);
    }
    return errors;
}
