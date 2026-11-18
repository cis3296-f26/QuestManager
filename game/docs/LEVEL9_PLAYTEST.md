# Level 9: Volcano — The Inferno's Edge

Development plan and acceptance guide. Not approved/finalized. Branch: `game-prototype`; no Supabase changes or Level 10 gameplay. Publication requires user permission.

## Authored plan before implementation

27,000 world pixels, five connected areas, 22 named encounters. Keep the 960×540 horizontal camera, 280px/s run speed, 650 jump impulse and 1800 gravity. Actual rise at 30/60/120 FPS is 106.7/112.0/114.7px; ordinary same-height travel is about 196–201px. All elevated supports stay at y285 or lower in the viewport. The layout uses broad basalt terraces and islands, bridges between declared banks, mounted climbing structures, visible vents and recovery bays.

| Area | Range | Encounters and purpose |
| --- | --- | --- |
| Ashen Foothills | 0–5,000 | Summit Descent (0–1,200): dry basalt introduction; First Molten Crack (1,200–2,520): clearly marked permanent lava; Smoldering Hollow (2,520–3,900): optional lower passage and climbing exit; The Cinder Watcher (3,900–5,000): lone slime then recovery |
| Lava Crossing | 5,000–10,500 | The First Vent (5,000–6,400): safe observation before one geyser; River Ferry (6,400–7,800): meaningful moving transfer across wide lava; Basalt Islands (7,800–8,900): variable landing elevations; The Broken Causeway (8,900–9,800): collapsing crossing; Chamber Mouth (9,800–10,500): quiet descent and checkpoint approach |
| Magma Chambers | 10,500–16,000 | The Ember Gallery (10,500–11,900): enclosed cavern and vertical lift; The Split Vent (11,900–13,400): geyser observation and optional high seal route; Forgotten Magma Vault (13,400–14,600): solid chamber, latched switch and protected Coin 2; The Dark Outlet (14,600–16,000): separate bat encounter, lower alcove and recovery |
| Eruption Ridge | 16,000–22,000 | Ridge Lookout (16,000–17,300): checkpoint then taught eruption; The Alternating Vents (17,300–18,600): two vent timings with an intermediate safe bank; Fractured Basalt (18,600–19,500): temporary bridge over lava; Eruption Crown (19,500–20,700): optional climb/vent/cracked upper crossing for Coin 3, lower ferry alternative; The Quiet Shelf (20,700–22,000): recovery then one readable patrol |
| Castle Approach | 22,000–27,000 | Blackstone Pillars (22,000–23,400): changing elevations and distant towers; The Castle Lift (23,400–24,600): genuine high transfer; The Last Lava River (24,600–25,900): final ferry and visible lava; The Outer Gate (25,900–27,000): safe landing and flag before an imposing decorative castle |

Main route uses the river ferries, gallery/castle lifts and two fractured bridge sequences. There is no required coin or locked gate. Optional routes reconnect: the lower Smoldering Hollow uses a ladder back to its overhang; a high plate opens both doors of a solid Magma Vault until restart; the Crown uses an upper climbing route while the main route rides a lower ferry. Safe observation banks precede every eruption. No creature patrol occupies a vent's damage column, rope dismount or sole hard-crossing landing.

Planned gold: `level-9-coin-1` at (3,010,455), in a lower rock passage beneath the main overhang; `level-9-coin-2` at (13,740,335), inside the solid-floor/roof, switch-opened vault; `level-9-coin-3` at (20,200,200), beyond the optional Crown's timed vent and collapsing upper bridge.

Permanent lava is limited to explicit crossing encounters: introductory crack, first vent, ferry river, broken causeway, chamber vent, paired ridge vents, fractured ridge bridge, Crown river and final river. Other gaps remain dry ravines. Lava rectangles are drawn exactly as damaging pools, with bright upper edges; background lavafalls are translucent, recessed, non-colliding scenery.

Geyser plan (x / width / top → bottom; warning / active / recovery / cooldown / initial dormant seconds):
- First vent: 5,950 / 56 / 235→490; 1.2 / 1.1 / 0.4 / 4.2 / 2.0.
- Chamber vent: 12,320 / 60 / 220→490; 1.1 / 1.3 / 0.4 / 3.8 / 1.2.
- Ridge lesson: 16,820 / 60 / 220→490; 1.1 / 1.3 / 0.4 / 3.6 / 0.8.
- Paired vents: 17,710 and 18,210 / 60 / 220→490; 1.0 / 1.2 / 0.4 / 4.0, staggered initial dormancy 1.0 and 3.6. A safe island separates them.
- Crown vent: 19,850 / 56 / 140→490; 1.1 / 1.2 / 0.4 / 4.4 / 1.5. The safe upper launch precedes the column; lower ferry also respects its timing.

Reuse SunPulseTrap's time-sliced swept damage, extending its cycle presentation for dormant/warning/eruption/recovery/cooldown. Do not duplicate collision integration. Lava pools use swept rectangle collision and the existing death pipeline. Reuse existing crack/break/gate/coin/stomp/death cues; add short original bubbling-warning/eruption cues only at nearby phase transitions, not constant ambient loops. Original volcano music uses the existing manager/preview registry.

Evaluate isolated in-memory checkpoints at (10,620,430) and (16,100,430), on broad enemy-free main-route banks. They must never save coins, settings or account progress. Death clears pending pickups, resets hazards/platforms/enemies and preserves assistance; manual restart/replay starts at the ordinary spawn. All-three-coin proof must survive continuously from spawn. Missing earlier coins after a checkpoint death may be recollected by backtracking or starting a fresh attempt; document this clearly rather than silently banking them.

## Implementation and exact geometry

The implemented course has **73 platforms, 12 lava pools, six geysers, five creatures, two optional ladders, five moving platforms and five collapsing slabs**. The five area ranges and 22 encounter ranges above match the final configuration. [Complete level layout diagram](level9-layout.svg).

### Main and optional routes

The zero-coin main route stays on the upper Hollow overhang, follows the lower tunnel under the locked vault and uses the lower Crown ferry. It still uses the two other ferries, both vertical lifts and the two main collapsing bridge sequences. The Crown is an intentional, harder alternate crossing; it is not an accidental static bypass of a mandatory ferry. No other stepping stones replace the intended moving transfers.

| Coin / stable ID | Center | Intended challenge and reconnection |
| --- | --- | --- |
| Coin 1 · `level-9-coin-1` | 3,010 / 455 | From the x2,520–2,750/y400 approach, drop into the x2,780–3,340/y490 lower passage under the basalt arch. Explore for gold, then use E and W/Up on the x3,280 ladder to reach the y350 overhang. Exit east to x3,600–3,900/y400. The main route jumps directly to the overhang and cannot pick up the coin below it. |
| Coin 2 · `level-9-coin-2` | 13,740 / 335 | From x12,820–13,240/y450, jump to the y355 seal step and y285 balcony. Step on the gold plate at x13,180; both doors latch open for the attempt. Continue via the x13,400/y335 entrance shelf into the y365 vault. Leave east, descend to the lower tunnel and reconnect at x14,160–14,540/y430. |
| Coin 3 · `level-9-coin-3` | 20,200 / 200 | Climb the x19,620 ladder from the y440 refuge to the y305 launch. Watch the tall vent, then jump to the x19,820–19,930 cracked slab while the column is inactive. Cross to the x20,080–20,300/y285 Crown, jump for gold, then descend to the main return bank at x20,140–20,520/y430. |

The vault has a solid floor, two full-height doors and a solid roof tied into the cavern ceiling. The roof runs from y105 to y204; it cannot become an unintended high jumping ledge. Closed doors block side entry, the solid floor blocks coin sniping from below, and the roof prevents entry from above. Both gates remain open only after the seal is pressed, until death or manual restart. The lower tunnel always remains available for finishing without the coin. Existing gate collision and safe outward egress rules are reused.

### Permanent lava geometry

Every pool occupies y490–540. The orange fill covers the exact damage rectangle; bright top edges and ripples stay inside it. Scenery renders behind the lava so an arch leg cannot cover the visible danger. Recessed, translucent lavafalls are decorative, without the bright foreground pool outline.

| Encounter | Pool x range |
| --- | --- |
| First molten crack | 1,480–1,600 |
| First vent | 5,910–6,040 |
| River ferry | 6,840–7,370 |
| Broken causeway | 9,160–9,600 |
| Gallery lift | 11,340–11,700 |
| Chamber vent | 12,230–12,410 |
| Ridge lesson | 16,700–16,900 |
| Paired west vent | 17,640–17,820 |
| Paired east vent | 18,120–18,300 |
| Fractured ridge bridge | 19,020–19,440 |
| Crown / lower ferry | 19,720–20,140 |
| Last lava river | 25,280–25,810 |

Pools use swept AABB contact, so a fast fall cannot tunnel through a thin surface. Lava enters the ordinary one-hit death pipeline. Fly Mode and Invincibility suppress damage through their existing shared mechanism; turning flight off uses safe placement that rejects lava and every geyser's complete potential damage column.

### Reusable geysers

`LavaGeyser` extends `SunPulseTrap` and reuses its existing time-sliced swept collision update. Its phase function describes initial dormancy, warning, eruption, recovery and cooldown. Only the eruption slice is damaging. The underlying timing names remain compatible with the shared collision implementation; public states expose the volcanic sequence.

The six final timings match the plan above: x5,950, x12,320, x16,820, x17,710, x18,210 and x19,850. Heights and widths are explicit rectangles, not inferred from artwork. Initial dormancy supplies staggered timing offsets; after that each vent repeats predictably. There is no hidden proximity trigger. The paired vents alternate without simultaneous eruptions, and a 300px static island between them allows independent waiting.

Warning visuals include a dashed outline of the coming column, a large `!`, seconds remaining and bubbling at the vent. Reduce Motion keeps the symbol, countdown and outline. The active orange/yellow column fills its exact damage bounds. Recovery ends the dangerous column and shows only a small fading steam patch. The lava pool underneath remains lethal throughout.

All vent clocks freeze through the shared pause gate and return to their authored initial states after death, restart or replay. Off-screen hazard updates are small timer/collision calculations; artwork is culled to the visible viewport. No particle simulation, rolling lava physics or damage-over-time system was added.

### Meaningful transfers

| Structure | Configuration | Purpose |
| --- | --- | --- |
| River ferry | x6,920/y390, width150, horizontal travel300, speed75, endpoint pause0.5s | Connects x6,500–6,840 to x7,370–7,800 across a 530px lava river |
| Broken causeway | x9,240 and x9,460/y430, widths120, collapse delay1.5s | Crosses a real lava-filled break between x9,160 and x9,600 |
| Gallery lift | x11,420/y440, width140, rises140 to y300, speed55, pause0.5s | Connects the y410 approach to the high Ember Gallery |
| Fractured ridge bridge | x19,100/y410 width120 and x19,320/y410 width100, delay1.5s | Links x19,020 and x19,440 across lava after the paired-vent lesson |
| Crown ferry | x19,800/y430, width120, horizontal travel200, speed75, pause0.5s | Lower main-route crossing to x20,140; live vent timing matters when boarding |
| Crown cracked slab | x19,820/y305, width110, delay1.5s | Optional high crossing over lava after waiting at a safe launch; linked to the Crown |
| Castle lift | x23,740/y440, width140, rises140 to y300, speed55, pause0.5s | Reaches the castle gallery from the y380 departure |
| Last ferry | x25,360/y410, width150, horizontal travel300, speed80, pause0.5s | Final 530px lava river crossing toward an enemy-free finish |

Every special platform declares its actual `connection.from` and `connection.to` IDs. Glowing cracks distinguish collapsing basalt before stepping on it; shaking and stronger fractures follow activation. These decks are temporarily safe platforms, not permanent lava hitboxes.

### Creatures

Three magma slimes patrol broad static terraces around x4,210, x7,620 and x21,300. They have dark red bodies, pale outlines and ember seams, visibly different from orange pools. They reuse existing stomp, bounce, squash/defeat and reset behavior.

Two fire bats patrol the air around x14,830 and x23,110. Dark angular wings, warm outlines and bright eyes distinguish them from magma scenery and earlier owls. They reuse predictable flying patrols and remain non-stompable. Patrol envelopes do not overlap geyser columns, sole waiting banks or optional ladder dismounts.

## Attempt-only refuges and their tradeoff

The refuges at (10,620,430) and (16,100,430) are marked by a small shelter and flag. Walk through the marker while standing on its broad main-route bank to activate it. An activated refuge changes its flag appearance and announces that pending coins still reset on death.

On death, the player respawns at the latest activated refuge, with a deliberate camera cut that keeps them visible. Platforms, timers, doors, enemy positions and discovery state reset. **Every new unsaved coin is discarded and reappears.** The checkpoint never banks a coin, unlocks a level or writes to account storage. Previously earned coins remain credited/faded as usual.

Assistance sticks across checkpoint respawns even after tools are disabled, so flight or a teleport cannot be laundered into a saved completion. R, Replay, leaving the level, account changes and loading a fresh level clear the checkpoint and return to the normal spawn. Levels 1–8, which do not configure checkpoints, keep their earlier restart behavior.

Tradeoff: a late death helps normal completion but loses any newly collected early coins. Players seeking all three after such a death must backtrack for missing coins or use R for a fresh continuous run. The all-three-coin fixtures prove a surviving spawn-to-flag run; they do not silently bank anything at refuges. This compromise follows the requested completion-only saving rule and needs player feedback for enjoyment.

## Music, effects and performance

Original score: **Embers Before the Gate**, 24 bars of 4/4 at 112 BPM, approximately **51.43 seconds per loop**. Minor reed phrases, deep bass, restrained syncopated drums, low sustained pads, wooden accents and distant glass notes differ from the mountain score. Existing master/music/effects volume, mute, pause/resume, map transitions, death and completion behavior remain active. Volcano appears in the existing music listening room; Level 10 has no score or gameplay yet.

Two small original synthesized effects add a bubbling-warning cue and an eruption cue. They play only when a nearby vent changes into warning/eruption, not as endless bubbling loops. Existing crack, collapse, stomp, coin and death effects are reused unchanged. The audio manager retains its existing voice limit, cooldowns, two-score cache and cancellation behavior.

Scenery, pools, platforms and vent artwork are culled to the viewport. Ash uses ten simple marks, and active columns use only a few contained highlights. There are no unbounded particle lists, new network assets or per-restart event listeners. Actual browser frame-rate performance is not measured here because Chromium cannot start.

## Developer Tools

Use the existing local development server:

```powershell
python game/scripts/serve-development.py --dev-tools
```

Open `http://127.0.0.1:8000/game/`, sign in normally, then Pause → Settings → Developer Mode → Enable → Admin Tools. Quick-load Level 9 for inspection. Production defaults remain unchanged; assisted runs cannot save achievements.

| Authored destination | x / feetY |
| --- | --- |
| Ashen arrival | 180 / 420 |
| First lava crack | 1,370 / 390 |
| First vent observation | 5,800 / 400 |
| River ferry departure | 6,740 / 390 |
| Magma Chambers refuge | 10,620 / 430 |
| Optional vault approach | 12,860 / 450 |
| Eruption Ridge refuge | 16,100 / 430 |
| Paired vent observation | 17,520 / 390 |
| Crown lower entrance | 19,500 / 440 |
| Castle Approach | 22,110 / 430 |
| Final river departure | 25,180 / 410 |

Generic destinations also include start, each coin, every optional entrance, final challenge and finish. Safe-position selection chooses a nearby valid static landing. Show Hitboxes outlines pools, complete vent columns with current phase/countdown, checkpoint contact regions, special platforms, gates and enemies. A timed geyser has no proximity trigger to inspect. Flight ignores lava damage, detaches climbing and returns to safe terrain when disabled.

## Automated results and evidence boundaries

Run from the repository root:

```powershell
npm test
npm run validate:levels
```

Final result: **279 automated tests passed**. Level validation passes all nine levels at 30, 60 and 120 FPS, including structural checks, actual jump/climb graph reachability, full zero/all-coin routes and local optional entry/reconnection witnesses. `git diff --check` is clean.

New tests cover all five geyser phases, offsets, swept high-speed contact, active-crossing deaths, inactive crossing safety, exact lava bounds, invincibility/flight, all three ferries and both lifts at varied arrival phases, collapsing-slab escape/death/reset, protected coin access, enemy stomps, checkpoint resets and assisted-run restrictions, persistence, rendering and original music. The actual game entry point's DOM/auth harness checks paused geysers, checkpoint death recovery and camera placement, R reset, Level 8→9 navigation, Level 9 save/replay and unavailable Level 10. Those UI boundary setups are separate from continuous gameplay proofs.

Hashes confirm **all Level 1–8 configurations and all nine earlier musical arrangements are unchanged**. Prior ice, wind, climbing, falling hazards, sun pulses, enemy interactions, shop/avatar code, saved coin IDs and account-specific storage tests remain active. Existing registry/count expectations expand to nine playable levels and ten tracks; tests are not weakened to ignore active hazards.

The normal-input full traces use real direction, jump and climb interactions from spawn with no flight, invincibility, teleporting, disabled vents, removed enemies or save patches. Main traces take approximately **99.2–100.2 seconds**; all-three-coin traces take approximately **107.7–107.8 seconds**. These are optimized machine inputs, not measured human playtimes. The requested 6–10 minute first successful playthrough remains a design target requiring human testing; no speed reduction or filler was added to force it.

Browser launch was attempted and failed with `socket() failed: Operation not permitted`. **No browser playtesting or browser screenshots are claimed.** Native previews verify drawing code, composition and warning readability with a fallback avatar. Actual customized-avatar appearance, keyboard feel, perceived difficulty, human pacing, audio enjoyment and real browser FPS still require the user's review.

## Visual previews

All seventeen images use the actual native canvas terrain, hazard, enemy, gate, coin and scenery renderers. They are **renderer previews, not browser screenshots or successful human playthroughs**. Preview positions and selected phases illustrate each scene; continuous route fixtures separately establish reachability. The authenticated game's customization integration is preserved; previews show the fallback stick avatar.

[Ashen Foothills](level9-foothills.png) · [First permanent lava](level9-first-lava.png) · [Smoldering Hollow / Coin 1](level9-hollow.png) · [Cinder slime](level9-cinder.png) · [First vent warning](level9-geyser.png) · [First vent eruption](level9-geyser-active.png) · [River ferry](level9-river.png) · [Broken causeway](level9-causeway.png) · [Magma Chambers lift](level9-chambers.png) · [Activated refuge](level9-refuge.png) · [Magma Vault / Coin 2](level9-vault.png) · [Ridge eruption](level9-ridge.png) · [Paired vents](level9-paired-vents.png) · [Crown / Coin 3](level9-crown.png) · [Castle Approach / fire bat](level9-castle.png) · [Last river](level9-last-river.png) · [Safe finish](level9-finish.png).

Visual review adjustments: ash-gray arrival stone transitions to darker basalt; actual hazards render above decorative arch legs; vault doors/seal use warm gold rather than Crystal Cave blue; the vault ceiling cannot become an unintended high jumping surface; decorative towers use recessed low-contrast materials instead of cream walkable edges. Warning symbols/countdowns and pale landing rims stay readable against muted red-purple backgrounds. The castle grows across the final region and remains scenery only.

## Manual acceptance steps in VS Code

1. After publication is authorized, use `git switch game-prototype` and `git pull --ff-only origin game-prototype`. Run the development server above, or your existing local server for normal gameplay. Sign in through QuestManager normally.
2. For progression testing, use an account with Level 8 completed. Select Level 9 on the World Map and check its name, summary and three coin indicators. Developer quick-load is for inspection only and cannot validate saving/unlocking.
3. Start a clean attempt. Test the ash-gray arrival, small molten crack and readable landing surfaces. Fall into lava once and confirm the ordinary death effect/restart.
4. Explore the lower Hollow for Coin 1; use the ladder to rejoin the overhang. On a separate zero-coin run, take the upper main route instead.
5. Stop at the first vent's marked observation bank. Watch a full dormant/warning/eruption/recovery/cooldown sequence. Jump across during a quiet interval; deliberately cross an active column once to check damage. Repeat with Reduce Motion enabled.
6. Ride the large river ferry, including an endpoint reversal. Try a different arrival time after restarting. Observe the slime on the broad east bank before jumping or stomping it.
7. Cross the Broken Causeway before its slabs collapse. On another try, remain on one to verify warning → disappearance → lava death.
8. Walk through the first refuge marker at x10,620. Confirm its flag changes. Collect a new coin, die later and verify respawn at the refuge, pending coins discarded and hazards/enemies/platforms reset. Press R and verify a completely fresh spawn/checkpoint state.
9. Ride the gallery lift, then time the chamber vent. Explore the gold seal route. Confirm the vault coin is unreachable through its floor or closed doors; press the plate, enter through a side door, collect and reconnect east. The lower route must remain usable without the puzzle.
10. Activate the second refuge at x16,100. Wait through the ridge vent, then read the two alternating vents from their stable banks/island. There should always be time to observe and retry a crossing.
11. Choose the Crown ladder for Coin 3. Wait at the upper launch, cross the cracked slab while the tall vent is inactive, collect and descend. Try the lower ferry on another run; observe the vent before boarding.
12. Finish the castle lift and final river. Check the quieter recovery space, clear flag contact and increasingly visible castle. No surprise enemy should guard the flag bank.
13. At completion, verify the saved coin union, Replay and World Map. Level 10 may be unlocked in progress data but must remain unavailable for gameplay. There is no automatic next-level transition.
14. Check previously earned/faded coins, refreshing, abandoning a run, dying with new coins and switching accounts. Shop currency and earlier achievements must remain unaffected.
15. Inspect vents/pools/checkpoints with hitboxes and flight. Disable flight and confirm safe placement. Turn tools off after reaching a refuge and die: that attempt must still be marked assisted and unable to save. R begins a fresh clean attempt when assistance is off.
16. Test music volume, effects volume, mute, pause during a warning, map transitions and your customized avatar on ladders. Report unclear cues, waits, unfair landings, checkpoint/coin frustration, actual play time and difficulty before approving the course.

## New and modified files

New gameplay: `entities/LavaGeyser.js`, `levels/AttemptCheckpoints.js`, `levels/Level9.js`, `levels/Level9Scenery.js`, `rendering/VolcanoRenderer.js`.

Shared gameplay/integration updates: `game.js`, `levels/LevelManager.js`, `levels/levels.js`, `levels/design/defineLevel.js`, `levels/design/validateLevel.js`, `engine/Hazards.js`, `engine/stepLevel.js`, `dev/SafePosition.js`, `dev/DebugRenderer.js`, `rendering/CaveMechanicsRenderer.js`, `rendering/EnemyRenderer.js`, `rendering/PlatformRenderer.js`, `audio/MusicScores.js`, `audio/SynthAssets.js`, `audio/GameAudioEvents.js`.

New tests and fixtures: `tests/lava.test.mjs`, `tests/level9.test.mjs`, `tests/fixtures/pre-volcano-baseline.json`, `tests/fixtures/level9-routes.json`, `tests/fixtures/level9-main-routes.json`. `tests/fixtures/exploration-routes.json` gains only Level 9 witnesses.

Existing test registration and integration updates: `tests/biome-music.test.mjs`, `tests/coin-reset.test.mjs`, `tests/design.test.mjs`, `tests/developer.test.mjs`, `tests/exploration.test.mjs`, `tests/helpers/pauseGameHarness.cjs`, `tests/level3.test.mjs` through `tests/level8.test.mjs`, `tests/platform-purpose.test.mjs`, `tests/stomp.test.mjs`. Earlier gameplay assertions remain active; new lava damage names and magma-slime stompability are added explicitly.

Documentation: this guide, `level9-layout.svg` and seventeen `level9-*.png` previews. No earlier level configurations, previous music arrangements, Supabase modules, shop files or account-storage schema changes.
