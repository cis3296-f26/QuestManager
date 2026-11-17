export const defaultSettings = Object.freeze({ masterVolume: 80, musicVolume: 60, effectsVolume: 80,
    muted: false, showControls: true, reduceMotion: false });

export function cleanSettings(raw = {}) {
    const clean = { ...defaultSettings };
    for (const key of ["masterVolume", "musicVolume", "effectsVolume"]) {
        if (typeof raw?.[key] === "number" && Number.isFinite(raw[key])) clean[key] = Math.max(0, Math.min(100, Math.round(raw[key])));
    }
    for (const key of ["muted", "showControls", "reduceMotion"]) if (typeof raw?.[key] === "boolean") clean[key] = raw[key];
    return clean;
}

// Separate keys and storage from achievements. A future remote adapter can implement load/save.
export class SettingsPersistence {
    constructor(storage = null) { this.storage = storage; this.memory = new Map(); this.persistent = Boolean(storage); }
    key(userId) { return `questmanager:game-settings:v1:${userId ? `user:${encodeURIComponent(userId)}` : "guest"}`; }
    load(userId) {
        const key = this.key(userId);
        try {
            const raw = this.storage?.getItem(key);
            if (raw) {
                try {
                    const saved = JSON.parse(raw);
                    if (saved?.version === 1) return cleanSettings(saved.values);
                } catch { /* A corrupt preference record does not make the storage API unavailable. */ }
            }
        } catch { this.persistent = false; }
        return cleanSettings(this.memory.get(key));
    }
    save(userId, values) {
        const key = this.key(userId), clean = cleanSettings(values);
        this.memory.set(key, clean);
        try {
            if (!this.storage) return false;
            this.storage.setItem(key, JSON.stringify({ version: 1, values: clean }));
            return this.persistent = true;
        } catch { this.persistent = false; return false; }
    }
}

export class GameSettings {
    constructor(persistence = new SettingsPersistence()) {
        this.persistence = persistence;
        this.userId = null;
        this.current = persistence.load(null);
        this.listeners = new Set();
    }
    get values() { return { ...this.current }; }
    get persistent() { return this.persistence.persistent; }
    subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
    notify() { this.listeners.forEach((listener) => listener(this.values)); }
    setUser(userId) {
        this.userId = userId || null;
        this.current = this.persistence.load(this.userId);
        this.notify();
    }
    update(patch) {
        this.current = cleanSettings({ ...this.current, ...patch });
        this.persistence.save(this.userId, this.current);
        this.notify();
    }
}
