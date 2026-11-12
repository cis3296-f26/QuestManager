const emptyProgress = () => ({ version: 1, levels: {} });

// Permanent achievements, separate from CoinManager's current attempt.
// No level instances, DOM, authentication calls or shop currency live here.
export class LevelProgressManager {
    constructor(store, totalLevels = 10) {
        this.store = store;
        this.totalLevels = totalLevels;
        this.definitions = new Map();
        this.setUser(null);
    }

    registerLevel(config) {
        this.definitions.set(config.id, config.coins.map((coin) => coin.id));
        this.data = this.sanitize(this.data);
    }

    sanitize(data) {
        const clean = emptyProgress();
        if (data?.version !== 1) return clean;
        for (let id = 1; id <= this.totalLevels; id++) {
            const record = data.levels?.[id];
            if (!record || record.completed !== true) continue;
            const allowed = this.definitions.get(id);
            const coinIds = Array.isArray(record.coinIds)
                ? [...new Set(record.coinIds.filter((coin) => typeof coin === "string" &&
                    coin.length > 0 && coin.length < 100 && (!allowed || allowed.includes(coin))))].slice(0, 3)
                : [];
            clean.levels[id] = { completed: true, coinIds };
            if (Number.isSafeInteger(record.coinRevision) && record.coinRevision > 0)
                clean.levels[id].coinRevision = record.coinRevision;
        }
        return clean;
    }

    setUser(userId) {
        this.userId = userId || null;
        const loaded = this.store.load(this.userId);
        this.data = this.sanitize(loaded.data);
        this.persistent = Boolean(this.userId && loaded.available);
    }

    getLevel(id) {
        const record = this.data.levels[id];
        const coinIds = [...(record?.coinIds ?? [])];
        return {
            unlocked: id === 1 || this.data.levels[id - 1]?.completed === true,
            completed: record?.completed === true,
            coinIds,
            fullyCompleted: record?.completed === true && coinIds.length === 3
        };
    }

    get totalCoins() {
        let count = 0;
        for (let id = 1; id <= this.totalLevels; id++) count += this.getLevel(id).coinIds.length;
        return { earned: count, possible: this.totalLevels * 3 };
    }

    mergeStoredProgress() {
        const latest = this.sanitize(this.store.load(this.userId).data);
        for (let id = 1; id <= this.totalLevels; id++) {
            const record = latest.levels[id], current = this.data.levels[id];
            if (!record) continue;
            const revision = record.coinRevision ?? 0, currentRevision = current?.coinRevision ?? 0;
            // An explicit reset supersedes older banked coins. A stale tab's next
            // completion must not silently union its old collection back in.
            if (revision > currentRevision || !current) this.data.levels[id] = record;
            else if (revision === currentRevision) this.data.levels[id] = {
                completed: true, coinIds: [...new Set([...(current.coinIds ?? []), ...record.coinIds])].slice(0, 3),
                ...(revision ? { coinRevision: revision } : {})
            };
        }
    }

    // Deliberately destructive developer action, called only after confirmation
    // and account verification in the game. Keep completion/unlock history intact.
    clearCoinProgress(levelId = null) {
        if (levelId !== null && !this.definitions.has(levelId)) throw new Error("Unknown level coin reset.");
        this.mergeStoredProgress();
        for (let id = 1; id <= this.totalLevels; id++) {
            if (levelId !== null && id !== levelId) continue;
            const record = this.data.levels[id];
            if (record) this.data.levels[id] = {
                ...record, coinIds: [], coinRevision: (record.coinRevision ?? 0) + 1
            };
        }
        this.persistent = this.store.save(this.userId, this.data);
        return { persistent: this.persistent };
    }

    // Call only after reaching the flag. Merge IDs, never increment a counter.
    completeLevel(id, attemptIds, { developerAssisted = false } = {}) {
        // Defense at the persistence boundary as well as the completion UI.
        if (developerAssisted) return this.getLevel(id);
        const allowed = this.definitions.get(id);
        if (!allowed) throw new Error("Register the level before saving its achievements.");
        this.mergeStoredProgress();
        const existing = this.getLevel(id).coinIds;
        const coinIds = allowed.filter((coin) => existing.includes(coin) || attemptIds.includes(coin));
        const coinRevision = this.data.levels[id]?.coinRevision;
        this.data.levels[id] = { completed: true, coinIds, ...(coinRevision ? { coinRevision } : {}) };
        this.persistent = this.store.save(this.userId, this.data);
        return this.getLevel(id);
    }
}

