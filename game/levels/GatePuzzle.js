import { sweepAABB } from "../engine/Collision.js";

const bounds = p => ({ x: p.x, y: p.y, width: p.width, height: p.height });

// Attempt state only. Opening a gate never changes a permanent save or a level
// definition. Touch switches and grounded pressure plates share the same links.
export class GatePuzzle {
    constructor(switches = [], gates = []) {
        this.switches = switches.map(config => ({ ...config, active: false }));
        this.gates = gates.map(config => ({ ...config, open: false }));
        this.reset();
    }

    reset() {
        this.switches.forEach(s => { s.active = false; s.activationTime = 0; });
        this.gates.forEach(g => { g.open = false; g.openTime = 0; });
        this.activationCount = 0;
    }

    update(player, previous, dt = 0, { ignoreWalls = false } = {}) {
        for (const s of this.switches) if (s.active) s.activationTime = Math.min(.35, s.activationTime + dt);
        for (const gate of this.gates) if (gate.open) gate.openTime = Math.min(.35, gate.openTime + dt);
        // Resolve walls first: a fast player cannot activate a switch through a
        // closed gate. Open gates never close or crush players during an attempt.
        for (const gate of this.gates.filter(g => !g.open && !ignoreWalls)) {
            const hit = sweepAABB(previous, bounds(player), gate, gate);
            if (!hit) continue;
            if (!hit.normalX && !hit.normalY) {
                // Corners have no single normal; embedded debug/restored starts
                // also need separation. Use CONTACT position, never overshoot.
                const x = previous.x + (player.x - previous.x) * hit.time;
                const y = previous.y + (player.y - previous.y) * hit.time;
                const choices = [
                    { distance: Math.abs(x + player.width - gate.x), axis: "x", value: gate.x - player.width },
                    { distance: Math.abs(x - gate.x - gate.width), axis: "x", value: gate.x + gate.width },
                    { distance: Math.abs(y + player.height - gate.y), axis: "y", value: gate.y - player.height },
                    { distance: Math.abs(y - gate.y - gate.height), axis: "y", value: gate.y + gate.height }
                ];
                const separation = choices.sort((a, b) => a.distance - b.distance)[0];
                player[separation.axis] = separation.value;
                if (separation.axis === "y") player.velocityY = 0;
            } else if (hit.normalX < 0) player.x = gate.x - player.width;
            else if (hit.normalX > 0) player.x = gate.x + gate.width;
            else if (hit.normalY > 0) {
                player.y = gate.y + gate.height;
                player.velocityY = Math.max(0, player.velocityY);
            } else if (hit.normalY < 0) {
                player.y = gate.y - player.height;
                player.velocityY = 0;
                player.grounded = true;
                player.supportPlatform = gate;
            }
        }
        for (const s of this.switches) {
            if (s.active) continue;
            if (s.mode === "plate" && (!player.grounded ||
                Math.abs(player.y + player.height - s.y - s.height) > 1)) continue;
            if (!sweepAABB(previous, bounds(player), s, s)) continue;
            s.active = true;
            this.activationCount++;
            this.gates.filter(g => s.gateIds.includes(g.id)).forEach(g => g.open = true);
        }
    }
}
