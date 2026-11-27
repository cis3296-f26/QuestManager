import { validCompletionTime } from "../progress/RunStats.js";
import { safeUsername } from "./records.js";

export const COMMUNITY_COURSE = "adventure-2026-11-v1";
export const MAX_COMMUNITY_TIME = 604800000;
export function communitySnapshot(progress, levels) {
    return levels.filter(level => progress.getLevel(level.id).completed).map(level => {
        const record = progress.getLevel(level.id), time = progress.getBestTime(level.id);
        return { level_id: level.id, coin_ids: level.coins.map(coin => coin.id).filter(id => record.coinIds.includes(id)),
            best_time_ms: validCompletionTime(time) && time <= MAX_COMMUNITY_TIME ? time : null };
    });
}
export function communityResponse(data) {
    if (data?.verification !== "unverified" || data.course !== COMMUNITY_COURSE || !Array.isArray(data.rows) || data.rows.length > 100)
        throw new Error("Unsupported community response");
    const row = value => {
        if (!value || !Number.isSafeInteger(value.rank) || value.rank < 1 || !Number.isInteger(value.completed) || value.completed < 0 || value.completed > 10 ||
            !Number.isInteger(value.coins) || value.coins < 0 || value.coins > value.completed * 3 ||
            (value.time_ms !== null && (!validCompletionTime(value.time_ms) || value.time_ms > MAX_COMMUNITY_TIME * 10)))
            throw new Error("Invalid community row");
        return { rank: value.rank, username: safeUsername(value.username, null), completed: value.completed,
            coins: value.coins, timeMs: value.time_ms, isYou: value.is_you === true };
    };
    return { rows: data.rows.map(row), mine: data.mine === null ? null : row(data.mine) };
}

// Whitelist actionable errors; never display raw database errors, IDs or connection details.
export function communityError(error) {
    if (error?.message === "Set a public username in your existing profile before joining.") return "username_required";
    if (error?.code === "23505") return "username_taken";
    if (error?.code === "USERNAME_INVALID" || error?.code === "23514") return "username_invalid";
    if (error?.code === "42501" || error?.message === "Account changed" || error?.message === "Sign in first") return "sign_in";
    return "unavailable";
}

// Cloud data never overwrites local progress, unlocks or timer state. Publication is opt-in.
export class CommunityStore {
    constructor({ progress, levels, loadClient = () => import("../../main/users/supabaseClient.js") }) {
        Object.assign(this, { progress, levels, loadClient });
        this.userId = null; this.revision = 0; this.participating = false; this.lastUploaded = null;
    }
    setUser(userId) {
        this.userId = userId || null; this.revision++; this.participating = false; this.lastUploaded = null;
    }
    async rpc(name, args, userId = this.userId, revision = this.revision) {
        const { supabase } = await this.loadClient();
        const { data: session, error } = await supabase.auth.getSession();
        if (error || (session.session?.user?.id ?? null) !== userId || revision !== this.revision)
            throw new Error("Account changed");
        const result = await supabase.rpc(name, { ...args, p_expected_user: userId });
        if (revision !== this.revision || userId !== this.userId) throw new Error("Account changed");
        if (result.error) throw result.error;
        return result.data;
    }
    async status() {
        if (!this.userId) return false;
        const revision = this.revision;
        const data = await this.rpc("qm_community_status", {});
        if (revision !== this.revision) throw new Error("Account changed");
        this.participating = data?.participating === true;
        return this.participating;
    }
    async sync(userId = this.userId) {
        if (!userId || userId !== this.userId || userId !== this.progress.userId || !this.participating) return false;
        // Capture before awaiting. The RPC rejects a changed JWT owner even if an auth switch races the request.
        const revision = this.revision;
        const snapshot = communitySnapshot(this.progress, this.levels), fingerprint = JSON.stringify(snapshot);
        if (fingerprint === this.lastUploaded) return true;
        await this.rpc("qm_community_submit", { p_records: snapshot });
        if (revision !== this.revision || userId !== this.userId) throw new Error("Account changed");
        this.lastUploaded = fingerprint;
        return true;
    }
    async prime() { try { if (await this.status()) await this.sync(); } catch { /* Local saving remains available; retry from the board. */ } }
    async saveUsername(value) {
        const userId = this.userId, revision = this.revision;
        const username = typeof value === "string" ? value.trim() : "";
        if (!userId) throw new Error("Sign in first");
        if (username.length < 3 || username.length > 80 || username.includes("@") || username === userId || /[\u0000-\u001f\u007f]/.test(username))
            throw Object.assign(new Error("Invalid public username"), { code: "USERNAME_INVALID" });
        const { supabase } = await this.loadClient();
        const { data, error } = await supabase.auth.getSession();
        if (error || data.session?.user?.id !== userId || revision !== this.revision) throw new Error("Account changed");
        // Existing profiles table and owner-scoped UPDATE policy; no new display-name store or RPC.
        const result = await supabase.from("profiles").update({ username }).eq("id", userId).select("id");
        if (revision !== this.revision || userId !== this.userId) throw new Error("Account changed");
        if (result.error) throw result.error;
        if (result.data?.length !== 1 || result.data[0].id !== userId) throw new Error("Account changed");
        return username;
    }
    async participate(enabled) {
        if (!this.userId) throw new Error("Sign in first");
        const revision = this.revision;
        await this.rpc("qm_community_participate", { p_enabled: enabled });
        if (revision !== this.revision) throw new Error("Account changed");
        this.participating = enabled; this.lastUploaded = null;
        if (enabled) await this.sync();
    }
    async read(tab, levelId) {
        const revision = this.revision;
        let syncFailed = false;
        if (this.userId) {
            await this.status();
            if (this.participating) { try { await this.sync(); } catch { syncFailed = true; } }
        }
        if (revision !== this.revision) throw new Error("Account changed");
        const response = communityResponse(await this.rpc("qm_community_board", { p_tab: tab, p_level_id: levelId }));
        if (revision !== this.revision) throw new Error("Account changed");
        return { ...response, participating: this.participating, syncFailed };
    }
}
