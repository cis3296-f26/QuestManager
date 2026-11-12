// The only browser persistence adapter. Replace this adapter for Supabase later.
// Achievements have their own namespace and never touch the shop balance.
export class LocalProgressStore {
    constructor(storage) { this.storage = storage; }
    key(userId) { return `questmanager:adventure:v1:${encodeURIComponent(userId)}`; }

    load(userId) {
        if (!userId || !this.storage) return { data: null, available: false };
        try {
            const raw = this.storage.getItem(this.key(userId));
            return { data: raw ? JSON.parse(raw) : null, available: true };
        } catch {
            return { data: null, available: false };
        }
    }

    save(userId, data) {
        if (!userId || !this.storage) return false;
        try {
            this.storage.setItem(this.key(userId), JSON.stringify(data));
            return true;
        } catch { return false; }
    }
}
