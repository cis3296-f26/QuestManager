# Developer Mode: local gameplay testing

These tools are implemented for local development. They do not grant administrative account/database privileges. Nothing changes Supabase, shop balances or level layouts. Existing achievements remain unchanged unless you explicitly confirm the collectible-coin reset described below.

## Enable from VS Code

Stop your existing local server with Ctrl+C first. In the repository root:

```sh
git switch game-prototype
git pull --ff-only origin game-prototype
python game/scripts/serve-development.py --dev-tools
```

Open `http://127.0.0.1:8000/game/`. If your existing saves use `localhost:8000`, keep that exact hostname instead. If you used a different port, add `--port 5500` (or your existing port) and use that same origin. Browser accounts/local progress are origin-specific; a different hostname/port does not erase old saves but has separate storage.

1. Start any unlocked level, normally Level 1.
2. Pause (Esc or the Pause button) → Settings → Developer Mode.
3. Check **Enable Developer Tools** → **Admin Tools**.
4. Enable Fly Mode, then Back to Pause → Resume.

The development server binds to `127.0.0.1` only. The flag is explicit and defaults off. No dependency installation, secret password or browser-storage edits are needed.

## Tools

| Tool | Behavior |
| --- | --- |
| Fly Mode | W/Up flies up; S/Down flies down; A/Left and D/Right fly horizontally. Diagonals are normalized. Hold Shift for a 1.6x flight boost. Gravity, terrain/gate blocking, stomping and damage are bypassed for the flying player. The rest of the world continues simulating. |
| Flight speed | Defaults to 560 world pixels/second; configured in `DeveloperModeManager`, separate from normal movement tuning. |
| Fly off | Snaps to the nearest valid stable support, avoiding solid terrain, closed gates, hazards and enemy patrol areas. Then normal movement/gravity/damage resume unless Invincibility is still on. |
| Invincibility | Normal gravity, jumping, platforms and valid stomps remain. Enemies, thorns and falling rocks cannot kill the player. Falling off-map recovers onto nearby safe terrain without resetting other world state. |
| Show Hitboxes | Render-only outlines: white player; pink enemies; green static surfaces; cyan moving surfaces; orange collapsing surfaces; red hazards/falling rocks; dashed lavender rock triggers; teal switches/gates; yellow coin pickup circles; cream flag contact line. Uses live world positions and actual animated coin centers. |
| Game Speed | 0.5x, 1x or 2x. Applies to simulation and gameplay animations/timers, including enemies, coins, platforms, rock warnings and death transitions. Modified rates use bounded physics substeps. Menus and music pitch/playback remain at normal wall time. |
| Load Level | Lists only implemented Levels 1–4 and can bypass normal locks for testing. The URL uses a separate `#test-level-N` context; this does not unlock the normal map node or write progress. |
| Teleport | Options derive from the current level's spawn, coins, exploration entrances, penultimate challenge section and finish configuration. Placement searches actual stable surfaces and validates safety; unavailable/undefined destinations are omitted or refused. A distant teleport cuts the camera immediately instead of leaving the player offscreen. |
| Restart / Map | Reuses existing lifecycle/navigation. Restart resets enemies, platforms, rocks, switches, gates and temporary coins; returning to the map discards unsaved pickups. |

The panel uses the existing paused native dialog, not a second menu loop. Esc goes Admin Tools → Developer Mode → Settings → Pause → Resume. Back to Pause is also available directly. Gameplay keys are ignored while a menu is open. Existing audio settings stay separate.

## Progress protection

Using flight, invincibility, a non-normal speed, teleport or developer level loading marks the attempt **developer-assisted** immediately. Both the gameplay indicator and completion popup show **TEST RUN — PROGRESS NOT SAVED**. Temporary coin pickups still work for inspection. The popup displays previously saved coin achievements, not newly banked test rewards.

- Disabling cheats or Developer Mode does not clear the current attempt's marker.
- Assisted completion skips saving at the game boundary; the progress manager also rejects explicitly assisted submissions before any storage merge/write.
- Existing coins, completion flags and unlocks are never erased by a test completion.
- There are no shop/achievement/time-record awards connected to these tools.
- Restarting with active cheats creates another assisted attempt.
- With cheats off, a normal restart starts an eligible attempt on a legitimately unlocked level. Hitboxes alone do not change eligibility.
- A developer-loaded **locked** level remains assisted across restarts even with cheats off; return to the normal map and play a legitimately unlocked level to resume eligible progression.
- Refresh/account changes clear the in-memory tool settings. A restored test URL without a fresh authorized developer load returns to the map; it cannot bypass normal locks.

No fake achievements or developer settings are written to localStorage or Supabase. This is protection against accidental development saves, not anti-cheat security against someone editing JavaScript. If production administrator tools or trusted progress validation are added later, enforce authorization and eligibility on a backend; this panel is not that system.

## Clear collected coins for testing

In **Admin Tools → Reset collectible coins**, choose **Clear Current Level Coins** or **Clear All Level Coins**, then **Yes, Clear Coins**. Opening the confirmation does nothing; Cancel or leaving the panel cancels it. The warning states the scope and that the reset cannot be undone.

This intentionally clears **saved special collectible coins for the current account on this browser**, plus the current attempt's temporary pickups. It leaves completed-level flags and unlocks intact. Other accounts, shop currency, audio preferences and Supabase are untouched. Cleared coins immediately become collectible again and map indicators update. With unavailable browser storage/guest play, the reset is session-only and the status explains this.

The account and attempt are verified again at confirmation. Account changes, level changes, cancellation or closing the panel while verification is pending prevent the reset. A per-level reset revision stops a stale tab from restoring its old banked coins during the next completion; new legitimate post-reset pickups can still save normally.

The current attempt becomes a test run, so collecting the cleared coins and reaching the flag in that attempt does not silently bank them again. To earn them normally, turn cheats off and restart a legitimately unlocked level. The reset does not lock the map or require you to replay earlier completed levels.

This explicit destructive reset is the exception to the rule that developer actions leave saved achievements unchanged; ordinary test completions still never award progress.

## Production default

`game/dev/buildConfig.js` is committed with `developmentBuild = false`. Normal static hosting, VS Code Live Server, `python -m http.server`, or the new server **without** `--dev-tools` keeps the tools off. The game does not load the developer implementation modules or mount their menu sections in that configuration. LocalStorage, query parameters and account settings cannot enable them.

The explicitly opted-in local server supplies a no-cache configuration response in memory; it never rewrites the tracked config. Stop it and return to normal serving when finished. Do not deploy an overridden `true` configuration to production.

## Files and responsibilities

- `dev/buildConfig.js`, `scripts/serve-development.py`: off-by-default build response and explicit local-only opt-in.
- `dev/DeveloperModeManager.js`, `SafePosition.js`: memory-only controls, sticky attempt marker, flight input, bounded speed steps, safe placement and configuration-based destinations.
- `dev/DeveloperToolsPanel.js`, `installDeveloperTools.js`, `DebugRenderer.js`: conditional UI installation, existing pause navigation, live hitboxes and visible developer/test indicators.
- `game.js`, `game.css`: entry gating, controls, clock integration, camera cuts, test completion labeling and themed UI.
- `engine/stepLevel.js`, `EnemyInteractions.js`, `levels/GatePuzzle.js`: optional flight/damage controls in existing shared collision/simulation; defaults preserve normal behavior.
- `levels/LevelManager.js`, `progress/LevelProgressManager.js`: attempt reset, a persistence-boundary guard, and confirmed coin-only reset with stale-tab reset revisions.
- `engine/GamePauseManager.js`, `ui/PauseMenu.js`, `ui/WorldMap.js`: registered subpanels and separate developer navigation without changing normal unlock rules.
- `tests/developer*.test.mjs`, `tests/helpers/pauseGameHarness.cjs`: access, movement, safety, timers, save protection, confirmed coin-reset behavior and actual module/DOM/auth boundary wiring.

## Automated verification and manual approval

Executed: `npm test` passed all 148 tests; `npm run validate:levels` passed the Levels 1–4 route/layout checks. Re-run both commands from the repository root after further edits. The automated tests cover development/production module loading, no storage activation, the local server's real HTTP flag responses, shared movement at 30/60/120 FPS, safe teleport/flight exit, invincibility/stomping, speed timer consistency, hitbox coordinates/no mutation, pause hierarchy, sticky eligibility and no-save completion, locked-level navigation, normal saves after clean restart, and account isolation. Existing full all-coin and zero-coin routes remain tested for Levels 1–4.

The entry tests use real game modules with a lightweight DOM/auth/audio boundary. They are not browser playtests. Manually check keyboard focus/scrolling on a narrow window, all fly directions/Shift, safe flight exit near walls/pits, moving hitboxes, slow/fast hazard timing, teleport camera cuts, and the visible TEST RUN labels. Finish an assisted run and confirm old map progress is unchanged, then restart clean and verify a normal completion still saves. Gameplay feel and the panel's appearance need your approval.
