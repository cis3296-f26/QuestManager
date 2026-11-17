import { Player } from "../../entities/Player.js";
import { jump, moveHorizontally, applyGravity } from "../../engine/Physics.js";
import { movement } from "../../engine/Movement.js";

// A local jump graph supplements continuous input proofs. It uses real landing
// collision/integration, but omits enemies and freezes interactive surfaces at
// sampled endpoints. Boarding, timing and collapse escape need runtime tests too.
export function platformReachability(config, fps = 30) {
    const surfaces = config.platforms.flatMap((p) => {
        const base = { ...p, sourceId: p.id, type: undefined };
        if (p.type !== "moving") return [base];
        return [0, 0.5, 1].map((phase) => ({ ...base,
            x: p.x + (p.axis === "x" ? p.distance * phase : 0),
            y: p.y + (p.axis === "y" ? p.distance * phase : 0) }));
    });
    const edges = new Map();
    for (const source of surfaces) {
        const launches = new Set([source.x, source.x + source.width - movement.playerWidth]);
        const clamp = (x) => Math.max(source.x, Math.min(source.x + source.width - movement.playerWidth, x));
        for (const target of surfaces) {
            if (target.x > source.x + source.width + 350 || target.x + target.width < source.x - 350) continue;
            for (const offset of [-190, -130, -70, 0, 70, 130, 190]) {
                launches.add(clamp(target.x + offset));
                launches.add(clamp(target.x + target.width + offset));
            }
        }
        for (const x of launches) for (const direction of [-1, 1]) for (const doJump of [false, true]) {
            const player = new Player({ x, feetY: source.y });
            player.supportPlatform = source;
            if (doJump) jump(player, movement.jumpStrength);
            for (let frame = 0; frame < fps * 1.5; frame++) {
                moveHorizontally(player, direction, movement.speed, config.worldWidth, 1 / fps);
                applyGravity(player, movement.gravity, surfaces, 1 / fps);
                if (player.y >= movement.viewHeight) break;
                const landed = player.supportPlatform;
                if (landed && landed !== source) {
                    if (!edges.has(source.sourceId)) edges.set(source.sourceId, new Set());
                    edges.get(source.sourceId).add(landed.sourceId);
                    break;
                }
                if (doJump && player.grounded) break;
            }
        }
    }
    const reached = new Set(surfaces.filter((p) => p.y === config.spawn.feetY &&
        config.spawn.x >= p.x && config.spawn.x + movement.playerWidth <= p.x + p.width).map((p) => p.sourceId));
    let changed = true;
    while (changed) {
        changed = false;
        for (const id of reached) for (const next of edges.get(id) ?? []) if (!reached.has(next)) { reached.add(next); changed = true; }
    }
    return { reached: [...reached], unreachable: config.platforms.filter((p) => !reached.has(p.id)).map((p) => p.id),
        limitation: "Local jump graph excludes enemy timing; moving endpoints are samples, not boarding proofs." };
}
