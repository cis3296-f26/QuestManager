// Original, hand-authored scores. A level selects a registry key through audio.music.
// New biome/level variations add a score here, not another playback implementation.
export const MUSIC_TRACKS = Object.freeze({
    map: { title: "A Map Full of Promises", biome: "World Map", bpm: 80, beatsPerBar: 4, bars: 24,
        instruments: ["keys", "harp", "pad", "bass"],
        description: "Warm soft keys, answering harp and sustained strings; a broad adventure theme in three phrases.",
        chords: [[48,52,55,59],[45,48,52,55],[41,45,48,52],[43,47,50,55],[48,52,55,60],[41,45,48,52],[50,53,57,60],[43,47,50,55]],
        melody: [[72,76,79],[81,79,76],[77,76,72],[74,71],[76,79,84],[81,77],[74,77,76],[74,71,72]] },
    grassland: { title: "Morning on the Meadow", biome: "Grasslands", bpm: 104, beatsPerBar: 4, bars: 24,
        instruments: ["harp", "keys", "bass", "shaker"],
        description: "A buoyant plucked melody, little piano answers and an offbeat pulse; bright and welcoming.",
        chords: [[48,52,55],[41,45,48],[45,48,52],[43,47,50],[50,53,57],[41,45,48],[48,52,55],[43,47,50]],
        melody: [[76,79,81,79,76],[77,81,79],[76,72,76,79],[74,79,77,74],[77,81,84],[81,77,76,72],[76,79,84,79],[74,71,72]] },
    forest: { title: "Leaves in Three", biome: "Forest", bpm: 84, beatsPerBar: 3, bars: 24,
        instruments: ["flute", "wood", "harp", "bass"],
        description: "Breathy woodland flute over a lilting three-beat wood-and-harp accompaniment; curious and unhurried.",
        chords: [[43,47,50,57],[40,43,47,50],[48,52,55,59],[50,54,57,60],[43,47,50,55],[45,48,52,55],[48,52,55,59],[50,54,57,62]],
        melody: [[67,71,74,76],[74,71],[72,71,67],[69,74],[71,74,79],[76,74,72],[71,69,67],[66,69,67]] },
    deepForest: { title: "Under the Old Boughs", biome: "Deep Forest", bpm: 76, beatsPerBar: 4, bars: 24,
        instruments: ["reed", "pad", "wood", "drum", "bell"],
        description: "The woodland motif in a lower minor-colored reed voice, with slow air, sparse bells and a soft uneven drum pulse.",
        chords: [[50,53,57,64],[46,50,53,57],[48,52,55,62],[45,52,55,59],[50,53,57,60],[43,50,53,57],[46,50,53,60],[45,52,57,59]],
        melody: [[62,65,69,71],[69,65],[67,65,62],[64,69],[65,69,74],[71,69,67],[65,64,62],[61,64,62]] },
    cave: { title: "Light Inside the Stone", biome: "Crystal Cave", bpm: 68, beatsPerBar: 4, bars: 24,
        instruments: ["bell", "glass", "pad"],
        description: "Widely spaced crystal bells and glass harmonics, gentle stereo echoes and a low suspended pad; no outdoor walking beat.",
        chords: [[50,57,64],[46,53,60],[48,55,62],[45,52,59],[50,57,60],[43,50,57],[46,53,60],[45,52,59]],
        melody: [[74,81],[77],[],[72,79],[77,86],[],[76,81],[73,74]] },
    desert: { title: "Ribbons over Sandstone", biome: "Sunscorched Dunes", bpm: 96, beatsPerBar: 4, bars: 24,
        instruments: ["harp", "reed", "drum", "shaker", "bass"],
        description: "Warm plucked answers, a playful reed refrain and a quiet syncopated hand-drum pulse; a restful oasis phrase between ridge themes.",
        chords: [[45,52,57,60],[43,50,55,59],[41,48,53,57],[40,47,52,56],[45,52,57,60],[48,55,60,64],[43,50,55,59],[40,47,52,56]],
        melody: [[76,72,74,69],[71,74,79],[77,76,72,69],[71,68,71],[76,81,79,76],[79,76,72],[74,71,67,71],[68,71,69]] },
    temple: { title: "The Sun Beneath the Stone", biome: "The Lost Sun Temple", bpm: 88, beatsPerBar: 4, bars: 24,
        instruments: ["reed", "harp", "drum", "pad", "bell"],
        description: "A measured temple procession: low reeds, warm plucked replies and a five-stroke hand-drum figure, opening into a spacious buried-chamber phrase.",
        chords: [[50,57,60,65],[48,55,60,64],[46,53,57,62],[45,52,57,61],[50,53,57,64],[43,50,55,62],[46,53,58,65],[45,52,57,61]],
        melody: [[69,65,62,64],[67,64,60],[65,69,70,65],[64,61,64],[65,69,74,72],[67,62,65],[70,69,65,62],[64,61,62]] }
});

// Notes use beats and MIDI pitches. Phrase B answers A, then A' returns with
// changed registers, rests and accompaniment; this is not an eight-bar repeat.
export function arrangeMusic(key) {
    const score = MUSIC_TRACKS[key];
    if (!score) return null;
    const notes = [], beat = 60 / score.bpm;
    const add = (bar, at, length, pitch, instrument, level, pan = 0) => notes.push({
        start: (bar * score.beatsPerBar + at) * beat, duration: length * beat,
        pitch, instrument, level, pan
    });
    for (let bar = 0; bar < score.bars; bar++) {
        const phrase = Math.floor(bar / 8), local = bar % 8;
        const chord = score.chords[local], root = chord[0], melody = score.melody[local];
        if (key === "grassland") {
            for (const at of [0, 2]) add(bar, at, .65, root - 12, "bass", .018, -.15);
            for (const [i, at] of [.5, 1.5, 2.5, 3.5].entries()) {
                add(bar, at, .55, chord[(i + phrase) % chord.length] + 12, "keys", .010, .35);
                add(bar, at, .10, 48, "shaker", .008, i % 2 ? -.4 : .4);
            }
            if (local !== 6 || phrase === 2) melody.forEach((pitch, i) =>
                add(bar, [0,.75,1.5,2.5,3.25][i], .65, pitch + (phrase === 1 ? -12 : 0), "harp", .035, -.18));
            if (phrase > 0 && local % 2) add(bar, 3.15, .7, melody.at(-1) + 12, "keys", .015, .4);
        } else if (key === "forest") {
            add(bar, 0, 1.2, root - 12, "bass", .014, -.12);
            for (const [i, at] of [1, 2].entries())
                add(bar, at, .7, chord[i + 1] + 12, "wood", .017, i ? .4 : -.4);
            if (phrase !== 1 || local % 2 === 0) melody.forEach((pitch, i) =>
                add(bar, i * .68 + .1, i === melody.length - 1 ? .95 : .62,
                    pitch + (phrase === 1 ? 12 : 0), "flute", .028, -.2));
            if (phrase > 0) for (const [i, at] of [.45, 1.85].entries())
                add(bar, at, 1.1, chord[(local + i) % chord.length] + 24, "harp", .009, .45);
        } else if (key === "deepForest") {
            chord.slice(0,3).forEach((pitch,i)=>add(bar, .05, 4.6, pitch, "pad", .008, (i-1)*.6));
            for (const at of [0, 1.5, 3]) add(bar, at, .35, 38, "drum", phrase === 1 ? .012 : .008, -.1);
            add(bar, 2.5, .7, chord[1] + 12, "wood", .014, .35);
            if (local !== 2 && local !== 6) melody.forEach((pitch,i)=>
                add(bar, .25+i*.85, .9, pitch + (phrase === 1 ? 12 : 0), "reed", .026, -.18));
            if (phrase > 0 && local % 3 === 1) add(bar, 3.1, 2.5, chord.at(-1)+24, "bell", .012, .5);
        } else if (key === "desert") {
            add(bar,0,1.2,root-12,"bass",.014,-.15);
            // The middle phrase opens up like the oasis; the final phrase brings
            // back the ridge rhythm with plucked countermelody and a changed register.
            for(const at of phrase===1?[0,2.75]:[0,1.5,2.75])add(bar,at,.32,38,"drum",.012,-.2);
            for(const at of [.75,2.25,3.5])add(bar,at,.12,48,"shaker",.007,.35);
            for(const [i,at] of [.5,1.75,3].entries())add(bar,at,.8,chord[(i+phrase)%chord.length]+12,"harp",.018,.35);
            melody.forEach((pitch,i)=>add(bar,[.1,.85,2,2.85][i],phrase===1?.85:.55,
                pitch+(phrase===1?-12:0),phrase===1?"harp":"reed",.025,-.2));
            if(phrase===2&&local%2)add(bar,3.4,.5,chord[2]+24,"harp",.012,.45);
        } else if (key === "temple") {
            chord.slice(0,3).forEach((pitch,i)=>add(bar,.05,4.4,pitch-12,"pad",.005,(i-1)*.45));
            for(const [i,at] of (phrase===1?[0,2.5]:[0,.75,1.75,2.5,3.25]).entries())
                add(bar,at,.28,i%2?43:38,"drum",phrase===1?.008:.012,-.1);
            for(const [i,at] of [.5,2,3.5].entries())add(bar,at,.8,chord[(i+phrase)%chord.length]+12,"harp",.015,.3);
            if(phrase!==1||local%2===0)melody.forEach((pitch,i)=>add(bar,[.15,1,2.25,3][i],.7,
                pitch+(phrase===2&&local>3?12:0),"reed",.024,-.25));
            if(phrase>0&&local%2===1)add(bar,2.8,2.1,chord.at(-1)+12,"bell",.010,.45);
        } else if (key === "cave") {
            chord.forEach((pitch,i)=>add(bar, .1, 5.4, pitch-12, "pad", .006, (i-1)*.6));
            melody.forEach((pitch,i)=>add(bar, .4+i*1.7, 3.6, pitch+(phrase===1?-12:0), "bell", .024, i?.45:-.4));
            if (phrase > 0 && local % 2 === 0) add(bar, 2.5, 4, chord[1]+24, "glass", .015, .45);
            if (phrase === 2 && local === 6) for (const [i,pitch] of [74,77,81].entries())
                add(bar, .3+i, 3, pitch, "glass", .014, (i-1)*.4);
        } else {
            chord.forEach((pitch,i)=>add(bar, .03, 4.25, pitch+12, "pad", .006, (i-1.5)*.3));
            add(bar, 0, 1.6, root-12, "bass", .018, -.1);
            for (const [i,at] of [0,1.5,2.75].entries())
                add(bar, at, 1.4, chord[i%chord.length]+12, "harp", .012, .35);
            melody.forEach((pitch,i)=>add(bar, .15+i*1.1, 1.25,
                pitch+(phrase===1?-12:0), "keys", .032, -.15));
            if (phrase===2 && local%2===0) add(bar, 3.2, 1.8, chord[2]+24, "harp", .014, .5);
        }
    }
    return { score, notes, duration: score.bars * score.beatsPerBar * beat };
}
