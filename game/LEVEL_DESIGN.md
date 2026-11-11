# Authored level design and validation

Implemented for testing on `game-prototype`. Victoria's approval of gameplay,
appearance and difficulty is still required. No Levels 3–10 were created.

## What changed

Both levels now follow six named sections: introduction, exploration, challenge,
combined challenge, final collectible challenge, and finish. Sections explain
their purpose, difficulty, required terrain and optional routes. This is authored
data, not procedural generation. `defineLevel` flattens it into the same arrays
that `LevelManager`, the renderer and progress system already consume.

| Level | Before | Now | Main design changes |
| --- | --- | --- | --- |
| 1 · The First Adventure | 22,000px, 87 platforms, 12 enemies | 16,000px, 44 platforms, 9 enemies | Remove repeated staircase padding; introduce isolated enemies; give mushrooms visible bypasses; separate thorn encounters from recovery landings; finish without a surprise enemy. |
| 2 · The Winding Grove | 18,000px, 81 platforms, 12 enemies | 18,000px, 67 platforms, 12 enemies | Keep ground islands, shorten repeated climbs, vary bypass shapes, add raised takeoffs near wide gaps, make the canopy guard and collapsing coin takeoff deliberate optional challenges. |

Low static ledges have enough clearance for the 64px player to walk underneath.
High ledges stop at y=260, leaving the player's head below the HUD even at the
highest normal jump. The ferry is at x=7560–7770, y=335, after the Mushroom Bend dock; the lift travels y=375–260. The first
collapse board is y=365 over safe ground; the final one remains y=300 over the
last optional coin approach. Both retain their one-second warning and normal resets.

All six collectible IDs are unchanged. Position changes do not remove earned
credit, create duplicate achievements, or alter shop currency. Coin saving still
requires completing the level under the verified account.

| Coin | Level 1 | Level 2 |
| --- | --- | --- |
| Easy | x=540, y=434 · main path before the first gap | x=520, y=434 · opening ground |
| Medium | x=4500, y=230 · optional meadow perch | x=5540, y=230 · canopy beyond the mushroom patrol |
| Hard | x=13285, y=230 · optional raised takeoff over a gap | x=15910, y=190 · optional collapsing takeoff |

## Files and responsibilities

- `levels/Level1.js`, `Level2.js`: sections and intentional geometry, encounters and coins.
- `levels/design/defineLevel.js`: small shape helpers and compatibility compiler.
- `engine/Movement.js`: unchanged movement constants and viewport dimensions shared with checks.
- `engine/stepLevel.js`: extracted existing gameplay tick, shared by the game and input proofs.
- `levels/design/validateLevel.js`: structural checks and actual discrete jump measurements.
- `levels/design/platformReachability.js`: local jump graph using existing gravity and landing collision.
- `levels/design/simulateRoute.js`: continuous spawn-to-flag simulation with real runtime objects.
- `scripts/validate-levels.mjs`: read-only CLI report with errors, warnings and manual checks.
- `tests/fixtures/level1-routes.json`, `level2-routes.json`: reproducible keyboard input traces, not in-game autoplay.

Physics, enemy interactions, platform state machines, avatar loading, map navigation,
progress storage and Supabase were not replaced. The gameplay tick still updates
platforms, carries riders, moves the player, applies gravity and resolves enemies
before hazards, coins and completion. Rendering and input remain in the existing UI.

## Authoring a section

Each section has `id`, `start`, `end`, `title`, `hint`, `difficulty`, `purpose`,
`requiredRoute`, `optionalRoutes`, `platforms`, and optional `enemies`, `hazards`
and `coins`. Objects have stable, descriptive IDs. Platforms have a gameplay
`role`; enemies explain their encounter `purpose`. `requiredRoute` describes the
main route's surfaces, not a rule forcing a player to touch every ground island
when taking an upper alternative. Optional routes can name the coin they reward.

Use `ground`, `ledge`, `creature` and `thorns` helpers to avoid repeating shape
boilerplate. Add moving/collapsing settings to a ledge just as before. The authoring
helper defaults slime stompability, but individual configurations may override it;
the shared collision system continues to depend on the configured behavior.
Enemy patrols remain on static terrain. Set `finishId` to an existing finish ledge.
Keep saved coin IDs independent of object positions or section ordering.

## Automated checks

From the repository root:

```sh
npm test
npm run validate:levels
```

Structural errors include broken section coverage/references, duplicate IDs,
missing coins, unsupported or embedded patrols, unsafe spawns, overlapping terrain,
invalid moving paths, coins embedded in terrain/enemy spawns, and HUD/headroom
conflicts. Very wide ground jumps are review warnings, even if an elevated route
or a continuous input proof makes them physically possible.

The local graph checks every authored platform at 30/60/120 FPS using the existing
physics and landing collisions. It excludes enemies and freezes moving platforms
at sampled endpoints: it is a geometric check, not proof of a complete timed route.

The separate continuous input traces start at the real spawn, keep live enemy,
stomp, moving/collapsing platform and thorn state, collect all three coins, then
reach the finish without dying at each frame rate. No teleports, invulnerability,
enemy removal or save writes are involved. Optimized traces take about 56.5 seconds
in Level 1 and 63.8–64.4 seconds in Level 2; these are not human playtime estimates.
Separate main-route traces finish with zero coin pickups at all three frame rates.
The existing platform suite separately checks boarding/riding/exiting the ferry
and lift from three different starting phases, plus collapse warnings, escape, disappearance and reset behavior.

Tests also cover malformed designs, an impossible isolated platform, no-jump
failure, read-only validation, death/reset, saved coin identity and existing
account/progress, map, stomp and platform behavior.

These checks do not prove every possible enemy or moving-platform timing is fair.
They do not replace a browser playtest or automatically generate level layouts.
When changing terrain, update the recorded route inputs and rerun both commands;
do not weaken collision rules or remove failed assertions to fit a new layout.

## Playtest in VS Code

1. Pull `game-prototype`, start your usual local server from the repository root,
   and open `/game/` on the same origin used for your saved progress.
2. Play Level 1's main path, then replay for the optional meadow perch and final
   coin jump. Check readability, safe recoveries and the shorter course's pacing.
3. In Level 2, ride the Mushroom Bend ferry near x=7560 and the lift near x=2890. Try boarding at
   different phases, waiting through reversals, walking off and jumping away.
4. Trigger the first cracking board near x=4030 and let it drop onto safe ground.
   Then try the optional collapsing takeoff near x=15750 for Coin 3.
5. Check the canopy mushroom, the wide gap takeoffs, and all coin landings.
   Wide ground gaps still need your feedback about comfortable reaction time.
6. Die, press R, replay a completed level, refresh, and return to the map. Check
   enemy/platform resets, completion popups, unlocks, saved coin slots and avatar.

The map remains enabled. Existing completion/Next buttons retain their behavior;
no level advances automatically. No master merge or database change is part of this work.

Future design intentions remain grassland → forest → deep forest → cave → desert
→ ruins → ice → mountains → volcano → castle. They are guidance only, and adding
a future level still requires authored data, route proofs and a human playtest.

