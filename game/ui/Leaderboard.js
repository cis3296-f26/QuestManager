import { personalRecords, safeUsername } from "../leaderboard/records.js";
import { loadLeaderboardIdentity } from "../leaderboard/identity.js";
import { formatRunTime } from "./RunResults.js";

const copy = {
    adventure: ["Your Adventure", "Levels completed first, then permanent gold coins. Comparable combined best times may break a tie."],
    level: ["Your Level Times", "Your fastest eligible completion for each adventure."],
    full: ["Combined Best Times", "Combined personal bests across all 10 levels — separate runs, not one continuous speedrun."]
};

export class Leaderboard {
    constructor({ document, progress, levels, onPlay, community = null, loadIdentity = loadLeaderboardIdentity }) {
        Object.assign(this, { document, progress, levels, onPlay, community, loadIdentity });
        this.tab = "adventure"; this.selectedId = levels[0].id; this.revision = 0;
        this.identity = { name: "Adventurer" }; this.identityStatus = "";
        this.tabs = ["adventure", "level", "full"].map(id => this.el(`leaderboardTab-${id}`));
        this.tabs.forEach((button, i) => {
            button.addEventListener("click", () => this.selectTab(i));
            button.addEventListener("keydown", event => {
                const next = event.key === "ArrowRight" ? (i + 1) % 3 : event.key === "ArrowLeft" ? (i + 2) % 3 : event.key === "Home" ? 0 : event.key === "End" ? 2 : null;
                if (next !== null) { event.preventDefault(); this.selectTab(next); this.tabs[next].focus(); }
            });
        });
        this.el("leaderboardLevel").replaceChildren(...levels.map(level => {
            const option = this.node("option", `Level ${level.id} — ${level.name}`); option.value = String(level.id); return option;
        }));
        this.el("leaderboardLevel").addEventListener("change", event => {
            const id = Number(event.target.value);
            if (this.levels.some(level => level.id === id)) { this.selectedId = id; this.render(); this.refreshCommunity(); }
        });
        this.el("leaderboardPlay").addEventListener("click", () => {
            if (this.progress.getLevel(this.selectedId).unlocked) this.onPlay(this.selectedId);
        });
    }
    el(id) { return this.document.getElementById(id); }
    node(tag, text, className = "") {
        const element = this.document.createElement(tag); element.textContent = text; element.className = className; return element;
    }
    selectTab(index) { this.tab = ["adventure", "level", "full"][index]; this.render(); this.refreshCommunity(); }
    refreshCommunity() { if (this.community) void this.community.refresh(this.tab, this.selectedId); }
    async refresh() {
        const revision = ++this.revision, account = this.progress.userId;
        this.refreshCommunity();
        this.identity = { name: account ? "Adventurer" : "Guest adventurer" };
        this.identityStatus = account ? "Loading your player profile…" : "";
        this.render();
        try {
            const identity = await this.loadIdentity(account);
            if (revision !== this.revision || account !== this.progress.userId) return;
            this.identity = { ...identity, name: account ? safeUsername(identity.name, account) : "Guest adventurer" };
            this.identityStatus = "";
        } catch {
            if (revision !== this.revision || account !== this.progress.userId) return;
            this.identityStatus = "Player profile unavailable. Your local records are still accessible.";
        }
        this.render();
    }
    render() {
        const data = personalRecords(this.progress, this.levels), tab = this.tab;
        this.tabs.forEach((button, index) => {
            const active = ["adventure", "level", "full"][index] === tab;
            button.setAttribute("aria-selected", String(active)); button.tabIndex = active ? 0 : -1;
        });
        this.el("leaderboardPanel").setAttribute("aria-labelledby", `leaderboardTab-${tab}`);
        this.el("leaderboardTitle").textContent = copy[tab][0];
        this.el("leaderboardDescription").textContent = copy[tab][1];
        this.el("leaderboardScope").textContent = !data.signedIn
            ? "Sign in to access your saved adventure records. Guest records are temporary and stay in this session."
            : data.persistent ? "Your records on this browser · Not synced across devices."
                : "Session records only · Browser storage is unavailable. These records may disappear when you leave.";
        this.el("leaderboardIdentityStatus").textContent = this.identityStatus;
        this.el("leaderboardName").textContent = this.identity.name;
        this.el("leaderboardSelector").hidden = tab !== "level";
        this.el("leaderboardPlay").hidden = tab !== "level";
        this.el("leaderboardLevel").value = String(this.selectedId);
        const selected = data.records.find(record => record.id === this.selectedId);
        const card = this.el("leaderboardPersonal");
        const label = data.persistent ? "Personal best" : "Session best";
        const content = tab === "adventure" ? [
            this.node("p", `${data.completed}/10 levels completed`, "record-value"),
            this.node("p", `◉ ${data.coins.earned}/${data.coins.possible} permanent achievement coins`, "record-coins"),
            this.node("p", `${data.timed}/10 levels with a recorded best time`)
        ] : tab === "level" ? [
            this.node("h3", `Level ${selected.id} · ${selected.name}`),
            this.node("p", `${label}: ${formatRunTime(selected.timeMs)}`, "record-value"),
            this.node("p", selected.timeMs === null ? selected.completed ? "Level completed, but no completion time recorded yet. Replay to set one." : "You haven't completed this level yet. No completion time recorded yet." : "Fastest eligible recorded completion. Any coin total qualifies.")
        ] : [
            this.node("p", formatRunTime(data.combinedMs), "record-value"),
            this.node("p", data.combinedMs === null ? `Complete all 10 levels and record a best time for each to qualify. ${data.timed}/10 times recorded.` : `${label} total · All 10 levels have valid recorded times.`)
        ];
        card.replaceChildren(...content);
        const unlocked = this.progress.getLevel(this.selectedId).unlocked;
        this.el("leaderboardPlay").disabled = !unlocked;
        this.el("leaderboardPlay").textContent = unlocked ? selected.completed ? "Replay this level" : "Play this level" : `Complete Level ${this.selectedId - 1} to unlock`;
        const body = this.el("leaderboardBreakdown");
        body.hidden = tab !== "full";
        body.replaceChildren(...data.records.map(record => {
            const row = this.node("tr", "");
            row.appendChild(this.node("th", `Level ${record.id} · ${record.name}`));
            row.children[0].setAttribute("scope", "row");
            row.appendChild(this.node("td", record.timeMs === null ? "No recorded time" : formatRunTime(record.timeMs)));
            return row;
        }));
        this.el("leaderboardBreakdownTable").hidden = tab !== "full";
        const canvas = this.el("leaderboardAvatar"), context = canvas.getContext?.("2d");
        context?.clearRect(0, 0, canvas.width, canvas.height);
        if (this.identity.draw) this.identity.draw(canvas);
        else if (context) {
            // Neutral fallback when signed out or when the existing profile cannot load.
            context.fillStyle = "#52634b";
            context.beginPath(); context.arc(50, 34, 12, 0, Math.PI * 2); context.fill();
            context.beginPath(); context.ellipse(50, 70, 23, 19, 0, Math.PI, Math.PI * 2); context.fill();
        }
    }
}
