# Soft retro adventure audio

Original synthesized music and effects; no external recordings, copied game music,
new database tables or dependencies. Listening approval is still pending.

## What changed

- `audio/SynthAssets.js`: cached soft sine/triangle tones and quiet woody textures.
  Three sparse eight-bar loops: welcoming map, cheerful grasslands and playful,
  slightly mysterious forest. Loops run approximately 22–25 seconds with rest bars.
- `audio/AudioManager.js`: one browser audio context, one background track, bounded
  effects, gesture unlock, category gains and safe failure/cleanup. Pause and window
  blur preserve music position; restarts begin the level theme again. Death and
  victory stop background music immediately, then play one short cue.
- `audio/GameAudioEvents.js`: translates confirmed gameplay events into sounds.
  Quiet footsteps follow running cycles; landing, new coins, stomps and collapsing
  board warning/break cues fire once per transition. Thorns use a damage cue;
  other deaths use a descending cue. No continuous enemy/platform noise.
- `game.js`: connects these events to existing input, pause, navigation and lifecycle
  flows. Level configurations select music. Existing settings, account separation,
  collectible saving and muted visual feedback remain in use.

## Listen from VS Code

```sh
git switch game-prototype
git pull --ff-only origin game-prototype
npm test
npm run validate:levels
py -m http.server 8000
```

Open http://127.0.0.1:8000/game/ using your usual browser/origin for saved progress.
Refresh fully. Click or press a key to enable audio; browser autoplay restrictions
can keep a new page silent until that interaction. Unsupported audio leaves the
whole game playable without sound.

1. Listen to the map, then Levels 1 and 2. Each should have one distinct, gentle
   theme. Stay for several loops and assess repetition, balance and loop seams.
2. Run, stop and jump with Space, W or Up. Footsteps should be quiet and stop in
   midair. Jump/landing should play once, with no landing chatter while standing.
3. Collect a new coin, then try an already saved faded coin after replaying.
   Only a new pickup should chime. Coin saving still requires reaching the flag.
4. Stomp a slime, collide sideways, touch a mushroom, fall and touch thorns.
   Stomps should sound distinct from jumping; each death should produce one cue.
5. In Level 2, trigger collapsing boards and jump away. Listen for one quiet
   warning and one break. Moving platforms intentionally have no continuous hum.
6. Pause mid-music, wait, then resume. Music should continue from the same point.
   Gameplay sounds must not trigger in menus. Change Master/Music/Effects and Mute
   All in existing Settings: changes apply immediately and unmute restores levels.
   Refresh and check settings persist for the same account.
7. Restart, return to the map, switch levels, blur/return to the window and replay.
   Tracks must not overlap. Reach the flag: music stops, victory plays once and
   the existing completion popup/coin achievements remain correct.
8. Mute everything and verify all visual gameplay feedback still works. Check a
   different account receives its own settings and collectible progress.

## Automated verification and limits

Tests cover real generated PCM levels/finite samples/loop boundaries, cache reuse,
volume and mute gains, one music source, pause offsets, unlock rejection/races,
missing audio, duplicate suppression, resource limits and device failure cleanup.
Gameplay event tests run at 30/60/120 FPS. A mocked browser/audio integration runs
actual `game.js` input, coin, stomp, death, finish and replay paths. Existing route,
secret, platform, progress, settings and navigation tests remain in place.

These are automated checks with a fake audio device, not browser listening tests.
A local Chromium launch was blocked in this environment. Timbre, perceived volume,
repetition, browser latency and audio comfort require your own listening approval.
