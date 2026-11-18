// A single native dialog supplies keyboard trapping/inert background; panels never stack dialogs.
export class PauseMenu {
    constructor({ document, pause, settings, onRestart, onMap, returnFocus }) {
        Object.assign(this, { pause, settings, onRestart, onMap, returnFocus });
        this.extraPanels = new Map();
        this.element = (id) => document.getElementById(id);
        this.dialog = this.element("pauseDialog");
        this.element("pauseButton").addEventListener("click", () => pause.open());
        for (const [id, action] of Object.entries({
            pauseResume: () => pause.close(), pauseRestart: () => pause.navigate("restart"),
            pauseWorldMap: () => pause.navigate("map"), pauseSettings: () => pause.navigate("settings"),
            settingsBack: () => pause.navigate("main"), pauseCancel: () => pause.navigate("main"),
            pauseConfirm: () => this.confirm()
        })) this.element(id).addEventListener("click", action);
        this.dialog.addEventListener("cancel", (event) => { event.preventDefault(); pause.escape(); });
        this.dialog.addEventListener("close", () => { if (!this.dialog.open) pause.close(); });
        for (const key of ["masterVolume", "musicVolume", "effectsVolume"]) {
            this.element(key).addEventListener("input", (event) => settings.update({ [key]: Number(event.target.value) }));
        }
        for (const key of ["muted", "showControls", "reduceMotion"]) {
            this.element(key).addEventListener("change", (event) => settings.update({ [key]: event.target.checked }));
        }
        settings.subscribe(() => this.syncSettings());
        pause.subscribe(() => this.render());
        this.syncSettings();
    }
    registerPanel(screen, panel) {
        this.extraPanels.set(screen, panel);
        panel.element.hidden = true;
        this.dialog.appendChild(panel.element);
    }
    syncSettings() {
        const values = this.settings.values;
        for (const key of ["masterVolume", "musicVolume", "effectsVolume"]) {
            this.element(key).value = values[key];
            this.element(`${key}Value`).textContent = `${values[key]}%`;
        }
        for (const key of ["muted", "showControls", "reduceMotion"]) this.element(key).checked = values[key];
        this.element("controlsReference").hidden = !values.showControls;
        this.element("settingsSaveStatus").textContent = this.settings.persistent
            ? `Preferences use separate browser storage for ${this.settings.userId ? "your account" : "guest play"}.`
            : "Preferences are kept for this session only because browser storage is unavailable.";
    }
    confirm() {
        const screen = this.pause.screen;
        if (!["restart", "map"].includes(screen)) return;
        this.pause.close();
        if (screen === "restart") this.onRestart();
        else this.onMap();
    }
    render() {
        const { screen } = this.pause;
        if (!screen) {
            if (this.dialog.open) this.dialog.close();
            this.returnFocus();
            return;
        }
        const extra = this.extraPanels.get(screen);
        for (const [name, panel] of this.extraPanels) panel.element.hidden = name !== screen;
        const confirm = screen === "restart" || screen === "map";
        this.element("pauseMainPanel").hidden = screen !== "main";
        this.element("pauseSettingsPanel").hidden = screen !== "settings";
        this.element("pauseConfirmPanel").hidden = !confirm;
        this.element("pauseTitle").textContent = screen === "main" ? "GAME PAUSED" : screen === "settings" ? "Game Settings" : screen === "restart" ? "Restart Level?" : "Return to World Map?";
        this.element("pauseDescription").textContent = screen === "restart"
            ? "Any coins collected during this attempt that haven't been saved will be lost."
            : screen === "map" ? "Any new coins collected during this attempt will not be saved unless you complete the level."
                : screen === "settings" ? "Adjust your preferences. Gameplay stays paused." : "Take a break. Your current attempt is preserved.";
        if (extra) {
            this.element("pauseTitle").textContent = extra.title;
            this.element("pauseDescription").textContent = extra.description;
        }
        if (confirm) this.element("pauseConfirm").textContent = screen === "restart" ? "Restart" : "Return to Map";
        if (!this.dialog.open) this.dialog.showModal();
        if (extra) { extra.focus.focus(); return; }
        this.element(confirm ? "pauseCancel" : screen === "settings" ? "masterVolume" : "pauseResume").focus();
    }
}
