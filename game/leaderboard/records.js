import { validCompletionTime } from "../progress/RunStats.js";

// Read-only projection. Never scan other accounts' storage or change saved records.
export function personalRecords(progress, levels) {
    const records = levels.map(({ id, name }) => {
        const level = progress.getLevel(id), time = progress.getBestTime(id);
        return { id, name, completed: level.completed,
            timeMs: level.completed && validCompletionTime(time) ? time : null };
    });
    const timed = records.filter(record => record.timeMs !== null);
    const sum = timed.reduce((total, record) => total + record.timeMs, 0);
    const qualified = records.length === 10 && records.every(record => record.completed && record.timeMs !== null) && Number.isSafeInteger(sum);
    return { records, completed: records.filter(record => record.completed).length,
        coins: progress.totalCoins, timed: timed.length, combinedMs: qualified ? sum : null,
        persistent: progress.persistent, signedIn: Boolean(progress.userId) };
}

// A future verified-data adapter may use these comparators. No production global dataset exists.
// Only complete ten-level time coverage makes adventure time comparisons equivalent.
export function compareAdventure(a, b) {
    return b.completed - a.completed || b.coins.earned - a.coins.earned ||
        (validCompletionTime(a.combinedMs) && validCompletionTime(b.combinedMs) ? a.combinedMs - b.combinedMs : 0);
}
export function compareTimes(a, b) {
    const av = validCompletionTime(a.timeMs), bv = validCompletionTime(b.timeMs);
    return av && bv ? a.timeMs - b.timeMs : av ? -1 : bv ? 1 : 0;
}

export function safeUsername(value, accountId) {
    const name = typeof value === "string" ? value.trim() : "";
    return name && name.length <= 80 && !name.includes("@") && name !== accountId &&
        !/[\u0000-\u001f\u007f]/.test(name) ? name : "Adventurer";
}
