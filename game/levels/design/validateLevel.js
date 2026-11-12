import { validateCaveMechanics } from "./validateCaveMechanics.js";
import { validateWind } from "../../engine/Wind.js";
import { movement } from "../../engine/Movement.js";
import { jump, moveHorizontally, applyGravity } from "../../engine/Physics.js";
import { Player } from "../../entities/Player.js";
import { Platform } from "../../entities/Platform.js";
import { validateTreeSpacing } from "../../rendering/SceneryGeometry.js";
import { validatePlatformPurpose } from "./validatePlatformPurpose.js";
import { validateExploration } from "./validateExploration.js";

const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x &&
    a.y < b.y + b.height && a.y + a.height > b.y;
const rectangle = (p) => [p.x, p.y, p.width, p.height].every(Number.isFinite) && p.width > 0 && p.height > 0;

// Measure the discrete integration actually used by gameplay, not a continuous approximation.
export function jumpEnvelope(fps) {
    const player = new Player({ x: 0, feetY: 460 });
    jump(player, movement.jumpStrength);
    let rise = 0, frames = 0;
    do {
        moveHorizontally(player, 1, movement.speed, 10000, 1 / fps);
        applyGravity(player, movement.gravity, [], 1 / fps);
        rise = Math.max(rise, 460 - player.y - player.height);
        frames++;
    } while (player.y + player.height < 460 && frames < fps * 3);
    return { fps, rise, horizontalTravel: player.x, seconds: frames / fps };
}

// Structural checks never edit level definitions, runtime state, saves, or the database.
// Successful route simulations are still required: a geometric check cannot establish fairness.
export function validateLevel(config) {
    const errors = [...validateWind(config), ...validateCaveMechanics(config), ...validateExploration(config), ...validatePlatformPurpose(config), ...validateTreeSpacing(config.scenery, config.groundY)], warnings = [];
    const fail = (message) => errors.push(message);
    const { platforms = [], enemies = [], coins = [], hazards = [], stages = [] } = config;
    const ids = new Set();
    for (const object of [...platforms, ...enemies, ...coins, ...hazards, ...(config.stalactites ?? []), ...(config.switches ?? []), ...(config.gates ?? []), ...(config.barriers ?? []), ...(config.windZones ?? [])]) {
        if (!object.id || ids.has(object.id)) fail(`Missing or duplicate object ID: ${object.id}`);
        ids.add(object.id);
    }
    if (!Number.isFinite(config.worldWidth) || config.worldWidth < movement.viewWidth) fail("Invalid world width.");
    if (coins.length !== 3 || new Set(coins.map((coin) => coin.id)).size !== 3) fail("Exactly three unique coins are required.");
    let end = 0;
    const stageIds = new Set();
    for (const stage of stages) {
        if (!stage.id || stageIds.has(stage.id)) fail(`Duplicate or missing section ID: ${stage.id}`);
        stageIds.add(stage.id);
        if (stage.start !== end || !(stage.end > stage.start)) fail(`Section coverage is broken at ${stage.id}.`);
        end = stage.end;
        if (!stage.purpose || !stage.difficulty || !stage.title) fail(`Section ${stage.id} needs a purpose, difficulty and title.`);
        const localIds = new Set((stage.platforms ?? []).map((p) => p.id));
        for (const p of stage.platforms ?? []) if (p.x < stage.start || p.x + p.width > stage.end) fail(`Platform ${p.id} leaves its authored section.`);
        for (const id of stage.requiredRoute ?? []) if (!localIds.has(id)) fail(`Unknown required platform ${id} in ${stage.id}.`);
        for (const route of stage.optionalRoutes ?? []) {
            if (!route.purpose || !route.platforms?.length) fail(`Optional route in ${stage.id} needs a purpose and platforms.`);
            for (const id of route.platforms ?? []) if (!localIds.has(id)) fail(`Unknown optional platform ${id}.`);
            if (route.coinId && !(stage.coins ?? []).some((coin) => coin.id === route.coinId)) fail(`Unknown route coin ${route.coinId}.`);
        }
    }
    if (!stages.length || end !== config.worldWidth) fail("Sections must cover the complete level.");
    for (const p of platforms) {
        if (!rectangle(p) || p.x < 0 || p.x + p.width > config.worldWidth || p.y < 0 || p.y + p.height > movement.viewHeight) fail(`Invalid platform geometry: ${p.id}.`);
        if (!p.role) fail(`Platform ${p.id} needs a gameplay role.`);
        if (p.type) {
            try { new Platform(p); } catch { fail(`Invalid interactive platform: ${p.id}.`); }
        }
        const top = p.y + (p.type === "moving" && p.axis === "y" ? Math.min(0, p.distance) : 0);
        if (top - movement.playerHeight - jumpEnvelope(120).rise < movement.hudBottom) fail(`Platform ${p.id} can put the jumping player behind the HUD.`);
        if (p.y < config.groundY && p.y + p.height > config.groundY - movement.playerHeight &&
            platforms.some((ground) => ground !== p && ground.y === config.groundY && ground.x < p.x + p.width && ground.x + ground.width > p.x)) fail(`Platform ${p.id} has insufficient ground headroom.`);
        if (!p.terrain && platforms.some(bank => bank.terrain && bank.y > p.y &&
            bank.x < p.x + p.width && bank.x + bank.width > p.x &&
            p.y + p.height > bank.y - movement.playerHeight)) fail(`Platform ${p.id} has insufficient terrace headroom.`);
        if (p.type === "moving") {
            const envelope = { ...p, x: p.x + (p.axis === "x" ? Math.min(0, p.distance) : 0),
                y: p.y + (p.axis === "y" ? Math.min(0, p.distance) : 0),
                width: p.width + (p.axis === "x" ? Math.abs(p.distance) : 0),
                height: p.height + (p.axis === "y" ? Math.abs(p.distance) : 0) };
            if (envelope.x < 0 || envelope.x + envelope.width > config.worldWidth || envelope.y < 0) fail(`Moving platform leaves level bounds: ${p.id}.`);
            if (platforms.some((other) => other !== p && overlaps(envelope, other))) fail(`Moving path overlaps terrain: ${p.id}.`);
        }
        if (p.type === "collapsing" && (p.collapseDelay ?? 1) < 0.75) warnings.push(`Short reaction time on ${p.id}; playtest the escape.`);
    }
    for (let a = 0; a < platforms.length; a++) for (let b = a + 1; b < platforms.length; b++) {
        if (!platforms[a].type && !platforms[b].type && overlaps(platforms[a], platforms[b])) fail(`Overlapping terrain: ${platforms[a].id}, ${platforms[b].id}.`);
    }
    const spawn = { x: config.spawn?.x, y: config.spawn?.feetY - movement.playerHeight, width: movement.playerWidth, height: movement.playerHeight };
    if (!rectangle(spawn) || !platforms.some((p) => !p.type && spawn.y + spawn.height === p.y && spawn.x >= p.x && spawn.x + spawn.width <= p.x + p.width)) fail("Spawn has no safe static support.");
    if (platforms.some((p) => overlaps(spawn, p)) || hazards.some((h) => overlaps(spawn, h))) fail("Spawn overlaps terrain or a hazard.");
    for (const enemy of enemies) {
        const feetY = enemy.feetY ?? config.groundY;
        const patrol = { x: enemy.minX, y: feetY - enemy.height, width: enemy.maxX - enemy.minX + enemy.width, height: enemy.height };
        if (!rectangle(patrol) || enemy.startX < enemy.minX || enemy.startX > enemy.maxX || !enemy.purpose || !(enemy.speed > 0)) fail(`Invalid patrol or missing purpose: ${enemy.id}.`);
        if (!enemy.flying && !platforms.some((p) => !p.type && p.y === feetY && patrol.x >= p.x && patrol.x + patrol.width <= p.x + p.width)) fail(`Unsupported patrol: ${enemy.id}.`);
        if (platforms.some((p) => !p.type && overlaps(patrol, p))) fail(`Enemy patrol intersects terrain: ${enemy.id}.`);
        if (enemy.flying && (feetY - enemy.height < movement.hudBottom || feetY > movement.viewHeight || enemy.stompable)) fail(`Invalid flying patrol: ${enemy.id}.`);
        if (patrol.x < 0 || patrol.x + patrol.width > config.worldWidth) fail(`Patrol leaves level bounds: ${enemy.id}.`);
        if (overlaps(spawn, patrol)) fail(`Enemy patrol covers spawn: ${enemy.id}.`);
        if (hazards.some((h) => overlaps(patrol, h))) fail(`Enemy patrol intersects a hazard: ${enemy.id}.`);
    }
    for (const coin of coins) {
        const box = { x: coin.x - 12, y: coin.y - 15, width: 24, height: 30 };
        if (!rectangle(box) || box.x < 0 || box.x + box.width > config.worldWidth || box.y < movement.hudBottom) fail(`Invalid or hidden coin: ${coin.id}.`);
        if (platforms.some((p) => overlaps(box, p)) || hazards.some((h) => overlaps(box, h))) fail(`Coin overlaps terrain or hazard: ${coin.id}.`);
        if (enemies.some((enemy) => overlaps(box, { x: enemy.startX,
            y: (enemy.feetY ?? config.groundY) - enemy.height, width: enemy.width, height: enemy.height }))) fail(`Coin overlaps an enemy spawn: ${coin.id}.`);
    }
    for (const h of hazards) if (!rectangle(h) || h.x < 0 || h.x + h.width > config.worldWidth) fail(`Invalid hazard: ${h.id}.`);
    const finish = config.finish?.platform;
    if (!finish || !platforms.includes(finish) || finish.type || config.finish.flagInset < 0 || config.finish.flagInset > finish.width) fail("Finish needs a valid static flag platform.");
    const ground = platforms.filter((p) => !p.type && (p.y === config.groundY || p.terrain)).sort((a, b) => a.x - b.x);
    const conservativeTravel = jumpEnvelope(30).horizontalTravel;
    for (let i = 1; i < ground.length; i++) {
        const gap = ground[i].x - ground[i - 1].x - ground[i - 1].width;
        if (gap > conservativeTravel * 0.8) warnings.push(`Gap before ${ground[i].id} is ${gap}px; verify its raised takeoff or comfortable timing.`);
    }
    return { valid: errors.length === 0, errors, warnings,
        manualChecks: ["Readability, reaction time and perceived difficulty require human playtesting.",
            "Route proofs show one successful timing, not every possible moving-platform phase or enemy encounter."],
        counts: { sections: stages.length, platforms: platforms.length, enemies: enemies.length, coins: coins.length } };
}

