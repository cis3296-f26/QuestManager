import { AudioPreferences } from "../settings/AudioPreferences.js";
import { createSynthAssets } from "./SynthAssets.js";

// Audio devices can disappear while a source is playing. Cleanup is always best effort.
function disconnect(node) { try { node?.disconnect(); } catch { /* Device unavailable. */ } }
function stop(source) { try { source?.stop(); } catch { /* Already ended. */ } disconnect(source); }

// One context, one audible background track, bounded effects. Failure never stops gameplay.
export class AudioManager {
    constructor(settings, { contextFactory = () => {
        const Context = globalThis.window?.AudioContext ?? globalThis.window?.webkitAudioContext;
        return Context ? new Context() : null;
    }, assetsFactory = createSynthAssets, now = () => globalThis.performance?.now() ?? Date.now() } = {}) {
        this.preferences = new AudioPreferences(settings);
        this.contextFactory = contextFactory; this.assetsFactory = assetsFactory;
        this.now = now;
        this.effects = new Set(); this.lastEffects = new Map();
        this.retiringMusic = new Set();
        this.music = null;
        this.scene = null; this.gameplay = false; this.paused = false; this.active = true;
        this.transition = false; this.offset = 0; this.revision = 0; this.ready = false;
        this.unsubscribe = settings.subscribe(() => this.applyVolumes());
    }
    listenForUnlock(target) {
        if (this.inputTarget) return;
        this.inputTarget = target;
        this.gesture = (event) => { if (!event.repeat) void this.unlock(); };
        target.addEventListener("pointerdown", this.gesture, true);
        target.addEventListener("keydown", this.gesture, true);
    }
    unlock() {
        if (this.disposed) return Promise.resolve(false);
        if (this.unlocking) return this.unlocking;
        this.unlocking = (async () => {
            try {
                this.context ??= this.contextFactory();
                if (!this.context) return false;
                if (this.context.state !== "running") await this.context.resume();
                if (this.disposed || this.context.state !== "running") return false;
                if (!this.ready) {
                    this.assets = this.assetsFactory(this.context);
                    this.musicGain = this.context.createGain(); this.effectsGain = this.context.createGain();
                    this.musicGain.connect(this.context.destination); this.effectsGain.connect(this.context.destination);
                    this.ready = true;
                }
                this.applyVolumes();
                const pending = this.pending; this.pending = null;
                if (pending?.revision === this.revision && pending.deadline >= this.now()) this.play(pending.name, { cue: pending.cue });
                this.startMusic();
                return true;
            } catch { return false; }
        })().finally(() => {
            this.unlocking = null;
            if (!this.ready || this.context?.state !== "running") this.pending = null;
        });
        return this.unlocking;
    }
    applyVolumes() {
        if (!this.ready) return;
        try {
            this.musicGain.gain.setValueAtTime(this.preferences.volumeFor("music"), this.context.currentTime);
            this.effectsGain.gain.setValueAtTime(this.preferences.volumeFor("effects"), this.context.currentTime);
        } catch { /* A suspended/closed audio device must not affect the game. */ }
    }
    setScene(name, { gameplay = false, restart = false } = {}) {
        if (!restart && name === this.scene && gameplay === this.gameplay) return;
        this.revision++; this.pending = null;
        this.stopEffects(); this.stopRetiringMusic();
        // Keep the current music alive while a previously unheard score renders
        // off-thread; the fade happens only when the replacement is ready.
        if (!name || !this.ready || !this.assets.prepareMusic || this.assets.getMusic(name))
            this.musicStartAt = this.stopMusic(false, { fade: .07 });
        this.offset = 0;
        this.lastEffects.clear();
        this.scene = name; this.gameplay = gameplay; this.transition = false;
        this.startMusic();
    }
    startMusic() {
        if (!this.ready || !this.scene || this.paused || !this.active || this.transition || this.context.state !== "running" || this.music?.scene === this.scene) return;
        let source, gain;
        try {
            const buffer = this.assets.prepareMusic ? this.assets.getMusic(this.scene) : this.assets.music(this.scene);
            if (!buffer && this.assets.prepareMusic) {
                if (this.musicLoading?.scene === this.scene && this.musicLoading.revision === this.revision) return;
                const request = { scene: this.scene, revision: this.revision };
                this.musicLoading = request;
                request.promise = this.assets.prepareMusic(this.scene).then(result => {
                    if (this.musicLoading !== request) return false;
                    this.musicLoading = null;
                    if (this.disposed || request.revision !== this.revision) return false;
                    if (!result) { this.stopMusic(); return false; }
                    this.startMusic(); return true;
                }).catch(() => { if (this.musicLoading === request) this.musicLoading = null; return false; });
                return;
            }
            if (!buffer) return;
            if (this.music) this.musicStartAt = this.stopMusic(false, { fade: .07 });
            source = this.context.createBufferSource(); source.buffer = buffer; source.loop = true;
            gain = this.context.createGain(); gain.connect(this.musicGain);
            source.connect(gain);
            const started = Math.max(this.context.currentTime, this.musicStartAt ?? 0);
            gain.gain.setValueAtTime(0, started);
            gain.gain.linearRampToValueAtTime(1, started + .15);
            const voice = { source, buffer, gain, started, scene: this.scene };
            source.onended = () => {
                disconnect(source); disconnect(gain); this.retiringMusic.delete(voice);
                if (this.music === voice) this.music = null;
            };
            this.music = voice;
            source.start(started, this.offset % buffer.duration);
        } catch {
            this.music = null;
            stop(source);
            disconnect(gain);
        }
    }
    waitForMusic() { return this.musicLoading?.promise ?? Promise.resolve(Boolean(this.music)); }
    stopRetiringMusic() {
        for (const voice of this.retiringMusic) { stop(voice.source); disconnect(voice.gain); }
        this.retiringMusic.clear();
    }
    stopMusic(preserve = false, { fade = 0 } = {}) {
        let end = this.context?.currentTime ?? 0;
        const voice = this.music;
        if (voice) {
            if (preserve && voice.scene === this.scene) this.offset = (this.offset + Math.max(0, this.context.currentTime - voice.started)) % voice.buffer.duration;
            this.music = null;
            if (fade && this.context.currentTime >= voice.started) {
                end += fade;
                voice.gain.gain.cancelScheduledValues(this.context.currentTime);
                // Normal scene changes occur after the initial 150ms fade-in.
                const level = Math.min(1, Math.max(0, (this.context.currentTime - voice.started) / .15));
                voice.gain.gain.setValueAtTime(level, this.context.currentTime);
                voice.gain.gain.linearRampToValueAtTime(0, end);
                this.retiringMusic.add(voice);
                try { voice.source.stop(end); } catch { stop(voice.source); disconnect(voice.gain);this.retiringMusic.delete(voice); }
            } else { stop(voice.source); disconnect(voice.gain); }
        }
        if (!preserve) this.offset = 0;
        return end;
    }
    setPaused(paused) {
        if (paused === this.paused) return;
        this.paused = paused; this.pending = null;
        if (paused) { this.stopRetiringMusic(); this.stopMusic(true); this.stopEffects(); }
        else this.startMusic();
    }
    setActive(active) {
        if (active === this.active) return;
        this.active = active; this.pending = null;
        if (!active) { this.stopRetiringMusic(); this.stopMusic(true); this.stopEffects(); }
        else this.startMusic();
    }
    play(name, { cue = false } = {}) {
        if (this.disposed || this.paused || !this.active || !cue && (!this.gameplay || this.transition)) return false;
        if (!this.ready || this.context.state !== "running") {
            if (this.unlocking) this.pending = { name, cue, revision: this.revision, deadline: this.now() + 200 };
            return false;
        }
        let voice;
        try {
            const now = this.context.currentTime, cooldown = name === "footstep" ? .18 : name === "coin" ? 0 : .025;
            if (now - (this.lastEffects.get(name) ?? -Infinity) < cooldown || this.effects.size >= 8) return false;
            const buffer = this.assets.effect(name);
            if (!buffer) return false;
            const source = this.context.createBufferSource(); source.buffer = buffer; source.connect(this.effectsGain);
            voice = { source, name };
            source.onended = () => { this.effects.delete(voice); disconnect(source); };
            this.effects.add(voice); this.lastEffects.set(name, now); source.start();
            return true;
        } catch {
            if (voice) {
                this.effects.delete(voice); this.lastEffects.delete(name);
                stop(voice.source);
            }
            return false;
        }
    }
    stopEffect(name) {
        for (const voice of [...this.effects]) if (!name || voice.name === name) {
            this.effects.delete(voice);
            stop(voice.source);
        }
    }
    stopEffects() { this.stopEffect(); }
    die(reason) {
        if (this.transition) return;
        this.transition = true; this.pending = null; this.stopEffects(); this.stopRetiringMusic(); this.stopMusic();
        this.play(["thorns", "stalactite"].includes(reason) ? "damage" : "death", { cue: true });
    }
    complete() {
        if (this.transition) return;
        this.transition = true; this.pending = null; this.stopEffects(); this.stopRetiringMusic(); this.stopMusic();
        this.play("victory", { cue: true });
    }
    dispose() {
        this.disposed = true; this.pending = null; this.stopEffects(); this.stopRetiringMusic(); this.stopMusic();
        this.unsubscribe(); this.preferences.dispose(); this.assets?.clear();
        disconnect(this.musicGain); disconnect(this.effectsGain);
        this.inputTarget?.removeEventListener("pointerdown", this.gesture, true);
        this.inputTarget?.removeEventListener("keydown", this.gesture, true);
        try { this.context?.close()?.catch(() => {}); } catch { /* Device already closed. */ }
        this.ready = false;
    }
}
