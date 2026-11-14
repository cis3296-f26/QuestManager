import { toggleClimb } from "../../engine/Climbing.js";
import { LevelManager } from "../LevelManager.js";
import { CoinManager } from "../CoinManager.js";
import { jump } from "../../engine/Physics.js";
import { movement } from "../../engine/Movement.js";
import { stepLevel } from "../../engine/stepLevel.js";
import { followCamera } from "../../engine/Camera.js";

// Local witnesses begin on the area's declared, validated entrance terrain.
// Full spawn-to-flag proofs remain separate; these are not whole-level playthroughs.
export function simulateExploration(config, route) {
    const area = config.explorationAreas?.find((area) => area.id === route.areaId);
    if (!area || ![30, 60, 120].includes(route.fps) || !Number.isInteger(route.totalFrames) || route.totalFrames < 1) throw new Error("Invalid exploration witness.");
    const start = { x: area.entrance.x, feetY: area.entrance.y + area.entrance.height };
    if (route.start?.x !== start.x || route.start?.feetY !== start.feetY) throw new Error("Witness must start at its declared entrance.");
    const level = new LevelManager({ ...config, spawn: start }), coins = new CoinManager(config.coins);
    const jumps = new Set(route.jumpFrames);
    let camera = Math.max(0, Math.min(config.worldWidth - movement.viewWidth, start.x - movement.viewWidth * 0.45));
    const ridden = new Set();
    for (let frame = 0; frame < route.totalFrames; frame++) {
        if (route.interactFrames?.includes(frame) && !toggleClimb(level)) return { success: false, reason: "unreachable climb interaction", frame };
        if (jumps.has(frame)) {
            if (!level.player.grounded && !level.player.climbingId) return { success: false, reason: "airborne jump", frame };
            jump(level.player, movement.jumpStrength);
        }
        const direction = route.inputs?.find((i) => frame >= i.from && frame < i.to)?.direction ?? 1;
        if (![-1, 0, 1].includes(direction)) throw new Error("Invalid witness direction.");
        const result = stepLevel(level, direction, 1 / route.fps, { climbVertical: route.climbInputs?.find(i=>frame>=i.from&&frame<i.to)?.vertical ?? 0 });
        if (result.death) return { success: false, reason: result.death, frame };
        coins.update(level.player, 1 / route.fps);
        const support = level.player.supportPlatform;
        if (support?.type === "moving") ridden.add(support.config.id);
        camera = followCamera(camera, level.player, config.worldWidth, movement.viewWidth, 1 / route.fps);
        if (level.player.y < movement.hudBottom || level.player.x < camera ||
            level.player.x + level.player.width > camera + movement.viewWidth) return { success: false, reason: "hidden player", frame };
        if (level.exploration.exited.has(area.id) && (!area.coinId || coins.pending.has(area.coinId))) return {
            success: true, coinIds: [...coins.pending], discovered: [...level.exploration.discovered],
            exited: [...level.exploration.exited], ridden: [...ridden], seconds: (frame + 1) / route.fps };
    }
    return { success: false, reason: "area, reward or reconnection not reached", x: level.player.x };
}
