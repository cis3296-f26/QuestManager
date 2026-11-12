# Level 4: Crystal Cave — manual test guide

Level 4 is implemented for playtesting, not declared approved. Levels 1–3 retain their layouts, coin IDs and scenery. No Supabase, shop currency, account schema or Levels 5–10 were changed.

## Open the game

From the repository root in VS Code:

```sh
git switch game-prototype
git pull --ff-only origin game-prototype
python -m http.server 8000
```

Open `http://127.0.0.1:8000/game/` in the same browser/origin used for your existing account and saves. Complete Level 3 to unlock Crystal Cave. Select node 4, inspect its three coin indicators, then Play. `#level-4` also works once unlocked. There is no unlock cheat or automatic save migration.

Click the canvas. A/D or Left/Right move; Space/W/Up jump; R restarts; Esc pauses. Slimes can be stomped, bats cannot. Special collectible coins remain separate from shop currency and save only at the flag.

## Course and intended routes

See [the timed cave revision](TIMED_CAVE_PLAYTEST.md) for the current switch, return steps and drop lanes. The [earlier layout diagram](crystal-cave-layout.svg) predates those changes. Coordinates are world pixels for finding encounters; no debugging controls are needed.

| Section | World x | Intended play |
| --- | --- | --- |
| The Crystal Alcove | 0–2800 | Spawn on the y410 shelf. Cross to x550, then choose the stone arch at x740–1080/y365 or the lower coin alcove at x740–1050/y500. Rejoin at x1150, meet a short slime patrol, then walk beneath the overhead bat on the far bank. |
| Crystal Passages | 2800–6000 | Main route stays low. Optional shelves at 3180, 3420 and 3660 lead to the Crystal Gallery, Coin 2 and a drop back to the far bank. |
| Stalactite Cavern | 6000–9600 | Teal-tipped spikes at 6500, 6910, 7670, 7930 and 9020 warn before falling. Warnings are shorter and aligned with the approaching player. A shelf at 6780 bypasses thorns. Watch separate rock/slime encounters rather than rushing blind. |
| Ancient Crystal Chamber | 9600–13600 | Pass a slime, rock and bat, board the broad dock at 10480, then ride the suspended stone slab across the 440px chasm. After the landing, choose the lower route or cracked-slab vault puzzle. |
| Cave Exit | 13600–16000 | Two drop lanes at 13980 and 14400, recovery before the final gap, then the safe flag at x15960. No enemy waits at the finish. |

The ferry crosses open space between the dock and landing; no ordinary stepping stones duplicate its crossing. The collapsing slab sits over a pit. There is no vertical lift: the optional climbs use reachable, purposeful rock shelves.

| Coin | Stable ID | Location and challenge |
| --- | --- | --- |
| Easy | `level-4-coin-1` | x900, y470: optional lower alcove; jump from its far lip to the main passage at x1150/y460. |
| Medium | `level-4-coin-2` | x3930, y230: optional elevated Crystal Gallery; reconnect on the lower passage. |
| Hard | `level-4-coin-3` | x13170, y230: stomp the lower switch at x13030, turn back up the two blue steps, then pass the timed door before it closes. |

The lower blue button requires a stomp and opens the matching gate for 3.5 seconds. Re-stomp to retry or refresh the timer. The blue-edged return steps lead left and up, then right through the door. The lower main passage does not require the puzzle; coin saving remains unchanged.

## Manual scenarios to approve

1. **Readability and controls:** check your equipped avatar against the purple background, both facing directions, jumps, landings, camera/HUD headroom and upcoming ledges. Crystals should add depth without resembling hazards. The first bat should be understandable before the later bat near the dock.
2. **Falling rocks:** approach a teal-tipped rock, watch the warning shake/`!`, then move away. Try waiting directly under it: falling contact should cause the existing death transition. Hanging/spent rocks should not hurt. Verify R, death and replay restore every rock. With Reduce Motion enabled, warning color/`!` remain but shake stops.
3. **Cave creatures:** stomp a purple slime and observe bounce/squish. Side contact kills. Bat contact from above, below or the side kills. Both patrol predictably and reset.
4. **Ferry and cracked slab:** wait on the dock at different arrival times. Board, ride through reversal, move along the slab and jump onto the far bank. At the vault slab, wait for warning/collapse and fall; retry and jump away near the end of its 1.1s warning. No automatic death until a real hazard/fall.
5. **Optional puzzle:** approach the sealed vault from its left shelf without activating the plate: the wall must block the upper route. Stomp the lower button, observe the countdown and opening cue, then climb back through the door for Coin 3. Wait for expiry and re-stomp to retry; walking over it must not activate it. Restart and confirm both plate and gate reset.
6. **Coin saves:** collect coins then die or leave for the map: new coins are discarded. Complete with two coins, replay for the third, then finish: progress should merge to 3/3. Earned coins remain faded and cannot duplicate rewards. Refresh and switch accounts to check isolation. Existing Levels 1–3 progress should remain unchanged.
7. **Finish/navigation:** finish without any coins/secrets, then with all three. The completion popup must show saved coins and wait for a button. Replay restarts everything; World Map returns normally. Completing 4 unlocks 5 in progression, but Next Level remains disabled/Coming soon because 5 is not implemented.
8. **Pause and sound:** pause during a rock warning, ferry ride and collapse warning. Nothing should advance until resumed, including music position. Check mute/channel sliders, restart/map confirmations and returning from a background tab. Listen for the original calm cave score and single warning/impact/switch/gate cues; no constant bat noise.

## Automated evidence and limits

Run from the repository root:

```sh
npm test
npm run validate:levels
```

The suite includes continuous recorded keyboard-input witnesses using the actual shared physics/collisions: spawn → all three coins → flag and spawn → zero coins/no secret discoveries → flag at 30, 60 and 120 FPS. Separate witnesses test each secret from its declared entrance through reward and safe reconnection at all three rates. No route proof uses teleports, enemy removal or save writes. Local setup/teleports in unit and UI tests are explicitly boundary/encounter tests, not full playthrough claims.

Targeted checks cover swept rock/player contact and partial-frame trigger timing, warning/impact/reset, gate walls including fast/corner contact, linked touch/plate switches, cave slime stomping, non-stompable bats, ferry boarding/reversal/exits from multiple phases, last-moment collapse escape, save isolation, existing routes and actual entry-point pause/audio/navigation wiring with DOM/auth/audio boundaries mocked. Canvas previews were rendered and inspected locally.

Optimized Level 4 route traces finish in about a minute at full running speed. This proves reachability, not a 3–5 minute human completion time. Exploration, observing warnings, retries and difficulty/readability still need your playtest. Browser audio has not been listened to here; your approval is required for sound balance and gameplay feel.

## Changed-file responsibilities

- `levels/Level4.js`, `Level4Scenery.js`: five authored sections, three stable coin IDs, eleven falling spikes, cave creature placements, two exploration routes and one optional blue plate/gate. All attempt state stays outside the configuration.
- `entities/Stalactite.js`, `levels/GatePuzzle.js`: reusable triggered hazard and linked puzzle state/collision/reset logic.
- `entities/Enemy.js`: a configurable flying marker; bat patrols reuse existing movement instead of a second enemy engine.
- `levels/LevelManager.js`, `engine/stepLevel.js`, `levels/design/defineLevel.js`: instantiate, advance and reset the new configuration through the existing game lifecycle.
- `rendering/CaveRenderer.js`, `CaveMechanicsRenderer.js`, `EnemyRenderer.js`, `GrasslandRenderer.js`, `PlatformRenderer.js`, `ExplorationRenderer.js`: cave background, crystal veils, creatures, stone slabs, rock warnings and gate state; drawing does not mutate physics.
- `game.js`, `levels/levels.js`, `index.html`: cave renderer/death message and registration in existing map/navigation. No new navigation screen.
- `audio/SynthAssets.js`, `GameAudioEvents.js`, `AudioManager.js`: original cave score, transition-based cues, rock damage sound; centralized settings/pause retained.
- `levels/design/validateCaveMechanics.js`, `validateLevel.js`, `validateExploration.js`: geometry/reference checks and valid airborne patrols/crystal veils.
- `tests/cave-mechanics.test.mjs`, `level4.test.mjs`, recorded fixtures, existing map/audio/pause/design tests and harness: new behavior, regression checks and fourth-level expectations.
- `docs/crystal-cave-layout.svg`, this guide: authored layout and manual approval checklist.
