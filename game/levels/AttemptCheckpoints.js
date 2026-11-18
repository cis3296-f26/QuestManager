// Memory-only navigation within the current attempt. No storage or coin banking.
export function updateCheckpoint(level) {
    const p = level.player, definitions = level.config.checkpoints ?? [];
    if (!p.grounded) return null;
    const support = p.supportPlatform?.id ?? p.supportPlatform?.config?.id;
    for (const [index, c] of definitions.entries()) {
        if (index <= (level.checkpointIndex ?? -1)) continue;
        if (support === c.platformId && p.x + p.width >= c.x && p.x <= c.x + 32) {
            level.checkpointIndex = index;
            return c;
        }
    }
    return null;
}
export function validateCheckpoints(config) {
    const errors = [], ids = new Set();
    for (const c of config.checkpoints ?? []) {
        const p = config.platforms.find(p => p.id === c.platformId && !p.type);
        if (!c.id || ids.has(c.id) || !p || !Number.isFinite(c.x) || c.x < p.x || c.x + 32 > p.x + p.width ||
            c.feetY !== p.y || !c.label) errors.push(`Invalid checkpoint: ${c.id}.`);
        ids.add(c.id);
    }
    return errors;
}
