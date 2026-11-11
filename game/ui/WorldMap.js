import { renderCoinProgress } from "./CoinProgress.js";
import { renderLevelSelection } from "./LevelSelection.js";

// Navigation reads the same account-scoped achievements as the running game.
export class WorldMap {
    constructor({ levels, getProgress, getTotal, onPlay, onMap }) {
        Object.assign(this, { levels, getProgress, getTotal, onPlay, onMap });
        this.selectedId = levels[0].id;
        this.playing = false;
        this.map = document.getElementById("worldMapView");
        this.level = document.getElementById("levelView");
        this.heading = document.getElementById("mapHeading");
        this.playButton = document.getElementById("playLevel");
        this.selectionDialog = document.getElementById("levelSelectionDialog");
        this.selectionContent = document.getElementById("levelSelectionContent");
        this.nodes = document.querySelectorAll("[data-level]");

        this.nodes.forEach((node) => {
            node.addEventListener("click", () => {
                const id = Number(node.dataset.level);
                if (!this.isPlayable(id)) return;
                this.select(id);
                this.showSelection();
            });
        });
        this.playButton.addEventListener("click", () => this.openLevel());
        document.getElementById("backToMap").addEventListener("click", () => this.openMap());
        window.addEventListener("hashchange", () => this.render());
        this.render(false);
    }

    findLevel(id) { return this.levels.find((config) => config.id === id); }
    isPlayable(id) { return Boolean(this.findLevel(id) && this.getProgress(id).unlocked); }

    showSelection() {
        const config = this.findLevel(this.selectedId);
        if (!config) return;
        renderLevelSelection(this.selectionContent, config, this.getProgress(config.id), (id) => {
            this.selectionDialog.close();
            this.openLevel(id);
        });
        if (!this.selectionDialog.open) this.selectionDialog.showModal();
    }

    select(id) {
        const config = this.findLevel(id);
        if (!config) return;
        this.selectedId = id;
        const progress = this.getProgress(id);
        document.getElementById("mapLevelTitle").textContent = `Level ${id} · ${config.name}`;
        document.getElementById("mapLevelStatus").textContent = progress.fullyCompleted
            ? "Fully completed · All 3 coins earned" : progress.completed ? "Completed · Replay anytime" : !progress.unlocked
                ? `Complete Level ${id - 1} to unlock` : config.mapSummary ?? "Grasslands · Ready to explore";
        renderCoinProgress(document.getElementById("mapLevelCoins"), config.coins, progress.coinIds);
        this.playButton.textContent = progress.completed ? "Replay Level" : "Play Level";
        this.playButton.disabled = !this.isPlayable(id);
        this.nodes.forEach((node) => {
            const nodeId = Number(node.dataset.level), nodeConfig = this.findLevel(nodeId);
            node.disabled = !this.isPlayable(nodeId);
            node.classList.toggle("is-selected", nodeId === id);
            if (nodeConfig) {
                const saved = this.getProgress(nodeId);
                const lock = node.querySelector(".map-lock");
                if (lock) lock.hidden = !node.disabled;
                node.title = node.disabled ? `Complete Level ${nodeId - 1} to unlock` : `Select Level ${nodeId}`;
                node.setAttribute("aria-pressed", String(nodeId === id));
                node.setAttribute("aria-label", `Level ${nodeId}: ${nodeConfig.name}, ${saved.coinIds.length}/3 coins${saved.completed ? ", completed" : ""}${node.disabled ? ", locked" : ""}`);
            }
        });
        const total = this.getTotal();
        document.getElementById("mapTotalCoins").textContent = `Total Coins: ${total.earned}/${total.possible}`;
    }

    refresh() {
        this.select(this.selectedId);
        if (this.selectionDialog.open) this.showSelection();
    }

    openLevel(id = this.selectedId) {
        if (!this.isPlayable(id)) return;
        this.select(id);
        const hash = `#level-${id}`;
        if (location.hash === hash) this.render();
        else location.hash = hash;
    }

    openMap() {
        if (location.hash === "#map") this.render();
        else location.hash = "#map";
    }

    hasNext() {
        const index = this.levels.findIndex((config) => config.id === this.selectedId);
        return index >= 0 && index + 1 < this.levels.length && this.isPlayable(this.levels[index + 1].id);
    }

    openNext() {
        if (!this.hasNext()) return;
        const index = this.levels.findIndex((config) => config.id === this.selectedId);
        this.openLevel(this.levels[index + 1].id);
    }

    render(moveFocus = true) {
        if (this.selectionDialog.open) this.selectionDialog.close();
        const match = /^#level-(\d+)$/.exec(location.hash);
        const config = match && this.isPlayable(Number(match[1])) ? this.findLevel(Number(match[1])) : null;
        this.playing = Boolean(config);
        this.map.hidden = this.playing;
        this.level.hidden = !this.playing;
        if (config) {
            this.select(config.id);
            this.onPlay(config);
        } else {
            this.select(this.selectedId);
            this.onMap();
            if (moveFocus) this.heading.focus();
        }
    }
}

