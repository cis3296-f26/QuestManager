import { sweepAABB } from "../engine/Collision.js";

const bounds = p => ({ x: p.x, y: p.y, width: p.width, height: p.height });

// Attempt state only. Opening a gate never changes a permanent save or a level
// definition. Optional openDuration makes a plate a reusable timed switch.
export class GatePuzzle {
    constructor(switches = [], gates = [], barriers = []) {
        // Opt-in masonry uses the existing swept gate-wall collision path.
        // Normal platforms remain jump-through; solid floor references retain
        // their identity so the shared gravity/support system still owns landing.
        this.barriers = barriers;
        this.switches = switches.map(config => ({ ...config, active: false }));
        this.gates = gates.map(config => ({ ...config, open: false }));
        this.reset();
    }

    reset() {
        this.switches.forEach(s => { s.active = false; s.activationTime = 0; s.remainingTime = 0; s.wasPressed = false; });
        this.gates.forEach(g => { g.open = false; g.openTime = 0; g.remainingTime = 0; });
        this.activationCount = 0;
    }

    update(player, previous, dt = 0, { ignoreWalls = false } = {}) {
        for (const s of this.switches) if (s.active) {
            s.activationTime = Math.min(.35, s.activationTime + dt);
            if (s.openDuration) {
                s.remainingTime = Math.max(0, s.remainingTime - dt);
                if (s.remainingTime <= 1e-9) { s.remainingTime = 0; s.active = false; }
            }
        }
        for (const gate of this.gates) {
            const linked = this.switches.filter(s => s.gateIds.includes(gate.id));
            const active = linked.filter(s => s.active);
            gate.remainingTime = Math.max(0, ...active.map(s => s.remainingTime));
            const occupied = player.x < gate.x + gate.width && player.x + player.width > gate.x &&
                player.y < gate.y + gate.height && player.y + player.height > gate.y;
            // Closing never crushes or teleports someone straddling the doorway.
            // This grace lasts only until they clear its collision rectangle.
            gate.open = active.length > 0 || (gate.open && occupied);
            if (!gate.open) gate.openTime = 0;
        }
        for (const gate of this.gates) if (gate.open) gate.openTime = Math.min(.35, gate.openTime + dt);
        // Resolve walls first: a fast player cannot activate a switch through a
        // closed gate. Timed gates close only when the doorway is clear.
        for (const gate of ignoreWalls ? [] : [...this.barriers, ...this.gates.filter(g => !g.open)]) {
            const hit = sweepAABB(previous, bounds(player), gate, gate);
            if (!hit) continue;
            // A closed gate can always be left from its configured
            // protected side, so collecting the coin can never trap the player.
            const leaving = (gate.exitSide === "left" && hit.normalX < 0 &&
                previous.x + player.width <= gate.x + 1e-7 && player.x > previous.x) ||
                (gate.exitSide === "right" && hit.normalX > 0 &&
                previous.x >= gate.x + gate.width - 1e-7 && player.x < previous.x);
            if (leaving) { gate.open = true; gate.openTime = 0; continue; }
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
            const onTop = player.grounded && Math.abs(player.y + player.height - s.y - s.height) <= 1;
            const pressed = (s.mode === "touch" || onTop) &&
                Boolean(sweepAABB(previous, bounds(player), s, s));
            const landed = previous.y + previous.height < s.y + s.height - 1e-7;
            const activate = pressed && !s.wasPressed && (s.mode !== "stomp" || landed) && (!s.active || s.openDuration);
            s.wasPressed = pressed;
            if (!activate) continue;
            s.active = true;
            s.activationTime = 0;
            s.remainingTime = s.openDuration ?? 0;
            this.activationCount++;
            this.gates.filter(g => s.gateIds.includes(g.id)).forEach(g => {
                if (!g.open) g.openTime = 0;
                g.open = true; g.remainingTime = Math.max(g.remainingTime, s.remainingTime);
            });
        }
    }
}
