// No playback/assets are introduced. Future HTML audio can connect to these preferences.
export class AudioPreferences {
    constructor(settings) {
        this.settings = settings;
        this.connections = new Set();
        this.unsubscribe = settings.subscribe(() => this.apply());
    }
    volumeFor(channel) {
        if (!["music", "effects"].includes(channel)) throw new Error("Unknown audio channel.");
        const values = this.settings.values;
        return values.muted ? 0 : values.masterVolume * values[channel === "music" ? "musicVolume" : "effectsVolume"] / 10000;
    }
    connect(media, channel = "effects") {
        this.volumeFor(channel);
        const connection = { media, channel };
        this.connections.add(connection);
        this.apply();
        return () => this.connections.delete(connection);
    }
    apply() {
        for (const { media, channel } of this.connections) {
            media.volume = this.volumeFor(channel);
            media.muted = this.settings.values.muted;
        }
    }
    dispose() { this.unsubscribe(); this.connections.clear(); }
}
