// Hand-authored sections compile into the arrays already consumed by LevelManager.
// Helpers encode shapes, not random generation or automatic object placement.
export const ground = (id, x, end) => ({ id, role: "main-route", x, y: 460, width: end - x, height: 80 });
export const ledge = (id, x, y, width, role, extra = {}) => ({ id, x, y, width, height: 24, role, ...extra });
export const creature = (id, appearance, startX, minX, maxX, purpose, speed = 75, feetY = 460) =>
    ({ id, appearance, startX, minX, maxX, purpose, speed, feetY, width: 32, height: 24, stompable: appearance === "slime" });
export const thorns = (id, x, width = 40) => ({ id, type: "spikes", x, y: 440, width, height: 20 });

export function defineLevel({ stages, finishId, ...properties }) {
    const flatten = (key) => stages.flatMap((stage) => stage[key] ?? []);
    const platforms = flatten("platforms");
    const finish = platforms.find((platform) => platform.id === finishId);
    if (!finish) throw new Error(`Missing finish platform: ${finishId}`);
    return { ...properties, groundY: 460, stages, platforms, enemies: flatten("enemies"),
        hazards: flatten("hazards"), coins: flatten("coins"),
        stalactites: flatten("stalactites"), switches: flatten("switches"), gates: flatten("gates"),
        ...(flatten("barriers").length ? { barriers: flatten("barriers") } : {}),
        ...(flatten("windZones").length ? { windZones: flatten("windZones") } : {}),
        sections: stages.map((stage) => ({ x: stage.start, title: stage.title, hint: stage.hint })),
        finish: { platform: finish, flagInset: 40 } };
}

