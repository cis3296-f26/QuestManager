import { formatRunTime } from "./RunResults.js";

// Real opt-in records only. Nothing is painted as a verified speedrun result.
export class CommunityLeaderboard {
    constructor({ document, store }) {
        Object.assign(this, { document, store });
        this.tab = "adventure"; this.levelId = 1; this.revision = 0; this.mutation = 0; this.busy = false;
        this.el("communityJoin").addEventListener("click", () => {
            if (this.el("communityConsent").checked) void this.changeParticipation(true);
        });
        this.el("communityLeave").addEventListener("click", () => { void this.changeParticipation(false); });
        this.el("communityRefresh").addEventListener("click", () => { void this.refresh(); });
    }
    el(id) { return this.document.getElementById(id); }
    node(tag, text, cls = "") { const node = this.document.createElement(tag); node.textContent = text; node.className = cls; return node; }
    clear() {
        this.el("communityRows").replaceChildren(); this.el("communityPodium").replaceChildren();
        this.el("communityMine").textContent = "";
    }
    accountChanged() {
        ++this.revision; ++this.mutation; this.busy = false; this.clear(); this.el("communityConsent").checked = false;
        this.el("communityJoin").hidden = true; this.el("communityLeave").hidden = true;
        this.el("communityConsentLabel").hidden = true;
        this.el("communityStatus").textContent = "Community records will refresh when you open the leaderboard.";
    }
    async changeParticipation(enabled) {
        if (this.busy) return;
        this.busy = true;
        const mutation = ++this.mutation;
        ++this.revision;
        this.el("communityJoin").disabled = true; this.el("communityLeave").disabled = true;
        this.el("communityStatus").textContent = enabled ? "Publishing your unverified community records…" : "Removing your online records…";
        try {
            await this.store.participate(enabled);
            if (mutation !== this.mutation) return;
            this.busy = false;
            this.el("communityConsent").checked = false;
            await this.refresh();
        } catch {
            if (mutation === this.mutation) this.el("communityStatus").textContent = "Could not update community records. Sign in, check your username and connection, then refresh to retry. Your local records are unchanged.";
        } finally {
            if (mutation === this.mutation) { this.busy = false; this.el("communityJoin").disabled = false; this.el("communityLeave").disabled = false; }
        }
    }
    async refresh(tab = this.tab, levelId = this.levelId) {
        this.tab = tab; this.levelId = levelId;
        const revision = ++this.revision;
        this.clear();
        this.el("communityStatus").textContent = "Loading unverified community records…";
        this.el("communityJoin").disabled = this.busy; this.el("communityLeave").disabled = this.busy;
        this.el("communityJoin").hidden = true; this.el("communityLeave").hidden = true;
        this.el("communityConsentLabel").hidden = true;
        try {
            const data = await this.store.read(tab, levelId);
            if (revision !== this.revision) return;
            const signedIn = Boolean(this.store.userId);
            this.el("communityJoin").hidden = !signedIn || data.participating;
            this.el("communityConsentLabel").hidden = !signedIn || data.participating;
            this.el("communityLeave").hidden = !signedIn || !data.participating;
            this.el("communityStatus").textContent = data.syncFailed
                ? "Online records loaded, but your latest local records could not sync. Refresh to retry."
                : data.rows.length ? "Unverified community records · Browser-reported scores can be manipulated."
                    : "No qualifying community records have been published for this category yet.";
            const headings = ["Rank", "Player", ...(tab === "adventure" ? ["Levels", "Coins"] : [tab === "level" ? "Best time" : "Combined best"])];
            this.el("communityHead").replaceChildren(...headings.map(label => { const h = this.node("th",label);h.setAttribute("scope","col");return h; }));
            for (const record of data.rows) {
                const row = this.node("tr", "", record.isYou ? "community-current" : "");
                const values = [String(record.rank), record.username + (record.isYou ? " (You)" : ""),
                    ...(tab === "adventure" ? [`${record.completed}/10`, `${record.coins}/30`] : [formatRunTime(record.timeMs)])];
                values.forEach(value => row.appendChild(this.node("td", value)));
                this.el("communityRows").appendChild(row);
            }
            // Podium places come only from actual ranked rows. Ties retain their real rank.
            if (tab === "adventure") for (const record of data.rows.slice(0,3)) {
                const card = this.node("article", "", `community-place place-${Math.min(record.rank,3)}`);
                card.appendChild(this.node("p", `Rank ${record.rank}`, "game-eyebrow"));
                card.appendChild(this.node("h3", record.username + (record.isYou ? " (You)" : "")));
                card.appendChild(this.node("p", `${record.completed}/10 levels · ${record.coins}/30 coins`));
                this.el("communityPodium").appendChild(card);
            }
            this.el("communityMine").textContent = data.mine
                ? `Your community rank: ${data.mine.rank}${tab === "adventure" ? ` · ${data.mine.completed}/10 levels · ${data.mine.coins}/30 coins` : ` · ${formatRunTime(data.mine.timeMs)}`} · Unverified`
                : !signedIn ? "Sign in to share your own records." : !data.participating ? "Sharing is off. Your local records stay private until you choose to join."
                    : "You have no qualifying online time in this category. Complete a level normally and refresh to sync.";
        } catch {
            if (revision !== this.revision) return;
            this.el("communityStatus").textContent = "Community rankings unavailable. The backend may need setup, or the connection may be offline. Your local personal records are still available.";
        }
    }
}
