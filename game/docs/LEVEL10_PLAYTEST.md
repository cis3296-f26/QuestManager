# Level 10: Volcano Castle — The Ember Crown

Implementation plan and acceptance guide. Not finalized or approved. `game-prototype` only; no Supabase changes, no Level 11, publication only with user permission.

## Full course plan before implementation

29,000 world pixels. Preserve the 960×540 horizontal camera and actual 280px/s movement, 650 jump impulse, 1800 gravity (106.7/112.0/114.7px jump rise at 30/60/120 FPS). Design visible y285+ balconies and linked tower courts rather than offscreen climbs.

| Region | Range | Encounters |
| --- | --- | --- |
| Blackstone Gates | 0–5,500 | The Outer Wall (0–1,200): visible fortress and broad basalt terraces; Guardhouse Passage (1,200–2,600): optional lower room and climbing exit; Sentry Walk (2,600–3,500): one predictable guard; The Moat Drawbridge (3,500–4,600): moving stone transfer across real lava; The Portcullis (4,600–5,500): physically blocking entrance controlled by its visible floor plate |
| Ember Halls | 5,500–11,500 | Hall of Banners (5,500–6,900): connected interior ledges; Broken Cloister (6,900–8,000): damaged bridge over a genuine break; Gallery Mechanism (8,000–9,300): plate opens the upper route; The Watcher's Balcony (9,300–10,400): guarded room with lower recovery; Hall Refuge (10,400–11,500): mounted ladder and quiet checkpoint approach |
| Molten Machinery | 11,500–17,500 | The Chain Works (11,500–12,800): refuge then meaningful lift; Furnace Lock (12,800–14,100): lower switch opens the protected lift passage; Furnace Treasury (14,100–15,400): optional maintenance vault and Coin 2; The Piston Crossing (15,400–16,500): ferry above lava; The Exhaust Gallery (16,500–17,500): one telegraphed energy hazard and recovery |
| Tower of Ash | 17,500–23,500 | The Broken Tower (17,500–18,900): required mounted climb; Suspended Masonry (18,900–20,100): collapsing bridge between towers; The Crown Tower (20,100–21,500): optional climb, timed hazard and cracked high transfer for Coin 3; Ashfall Lookout (21,500–22,600): safe baitable rockfall; The Upper Battlement (22,600–23,500): distinct aerial patrol and quiet dismount |
| Ember Throne | 23,500–29,000 | The Final Procession (23,500–26,600): connected pillars and final familiar crossing; Throne Refuge (26,600–27,100): attempt-only recovery immediately outside encounter; Ember Warden (27,100–28,050): 900px readable seal arena; Sunrise Beyond the Gate (28,050–29,000): unlocked safe exit and final flag |

24 named beats. Architecture connects main decks to walls, towers, bridges and chain frames. No wind/ice. Three coins remain optional: lower guardhouse at x1,950/y455; protected maintenance treasury at x14,080/y335; Crown Tower at x21,190/y200. Main route requires the entrance plate, gallery plate and furnace mechanism but no collectible puzzle. Two refuges after the halls and before the arena use existing attempt-only semantics: death loses pending coins and resets all temporary mechanisms, boss and attacks.

Guardian plan: an isolated, deterministic environmental encounter using SunPulseTrap damage and GatePuzzle swept walls. Three ordered physical floor seals, reached with standard movement: ground seal after a warned low pulse; elevated seal beyond a warned vertical beam; final upper LEFT balcony reached by returning and climbing after the combined, staggered patterns. Each phase requires observing one attack cycle before its seal arms; a clear objective and seal indicators explain progress. Safe waiting surfaces remain outside attack rectangles. After seal three, attacks stop, the stone core dims over a short animation and a full-height exit wall opens. The flag requires both confirmed guardian defeat and normal flag contact. Debug flight cannot bypass that requirement or award progress.

Arena camera plan: keep the existing camera unchanged for Levels 1–9; Level 10's isolated 900px arena uses a bounded framing target so all seal routes fit in the 960px view. No vertical camera rewrite. Normal following resumes beyond the encounter.

Ending plan: reuse the completion dialog, hide Next Level permanently for Level 10, show eligible banked completion/coin totals, Replay 10 / World Map / Credits. Only verified, unassisted saved progress can show QUEST COMPLETE or Perfect Adventure. Test runs explicitly say TEST RUN — PROGRESS NOT SAVED. Credits use only README-confirmed QuestManager / CIS 3296 / Temple University information; no invented contributor names.

## Implemented responsibilities

- `levels/Level10.js` and `Level10Scenery.js`: authored terrain, mechanisms, five architectural regions, patrols, optional rooms, lava, two exhaust columns, one falling rock, climbing routes, refuges, coins and final arena. Existing Levels 1–9 configurations are unchanged.
- `levels/EmberWarden.js`: attempt-only encounter state, ordered grounded seals, observed attack intervals, existing SunPulseTrap warning/damage timing, existing GatePuzzle swept exit collision, shutdown and reset. No weapons, new combat physics or permanent boss state.
- `LevelManager`, `stepLevel`, `Camera`: optional encounter integration and completion guard. Camera framing opts in only inside the final arena; normal following resumes beyond its exit.
- `rendering/CastleRenderer.js`: stone towers, arches, guardhouse, balconies, machinery, furnace/chain scenery, Warden/core/seals and sunrise window. Stone decks and their supporting details remain separate from exact hazard rectangles. The guardian is background machinery, not an invisible contact-damage enemy; only the outlined active attack areas hurt.
- `audio/MusicScores.js`: three new original arrangements: **The Crown Behind the Stone** (100 BPM, 57.6s), **Three Seals at the Ember Throne** (120 BPM, 48s), **Morning Beyond the Fortress** (78 BPM, 55.4s), plus a short original Warden victory cue. Earlier scores and effects retain their baseline hashes. All 13 tracks appear in the existing developer listening room. Existing volume, mute, pause and single-track transition controls apply.
- `ui/Endgame.js`, completion HTML/CSS and game wiring: banked ten-level/30-coin summary, legitimate perfect message, credits panel, Replay Level 10 and Return to World Map. No Level 11. Normal ending does not require collecting all coins.
- Developer tools: major-room destinations, safe coin approaches and **Ember Warden entrance — resets encounter**. Teleporting there resets the guardian and marks the attempt assisted. Debug flight cannot finish before the boss is defeated. Hitboxes show the seal and attack rectangles.

## How to test locally

1. Use `game-prototype` with these changes once published. Run the existing development server: `python game/scripts/serve-development.py --dev-tools`, then open `http://127.0.0.1:8000/game/`. Sign in normally. Completing Level 9 unlocks Level 10; no save migration or Supabase change is needed.
2. For a legitimate run, enter through the world map and leave developer assistance off. A/D or arrows move, Space jumps; E attaches to ladders, W/S or arrows climb, Space jumps off. Controls remain in Settings.
3. Explore below the first wall for Coin 1, then climb the guardhouse ladder back out. Ride the drawbridge across the real moat. Step on the entrance plate to raise its blocking portcullis. Continue through the hall mechanism and mounted balcony ladder.
4. After the machinery refuge, step on the furnace plate, board the chain lift and cross the opened upper passage. The optional gold maintenance plate opens the treasury doors; its solid floor/roof prevent collecting Coin 2 through the room. The underpass is the zero-coin route.
5. Climb the Tower of Ash. The lower carrier is the main route. For Coin 3, take the crown ladder, wait for the outlined energy column to go dark, ride the upper carrier, cross the cracked ledge and jump for the high coin before descending to the main return. Collapsing stone gives 1.5 seconds of warning; it is over actual danger.
6. Touch the throne refuge before entering the arena. Stay clear of outlined attacks while **CHARGING**; cross when dark or jump over a low active pulse. Activate Seal 1 on the arena floor, jump via the central step to Seal 2 on the right gallery, then return left and climb to Seal 3. The next seal arms after its phase's initial attack cycle. Observe the numbered seals and HUD phase/progress. No attack key is needed.
7. After the third seal, watch the core dim and exit wall open. Follow the safe sunrise gallery to the flag. Confirm the final screen, saved level/coin totals, Replay 10, credits open/close and Return to World Map. Repeat with missing coins: the ordinary ending must still work. Perfect Adventure must appear only with 30 banked coins and a verified unassisted finish.
8. Die during the boss: the throne refuge should remain active for this attempt, but all seals, attack cycles, enemies, mechanisms and unsaved coins reset. R/manual replay starts from the castle entrance and clears both checkpoints. Leaving also discards pending coins.
9. Pause during each phase and during a charging attack. Timers should freeze. Try Reduce Motion, music/effect volume and mute; warnings must remain readable. Check custom wardrobe appearance throughout.
10. To inspect without replaying the castle, Settings → Developer Mode → Enable Developer Tools → Admin Tools → load Level 10 → teleport to **Ember Warden entrance — resets encounter**. Resume and use normal controls to fight it. Repeat that teleport to reset it. These are test runs and must display **TEST RUN — PROGRESS NOT SAVED**, with no permanent rewards or perfect claim. Start a fresh normal attempt afterward.

## Automated evidence and its limits

`npm test` and `npm run validate:levels` exercise all ten courses. Level 10 has continuous spawn-to-flag all-coin and zero-coin keyboard traces at 30, 60 and 120 FPS, plus nine local entrance→optional area→coin→safe reconnection witnesses. Full traces include live creatures, lift/ferry clocks, collapsing slabs, sealed-room collision, furnace beams, climbing, all three real Warden seal activations and the mandatory final exit. No flight, teleports, enemy removal or fabricated defeat state is used in these full-route proofs.

Negative/unit tests separately inspect airborne/wrong-support/future/early seals, active attack damage versus warning safety, full-height exit collision, premature flag rejection, shutdown delay, partial progress non-saving, treasury access from below and either closed side, resets, account isolation and ending totals. These use declared boundary setups and must not be mistaken for whole-course playthroughs. The DOM harness additionally replays a local boss trace through real game key events, pauses active phases, exercises the final dialog/credits/replay/map, and rejects assisted saves. Earlier level/configuration and music hashes are retained.

Optimized successful input traces take approximately **122–131 seconds**. This is not evidence of a 7–12 minute first human playthrough: observation, exploration, mistakes and retries are not represented by a memorized success trace. Human timing, musical feel, fairness and visual enjoyment still need approval.

**Browser limitation:** Chromium fails here with `socket() failed: Operation not permitted`. There has been no browser playtest. Native canvas renders use the actual renderers and authored geometry, with deliberately staged poses/hazard phases and the fallback avatar. They are visual inspection aids, not browser screenshots or normal gameplay recordings. Audio is tested structurally and through synthesis/playback mocks; listening approval remains yours.

## Layout and native previews

[Full five-region geometry diagram](level10-layout.svg)

| Area | Preview |
| --- | --- |
| Blackstone Gates | [Outer defenses](level10-gates.png), [Lower guardhouse](level10-guardhouse.png), [Moat drawbridge](level10-drawbridge.png) |
| Ember Halls | [Gallery mechanism](level10-halls.png) |
| Molten Machinery | [Furnace switch and chain lift](level10-machinery.png), [Optional treasury](level10-treasury.png) |
| Tower of Ash | [Mounted climb](level10-tower.png), [Optional Crown route](level10-crown.png) |
| Ember Throne | [Approach and refuge](level10-throne.png), [Guardian warning](level10-warden-warning.png), [Active attack](level10-warden-active.png), [Shutdown](level10-warden-defeated.png), [Sunrise exit](level10-sunrise.png) |

Not finalized. Publication and the player's visual, gameplay, difficulty and music approval remain separate steps.

## Final automated run

- `npm test`: **292 passed, 0 failed**.
- `npm run validate:levels`: **passed all ten levels**, including every authored platform's local reachability graph, six Level 10 continuous full-course input traces and nine Level 10 optional-area witnesses.
- `git diff --check`: passed.
- Final-seal spacing additionally rejects a direct normal jump from either central platform at 30/60/120 FPS; successful complete traces use the real left ladder.
- Furnace lift boarding/carry/departure is tested from three movement phases at all three frame rates.
- Files remain on `game-prototype`; no push, master merge, Supabase changes or Level 11.
