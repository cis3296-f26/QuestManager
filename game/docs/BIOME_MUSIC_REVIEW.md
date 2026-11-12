# Biome soundtrack: original arrangements for listening approval

This replaces the five short, similarly voiced eight-bar loops. The previous music
changed pitch and tempo but reused the same rounded tone, chord bed, bass rhythm
and phrase timing. The new scores use 24 bars with an answering middle phrase and
a varied return. These are original synthesized compositions, not external samples,
recordings or copied game melodies. No dependencies or unfinished biome tracks were added.

## Listen and compare from VS Code

Pull `game-prototype`, then run from the repository root:

```sh
python game/scripts/serve-development.py --dev-tools --port 8000
```

On Windows, use `py` instead of `python` if needed. Open:

**http://127.0.0.1:8000/game/dev/music-preview.html**

Or open Adventure → Pause → Settings → Developer Mode → **Compare biome music**.
This opens a separate listening tab while gameplay remains paused. The listening
room stops its music when it is backgrounded. Close it before resuming gameplay.

Choose Play on each card. Nothing plays before a click. Master/Music sliders and
Mute use the existing settings/AudioManager implementation, with memory-only
preferences for auditioning. Pause/Resume preserves position; Restart track returns
to the beginning; Stop silences playback. No login, coins or gameplay progress is
read or changed by this tool.

Normal hosting keeps `developmentBuild = false`. The game does not expose the
listening-room link, and its entry point does not import or mount the player when
the development flag is off. Cookies, URL parameters and account settings do not
enable it. Do not change the tracked build flag to publish a preview.

## Arrangements (desert added with Level 5)

| Scene | Track | Loop | Arrangement and intended atmosphere |
| --- | --- | --- | --- |
| World Map | A Map Full of Promises | 72s · 80 BPM · 4/4 | Warm soft keys carry the main rising-third/fifth motif. Answering harp and sustained string-like tones give the melody room. Inviting rather than a movement beat. |
| Grasslands | Morning on the Meadow | 55s · 104 BPM · 4/4 | Short plucks, soft piano-like offbeats, light bass and a quiet shaker. A buoyant opening, a lower-register answer and brighter final fills. |
| Forest | Leaves in Three | 51s · 84 BPM · 3/4 | Breathy flute, warm wooden mallets and answering harp. The three-beat lilt and lighter texture distinguish it from the grassland pulse. |
| Deep Forest | Under the Old Boughs | 76s · 76 BPM · 4/4 | A lower reed voice reshapes the woodland motif into a minor/Dorian color. Slow pad tones, an uneven soft drum pattern and occasional bells add curiosity and tension. |
| Crystal Cave | Light Inside the Stone | 85s · 68 BPM · 4/4 | Sparse, inharmonic crystal bells and glass tones, quiet cross-channel echoes and suspended low harmony. No outdoor bass/shaker walking rhythm. |
| Sunscorched Dunes | Ribbons over Sandstone | 60s · 96 BPM · 4/4 | A distinct plucked/reed refrain, quiet syncopated drum pulse and a lighter harp answer. Added through the same registry; no new playback system. |

These are intentionally synthesized interpretations of instruments, not claims of
real acoustic performances. They share a soft adventure palette, while meter,
voicing, rhythm, melodic density, space and texture change between scenes.

## Playback and resource management

- Existing level `audio.music` keys and the map's `map` key still select tracks.
  A future biome/level variation adds a registry score; no second player is needed.
- A module worker renders new music away from gameplay. If workers fail or are
  unavailable, a cancellable fallback yields between short batches of notes.
- While a new score prepares, the previous scene music continues. It then fades
  down over 70ms; the replacement starts after that fade and rises over 150ms.
  Rapid scene changes discard obsolete results. No pair of scene tracks is mixed
  audibly during the handoff.
- The first-ever track needs a short preparation period after the browser gesture.
  There are no music downloads or large checked-in audio files.
- Long buffers are stereo, 22,050Hz, rendered lazily. The cache retains at most two
  tracks (roughly 18–28MB depending on the pair), plus the current retiring voice
  briefly during a transition. Workers terminate after rendering or cancellation.
- Pause/background stops sources and preserves the playing offset. Resume excludes
  paused wall time; restart begins the selected track again. Death and completion
  retain the existing stop-and-cue behavior. Music cannot start from a stale loading
  promise after completion or disposal.
- The same Master/Music/Effects/Mute preferences and account-specific saved keys
  remain. Music volume affects every score; effects volume is independent. Mute
  sets both channel gains to zero immediately.

## Verification and limits

The PCM is generated from the actual production scores. Measured stereo RMS is
approximately 0.018 for every track, and peak magnitude ranges from about 0.064 to
0.138, below clipping. Wrapped releases/echo tails and a small boundary-value
correction avoid an abrupt sample step without inserting silence. Tests check
finite samples, long-loop duration, boundary values and unintended silent seconds.
These are numerical checks, not proof of pleasing phrasing or an inaudible seam.

Tests cover all five level/map assignments, different arrangements and phrase
sections, unchanged sound-effect sample hashes, async preparation/races, worker
transport/cancellation, buffer eviction, fades, missing assets, autoplay rejection,
pause/resume/restart, completion/death, mute/volumes and cleanup. The preview is
tested with mocked DOM/audio boundaries and a production import guard. Existing
gameplay and 30/60/120 FPS route checks remain in place.

Executed for this revision: **187 tests passed**, plus `npm run validate:levels`
for all four implemented levels at 30/60/120 FPS. All 12 gameplay effect buffers
match the pre-redesign SHA-256 baselines exactly.

Chromium launch still fails here with `socket() failed: Operation not permitted`.
No browser listening, headphone/speaker balance, real-device worker latency or
subjective musical quality is claimed. Please listen through a full loop of each
track, compare the two forest tracks, check the cave's echo tails, and adjust Music
against the familiar jump/coin/hazard cues in actual gameplay.

## Files and responsibilities

- `audio/MusicScores.js`: track registry, original notes/harmony, meter and arrangements.
- `audio/MusicSynth.js`, `audio/music-worker.js`: stereo instrument voices, envelopes,
  wrapped echoes, mix normalization, loop handling and worker rendering.
- `audio/SynthAssets.js`: unchanged sound-effect recipes, two-score cache and preparation.
- `audio/AudioManager.js`: existing player extended for prepared buffers and short fades.
- `dev/music-preview.html`, `music-preview-entry.js`, `MusicPreview.js`: gated listening room.
- `dev/DeveloperToolsPanel.js`: development-only comparison link.
- Audio tests/helpers and the sound-effect baseline: behavior, PCM and preservation checks.

No level geometry, controls, enemy behavior, saves, Supabase integration or Level 5
content was changed. The soundtrack remains a listening candidate until you approve it.

Level 5 adds the sixth listening-room track. See [the desert guide](LEVEL5_PLAYTEST.md) for current 205-test and five-level route validation results; earlier counts above record the original music revision.
