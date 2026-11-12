import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { simulateRoute } from "../../levels/design/simulateRoute.js";

export function assertAuthoredRoute(config) {
    const routes = JSON.parse(readFileSync(new URL(`../fixtures/level${config.id}-routes.json`, import.meta.url)));
    assert.deepEqual(routes.map((route) => route.fps), [30, 60, 120]);
    for (const route of routes) {
        const result = simulateRoute(config, route);
        assert.equal(result.success, true, `Level ${config.id} at ${route.fps} FPS: ${JSON.stringify(result)}`);
        assert.deepEqual(new Set(result.coinIds), new Set(config.coins.map((coin) => coin.id)));
    }
}
