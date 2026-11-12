import { readFileSync } from "node:fs";
import { levels } from "../levels/levels.js";
import { validateLevel, jumpEnvelope } from "../levels/design/validateLevel.js";
import { platformReachability } from "../levels/design/platformReachability.js";
import { simulateRoute } from "../levels/design/simulateRoute.js";
import { simulateExploration } from "../levels/design/simulateExploration.js";

let failed = false;
console.log("Measured jump envelope (world pixels; player 32 × 64):");
for (const fps of [30, 60, 120]) {
    const envelope = jumpEnvelope(fps);
    console.log(`  ${fps} FPS: rise ${envelope.rise.toFixed(1)}, same-height travel ${envelope.horizontalTravel.toFixed(1)}`);
}
for (const config of levels) {
    const report = validateLevel(config);
    console.log(`\nLevel ${config.id}: ${config.name} — ${report.counts.sections} sections, ${report.counts.platforms} platforms, ${report.counts.enemies} enemies`);
    for (const error of report.errors) console.error(`  ERROR: ${error}`);
    failed ||= !report.valid;
    for (const warning of report.warnings) console.log(`  REVIEW: ${warning}`);
    if (!report.valid) continue;
    for (const fps of [30, 60, 120]) {
        const graph = platformReachability(config, fps);
        if (graph.unreachable.length) { failed = true; console.error(`  ERROR ${fps} FPS local jump graph: ${graph.unreachable.join(", ")}`); }
        else console.log(`  PASS ${fps} FPS local jump graph: every authored platform reachable`);
    }
    try {
        for (const collection of ["all", "none"]) {
            const suffix = collection === "all" ? "routes" : "main-routes";
            const routes = JSON.parse(readFileSync(new URL(`../tests/fixtures/level${config.id}-${suffix}.json`, import.meta.url)));
            if (routes.length !== 3 || [30, 60, 120].some((fps) => !routes.some((route) => route.fps === fps))) throw new Error(`Missing ${collection} route proof at a required frame rate.`);
            for (const route of routes) {
                const result = simulateRoute(config, route, { collection, mainRoute: collection === "none" });
                if (!result.success) { failed = true; console.error(`  ERROR ${route.fps} FPS ${collection} route: ${JSON.stringify(result)}`); }
                else console.log(`  PASS ${route.fps} FPS spawn → ${collection === "all" ? "all 3 coins" : "zero coins"} → flag (${result.seconds.toFixed(1)}s optimized input trace)`);
            }
        }
    } catch (error) { failed = true; console.error(`  ERROR: ${error.message}`); }
    try {
        const witnesses = JSON.parse(readFileSync(new URL("../tests/fixtures/exploration-routes.json", import.meta.url)));
        for (const area of config.explorationAreas ?? []) {
            const routes = witnesses.filter((route) => route.levelId === config.id && route.areaId === area.id);
            if (routes.length !== 3 || [30, 60, 120].some((fps) => !routes.some((route) => route.fps === fps))) throw new Error(`Missing exploration witness for ${area.id}.`);
            for (const route of routes) {
                const result = simulateExploration(config, route);
                if (!result.success) { failed = true; console.error(`  ERROR ${area.id}, ${route.fps} FPS: ${JSON.stringify(result)}`); }
                else console.log(`  PASS ${route.fps} FPS local entrance → ${area.title}${area.coinId ? " + coin" : ""} → safe reconnection`);
            }
        }
    } catch (error) { failed = true; console.error(`  ERROR: ${error.message}`); }
    for (const check of report.manualChecks) console.log(`  MANUAL: ${check}`);
}
console.log("\nMoving boarding/exits and collapse warning/escape/reset scenarios: run npm test as well.");
process.exitCode = failed ? 1 : 0;

