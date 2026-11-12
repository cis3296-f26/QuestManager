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

    // Call only after reaching the flag. Merge IDs, never increment a counter.
    completeLevel(id, attemptIds, { developerAssisted = false } = {}) {
        // Defense at the persistence boundary as well as the completion UI.
        if (developerAssisted) return this.getLevel(id);
        const allowed = this.definitions.get(id);
        if (!allowed) throw new Error("Register the level before saving its achievements.");
        // Merge another tab's completed runs before writing this one.
        const latest = this.sanitize(this.store.load(this.userId).data);
        for (let levelId = 1; levelId <= this.totalLevels; levelId++) {
            const record = latest.levels[levelId];
            if (!record) continue;
            const existing = this.data.levels[levelId]?.coinIds ?? [];
            this.data.levels[levelId] = { completed: true, coinIds: [...new Set([...existing, ...record.coinIds])].slice(0, 3) };
        }
        const existing = this.getLevel(id).coinIds;
        const coinIds = allowed.filter((coin) => existing.includes(coin) || attemptIds.includes(coin));
        this.data.levels[id] = { completed: true, coinIds };
        this.persistent = this.store.save(this.userId, this.data);
        return this.getLevel(id);
    }
}

