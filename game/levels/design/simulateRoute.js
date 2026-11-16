import { LevelManager } from "../LevelManager.js";
import { CoinManager } from "../CoinManager.js";
import { jump } from "../../engine/Physics.js";
import { movement } from "../../engine/Movement.js";
import { stepLevel } from "../../engine/stepLevel.js";
import { followCamera } from "../../engine/Camera.js";

// Recorded keyboard inputs, starting at spawn. No teleports, noclip, save writes or enemy removal.
export function simulateRoute(config, route, { collection = "all", mainRoute = false } = {}) {
    if (!["all", "none"].includes(collection)) throw new Error("Unknown route collection objective.");
    if (![30, 60, 120].includes(route.fps) || !Number.isInteger(route.totalFrames) || route.totalFrames < 1) throw new Error("Invalid route timing.");
    const level = new LevelManager(config), coins = new CoinManager(config.coins);
    const jumps = new Set(route.jumpFrames), visited = new Set();
    let camera = 0;
    for (let frame = 0; frame < route.totalFrames; frame++) {
        if (jumps.has(frame)) {
            if (!level.player.grounded) return { success: false, reason: "airborne jump input", frame };
            jump(level.player, movement.jumpStrength);
        }
        const direction = route.inputs?.find((input) => frame >= input.from && frame < input.to)?.direction ?? 1;
        if (![-1, 0, 1].includes(direction)) throw new Error("Invalid route direction.");
        const result = stepLevel(level, direction, 1 / route.fps);
        if (result.death) return { success: false, reason: result.death, frame, x: level.player.x };
        if (mainRoute && level.exploration.discovered.size) return { success: false, reason: "entered optional exploration route", frame };
        coins.update(level.player, 1 / route.fps);
        if (collection === "none" && coins.pending.size) return { success: false, reason: "unexpected coin pickup", frame };
        const support = level.player.supportPlatform;
        if (support) visited.add(support.id ?? support.config?.id);
        camera = followCamera(camera, level.player, config.worldWidth, movement.viewWidth, 1 / route.fps);
        if (camera < 0 || camera > config.worldWidth - movement.viewWidth) return { success: false, reason: "camera out of bounds", frame };
        if (level.player.x < camera || level.player.x + level.player.width > camera + movement.viewWidth ||
            level.player.y < movement.hudBottom) return { success: false, reason: "player hidden by viewport or HUD", frame };
        const collectionMet = collection === "none" ? coins.pending.size === 0 : coins.pending.size === 3;
        if (level.checkCompletion()) return { success: collectionMet, reason: collectionMet ? null : "missing coins",
            frame, seconds: (frame + 1) / route.fps, coinIds: [...coins.pending], visited: [...visited],
            discovered: [...level.exploration.discovered], exited: [...level.exploration.exited] };
    }
    return { success: false, reason: "flag not reached", x: level.player.x, coinIds: [...coins.pending], visited: [...visited] };
}

