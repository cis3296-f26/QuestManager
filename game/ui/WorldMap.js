// Map navigation stays separate from level physics and rendering.
// Only implemented levels can be opened; locked markers never start a level.
export class WorldMap {
    constructor({ onPlay, onMap }) {
        this.onPlay = onPlay;
        this.onMap = onMap;
        this.playing = false;
        this.map = document.getElementById("worldMapView");
        this.level = document.getElementById("levelView");
        this.heading = document.getElementById("mapHeading");
        this.playButton = document.getElementById("playLevel");
        this.levelStatus = document.getElementById("mapLevelStatus");

        document.querySelector('[data-level="1"]').addEventListener("click", () => {
            this.playButton.focus();
        });
        this.playButton.addEventListener("click", () => this.openLevel());
        document.getElementById("backToMap").addEventListener("click", () => this.openMap());
        window.addEventListener("hashchange", () => this.render());
        this.render(false);
    }

    openLevel() {
        if (location.hash === "#level-1") this.render();
        else location.hash = "level-1";
    }

    openMap() {
        if (location.hash === "#map") this.render();
        else location.hash = "map";
    }

    markCompleted() {
        // Current page only: cross-session progress can be added with account storage.
        this.levelStatus.textContent = "Completed · Replay anytime";
        this.playButton.textContent = "Replay Level";
        document.querySelector('[data-level="1"]').setAttribute("aria-label",
            "Level 1: The First Steps, completed");
    }

    render(moveFocus = true) {
        this.playing = location.hash === "#level-1";
        this.map.hidden = this.playing;
        this.level.hidden = !this.playing;

        if (this.playing) this.onPlay();
        else {
            this.onMap();
            if (moveFocus) this.heading.focus();
        }
    }
}
