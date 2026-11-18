// Original QuestManager scores and sound recipes. No external samples or game music.
// Low sample rate, rounded waves and sparse phrases keep the retro palette soft.
const rate = 22050;
const frequency = (midi) => 440 * 2 ** ((midi - 69) / 12);
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

const themes = {
    map: { bpm: 76, chords: [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 50, 55]],
        melody: [[72, 76], [79], [], [74, 71], [72, 79], [76], [], [74, 72]] },
    grassland: { bpm: 88, chords: [[48, 52, 55], [41, 45, 48], [45, 48, 52], [43, 47, 50]],
        melody: [[76, 79, 81], [79, 76], [], [74, 79], [76, 84], [81, 79], [], [74, 72]] },
    forest: { bpm: 82, chords: [[45, 48, 52], [41, 45, 48], [48, 52, 55], [40, 47, 52]],
        melody: [[69, 72], [76, 74], [], [71, 76], [72, 79, 76], [74], [], [71, 69]] },
    cave: { bpm: 72, chords: [[50, 57, 60], [46, 53, 57], [48, 55, 62], [45, 52, 59]],
        melody: [[74], [81, 77], [], [72, 79], [77], [], [76, 81], [74]] },
    deepForest: { bpm: 78, chords: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 52, 57]],
        melody: [[74, 77], [81], [], [76, 72], [74, 81], [77, 76], [], [73, 74]] }
};

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
    const cache = new Map();
    const buffer = (key, duration, fill) => {
        if (cache.has(key)) return cache.get(key);
        const result = context.createBuffer(1, Math.ceil(duration * rate), rate);
        fill(result.getChannelData(0));
        cache.set(key, result);
        return result;
    };
    return {
        effect(name) {
            const recipe = effects[name];
            return recipe ? buffer(`fx:${name}`, recipe[0], (data) => recipe[1].forEach((note) => tone(data, ...note))) : null;
        },
        music(name) {
            const theme = themes[name];
            if (!theme) return null;
            const beat = 60 / theme.bpm, duration = beat * 32;
            return buffer(`music:${name}`, duration, (data) => {
                for (let bar = 0; bar < 8; bar++) {
                    const chord = theme.chords[bar % theme.chords.length], start = bar * beat * 4;
                    chord.forEach((note) => tone(data, start, beat * 3.8, frequency(note + 12), .011, { wrap: true }));
                    tone(data, start, beat * 1.6, frequency(chord[0] - 12), .024, { wrap: true });
                    tone(data, start + beat * 2.4, beat, frequency(chord[0]), .012, { wrap: true });
                    theme.melody[bar].forEach((note, i) => tone(data, start + beat * (i * 1.25 + .3), beat * .9, frequency(note), .042, { wrap: true }));
                }
            });
        },
        clear() { cache.clear(); }
    };
}
