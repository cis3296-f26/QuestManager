import { synthesizeMusic, synthesizeMusicAsync } from "./MusicSynth.js";
import { MUSIC_TRACKS } from "./MusicScores.js";

// Original QuestManager scores and sound recipes. No external samples or game music.
// Low sample rate, rounded waves and sparse phrases keep the retro palette soft.
const rate = 22050;
const rounded = (phase) => Math.sin(phase) * .85 + Math.asin(Math.sin(phase)) * (2 / Math.PI) * .15;

function tone(data, start, duration, hz, amplitude, { endHz = hz, noise = 0, wrap = false } = {}) {
    let phase = 0, filtered = 0, seed = 731;
    const count = Math.floor(duration * rate), offset = Math.floor(start * rate);
    for (let i = 0; i < count; i++) {
        const time = i / rate, progress = i / count;
        phase += 2 * Math.PI * (hz + (endHz - hz) * progress) / rate;
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        filtered = filtered * .8 + (seed / 2147483648 - 1) * .2;
        const attack = Math.min(1, time / .012), release = Math.min(1, (duration - time) / .07);
        const envelope = attack * release * (1 - progress * .4);
        const index = wrap ? (offset + i) % data.length : offset + i;
        if (index < data.length) data[index] += (rounded(phase) * (1 - noise) + filtered * noise) * amplitude * envelope;
    }
}

const effects = {
    jump: [.17, [[0, .15, 300, .12, { endHz: 540 }]]],
    land: [.11, [[0, .10, 105, .075, { endHz: 72, noise: .3 }]]],
    footstep: [.065, [[0, .06, 86, .028, { endHz: 60, noise: .55 }]]],
    coin: [.31, [[0, .17, 784, .10], [.09, .21, 988, .08]]],
    stomp: [.20, [[0, .17, 220, .12, { endHz: 145 }], [.10, .09, 330, .055]]],
    death: [.49, [[0, .15, 392, .10], [.13, .16, 330, .09], [.27, .20, 262, .075]]],
    damage: [.30, [[0, .11, 150, .09, { noise: .4 }], [.08, .20, 220, .075, { endHz: 165 }]]],
    crack: [.20, [[0, .07, 190, .055, { noise: .65 }], [.09, .07, 165, .045, { noise: .65 }]]],
    break: [.29, [[0, .12, 155, .08, { endHz: 75, noise: .6 }], [.08, .19, 110, .055, { noise: .6 }]]],
    switch: [.23, [[0,.10,523,.06],[.09,.13,659,.065]]],
    gate: [.37, [[0,.23,130,.055,{endHz:196,noise:.2}],[.16,.20,392,.045]]],
    victory: [1.10, [[0, .20, 523, .09], [.16, .20, 659, .09], [.32, .22, 784, .085], [.53, .52, 1047, .07], [.53, .52, 659, .035]]]
};

export function createSynthAssets(context) {
    const cache = new Map(), musicCache = new Map();
    let job = null;
    const remember = (name, result) => {
        if (!result) return null;
        musicCache.delete(name); musicCache.set(name, result);
        if (musicCache.size > 2) musicCache.delete(musicCache.keys().next().value);
        return result;
    };
    const buffer = (key, duration, fill) => {
        if (cache.has(key)) return cache.get(key);
        const result = context.createBuffer(1, Math.ceil(duration * rate), rate);
        fill(result.getChannelData(0));
        cache.set(key, result);
        return result;
    };
    const assets = {
        effect(name) {
            const recipe = effects[name];
            return recipe ? buffer(`fx:${name}`, recipe[0], (data) => recipe[1].forEach((note) => tone(data, ...note))) : null;
        },
        music(name) {
            if (musicCache.has(name)) {
                const cached = musicCache.get(name);
                musicCache.delete(name); musicCache.set(name, cached);
                return cached;
            }
            const result = synthesizeMusic(context, name);
            if (!result) return null;
            return remember(name, result);
        },
        getMusic(name) { return musicCache.get(name) ?? null; },
        prepareMusic(name) {
            if (!MUSIC_TRACKS[name]) return Promise.resolve(null);
            if (musicCache.has(name)) return Promise.resolve(assets.music(name));
            if (job?.name === name) return job.promise;
            job?.cancel();
            const request = { name, cancelled: false };
            request.promise = new Promise(resolve => {
                let worker, timer, fallingBack = false;
                const finish = result => {
                    clearTimeout(timer); worker?.terminate();
                    if (job === request) job = null;
                    resolve(request.cancelled ? null : remember(name, result));
                };
                request.cancel = () => { request.cancelled = true; finish(null); };
                const fallback = () => {
                    if (fallingBack || request.cancelled) return;
                    fallingBack = true;
                    clearTimeout(timer); worker?.terminate();
                    synthesizeMusicAsync(context, name, () => request.cancelled).then(finish, () => finish(null));
                };
                try {
                    if (!globalThis.Worker) { fallback(); return; }
                    worker = new Worker(new URL("./music-worker.js", import.meta.url), { type: "module" });
                    worker.onmessage = ({ data }) => {
                        if (request.cancelled) return;
                        if (data.failed) { fallback(); return; }
                        if (data.missing) { finish(null); return; }
                        try {
                            const result = context.createBuffer(2, data.channels[0].length, data.sampleRate);
                            data.channels.forEach((samples,c) => result.getChannelData(c).set(samples));
                            finish(result);
                        } catch { finish(null); }
                    };
                    worker.onerror = fallback;
                    timer = setTimeout(fallback, 15000);
                    worker.postMessage({ key: name });
                } catch { fallback(); }
            });
            job = request;
            return request.promise;
        },
        // At most two long stereo buffers; effects keep their own tiny cache.
        clear() { job?.cancel(); job = null; cache.clear(); musicCache.clear(); }
    };
    return assets;
}
