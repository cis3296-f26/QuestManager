// Map selection and hash navigation use the same registry as the game.
export class WorldMap {
    constructor({ levels, onPlay, onMap }) {
        this.levels = levels;
        this.onPlay = onPlay;
        this.onMap = onMap;
        this.selectedId = levels[0].id;
        this.completed = new Set();
        this.playing = false;
        this.map = document.getElementById("worldMapView");
        this.level = document.getElementById("levelView");
        this.heading = document.getElementById("mapHeading");
        this.playButton = document.getElementById("playLevel");
        this.levelStatus = document.getElementById("mapLevelStatus");
        this.levelTitle = document.getElementById("mapLevelTitle");
        this.nodes = document.querySelectorAll("[data-level]");

        this.nodes.forEach((node) => {
            const id = Number(node.dataset.level);
            node.disabled = !this.findLevel(id);
            if (!node.disabled) node.addEventListener("click", () => this.select(id));
        });
        this.playButton.addEventListener("click", () => this.openLevel());
        document.getElementById("backToMap").addEventListener("click", () => this.openMap());
        window.addEventListener("hashchange", () => this.render());
        this.render(false);
    }

    findLevel(id) {
        return this.levels.find((config) => config.id === id);
    }

    select(id) {
        const config = this.findLevel(id);
        if (!config) return;
        this.selectedId = id;
        const done = this.completed.has(id);
        this.levelTitle.textContent = `Level ${id} · ${config.name}`;
        this.levelStatus.textContent = done ? "Completed · Replay anytime" : "Grasslands · Ready to explore";
        this.playButton.textContent = done ? "Replay Level" : "Play Level";
        this.nodes.forEach((node) => {
            const nodeId = Number(node.dataset.level);
            const selected = nodeId === id;
            node.classList.toggle("is-selected", selected);
            if (!node.disabled) {
                node.setAttribute("aria-pressed", String(selected));
                node.setAttribute("aria-label", `Level ${nodeId}: ${this.findLevel(nodeId).name}${this.completed.has(nodeId) ? ", completed" : ""}`);
            }
        });
    }

    openLevel(id = this.selectedId) {
        if (!this.findLevel(id)) return;
        this.select(id);
        const hash = `#level-${id}`;
        if (location.hash === hash) this.render();
        else location.hash = hash;
    }

    openMap() {
        if (location.hash === "#map") this.render();
        else location.hash = "map";
    }

    hasNext() {
        const index = this.levels.findIndex((config) => config.id === this.selectedId);
        return index >= 0 && index + 1 < this.levels.length;
    }

    openNext() {
        if (!this.hasNext()) return;
        const index = this.levels.findIndex((config) => config.id === this.selectedId);
        this.openLevel(this.levels[index + 1].id);
    }

    markCompleted(id) {
        // Progress lasts for this page session, matching the existing map.
        this.completed.add(id);
        this.select(id);
    }

    render(moveFocus = true) {
        const match = /^#level-(\d+)$/.exec(location.hash);
        const config = match ? this.findLevel(Number(match[1])) : null;
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
