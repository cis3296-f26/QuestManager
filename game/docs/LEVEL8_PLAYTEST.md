# Level 8: Mountain Cliffs — The Skyward Ascent

Status: implemented for player review; **not approved or finalized**. Work stays on `game-prototype`. No Supabase changes and no Levels 9–10 gameplay.

## Course plan and design review

The current physics remain 280 px/s movement, 650 jump impulse, 1800 px/s² gravity and a 32×64 collision body. Measured jumps rise 106.7 / 112.0 / 114.7 px at 30 / 60 / 120 FPS and travel about 200 px at equal height. The 960×540 viewport and horizontal camera are unchanged. All high landing surfaces are at y ≥ 285, leaving the player's normal jump above the HUD's lower boundary.

Levels 5–7 already provide useful shared systems: authored terrain, patrols, moving/collapsing platforms, warning-based falling hazards, optional-route discovery, coin persistence and per-biome music. The main design risk is another long sequence of similarly spaced banks. This course instead groups its 66 surfaces around 19 encounters: linked stone terraces, an uninterrupted timber walkway, sheltered climbing courts, genuine cargo lifts, suspended ravine crossings, rockfall observation banks and upper/lower reconnections. The first 4,500 px still use familiar jumps while changing from snow into alpine rock. Larger climbs deliberately exceed the normal jump envelope and use five anchored climbables.

Exact length: **24,000 world pixels**.

| Area | World range | Gameplay purpose |
| --- | --- | --- |
| Alpine Foothills | 0–4,500 | Safe arrival, stone terraces, small ravines, optional cliff shelter, first goat |
| Cliffside Trails | 4,500–9,500 | Connected rope bridge, sheltered first ladder, ravine ferry, visible aerial patrol |
| The Great Ascent | 9,500–14,500 | Wall rope, cargo lift, optional old gallery, baitable rockfall and recovery |
| Stormwatch Ridge | 14,500–20,000 | Rockfall observation, cracked suspension, optional perch route, lower bypass |
| The Mountain Summit | 20,000–24,000 | Final lift and climbing line, memorable ferry crossing, safe flag and distant volcano |

[Complete exact-geometry layout diagram](level8-layout.svg). Horizontal scales differ by area; gaps and surface heights are authored, not randomly generated.

| Encounter | Range | Intended experience |
| --- | --- | --- |
| Leaving the Snowline | 0–1,130 | Snow patches and a pine give way to exposed stone terraces |
| The First Rocky Ravine | 1,130–2,340 | Two broad landing shelves vary elevation without a repeated staircase |
| A Shelter off the Trail | 2,340–3,450 | A backward-pointing marker and a side opening reveal a solid stone shelter |
| The Alpine Watcher | 3,450–4,500 | Read a single goat patrol from the clear western approach |
| The Suspended Walkway | 4,500–5,880 | A stable 250px timber bridge joins two real cliff banks |
| The Sheltered Ladder | 5,880–7,350 | Learn E / climbing in a safe lower court, then dismount to the high trail |
| The Far Ravine | 7,350–8,420 | A ferry bridges a 520px open span; no redundant stepping stone |
| An Eagle's Shadow | 8,420–9,500 | Time the visible eagle or stay low and continue between rock shelves |
| The Mountain Wall | 9,500–10,800 | A mounted rope lifts the route from y460 to y290 |
| The Cargo Shelf | 10,800–11,760 | Board a stone lift to reach a higher gallery, then descend to recovery terrain |
| The Forgotten Route | 11,760–12,900 | Choose the lower trail or climb an old rope to Coin 2 |
| The Echoing Arch | 12,900–14,500 | Bait a shaking rock from a safe bank; a separate goat encounter follows |
| The Rockfall Lookout | 14,500–15,900 | Observe and trigger the exposed rock before crossing beneath it |
| The Broken Suspension | 15,900–17,340 | Cross two cracking bridge sections above a genuine ravine, then recover |
| Eagle's Perch | 17,340–18,600 | Optional rope → safe launch → bait rock → cracked bridge → high coin |
| The Sheltered Traverse | 18,600–20,000 | A broad patrol terrace and lower alcove break up the hardest challenges |
| The Summit Cargo Lift | 20,000–21,340 | A familiar lift reaches the exposed upper gallery |
| The Last Climbing Line | 21,340–22,800 | Rest, descend into a climbing court, then climb a final ladder |
| Above the Clouds | 22,800–24,000 | Ride the last ravine ferry; finish on an enemy-free 450px summit |

## Routes and three coins

The main route visits the first ladder, wall rope, both cargo lifts, two main collapsing planks, summit ladder and both ferries. It uses the lower trail beneath the optional gallery and the lower gully beneath Eagle's Perch. None of the three optional areas or gold coins is required to finish.

| Stable coin ID | Position (center x/y) | Intended route and reconnection |
| --- | --- | --- |
| `level-8-coin-1` | 2,590 / 300 | From the x2,340–2,860/y450 court, walk past x2,720 to the shelter’s eastern opening, jump BACK left onto the solid x2,500–2,720/y350 floor, collect, then leave through the same side opening. A solid roof and western wall make this a real pocket; the coin cannot be sniped through its floor |
| `level-8-coin-2` | 12,030 / 200 | Attach near x11,940 in the lower y450 court; climb to the y285 old gallery, jump for gold, then descend toward x12,320–12,650/y420 |
| `level-8-coin-3` | 18,240 / 200 | From the y440 perch base, climb x17,780 to y305. Bait the rock from the safe launch, cross the x17,960 cracked plank over the cleft, land on the y285 perch, jump for gold, then descend east to x18,450–18,740/y430 |

All three coins resist lower-route sniping: the shelter has a solid floor, while the other two rewards require their high routes. Full three-coin traces discover **and exit** all three optional areas in one surviving attempt. Previously saved gold remains credited/faded; new gold saves only at the finish. Test runs never save it. Achievement coins never affect shop currency.

## Reusable climbing

Climbables live in the level configuration with `kind`, center `x`, `topFeet`, `bottomFeet`, `speed`, `attachRadius`, landing connections and purpose.

| Structure | x | Feet range | Connection and purpose |
| --- | --- | --- | --- |
| Sheltered ladder | 6,970 | 460 → 300 | Lower court → first high trail; safe introduction |
| Wall rope | 9,960 | 460 → 290 | Mountain wall base → high shelf; required ascent |
| Forgotten rope | 11,940 | 450 → 285 | Optional lower court → old gallery / Coin 2 |
| Perch rope | 17,780 | 440 → 305 | Optional safe base → cracked upper crossing / Coin 3 |
| Summit ladder | 22,330 | 450 → 290 | Final climbing court → high summit trail |

- E attaches/detaches within 28 horizontal pixels, with the player's feet inside the rope's vertical range. No vertical teleport from below an endpoint.
- Alignment approaches the center at 220 px/s; it does not snap. Climbing speed is 155 px/s.
- W / Up climbs; S / Down descends. W / Up keeps ordinary jump behavior when unattached.
- Space jumps off using the existing jump physics; horizontal steering then works normally.
- Endpoints clamp travel. Solid barriers and closed gates block attachment/alignment/climbing.
- Climbing state is cleared by jump-off, detach, death, restart, safe teleport and flight. Pause freezes the whole simulation.
- The existing avatar rig supplies a simple alternating arm/leg climbing pose; customization layers retain the same transforms.
- The Settings controls reference contains the new controls. The nearby E marker is a contextual interaction clue.

## Transfers, bridges and rockfalls

| Structure | Geometry / timing | Why it exists |
| --- | --- | --- |
| Ravine ferry | x7,740/y350, width150, horizontal travel280, speed75, endpoint pause0.5s | Connects x7,350–7,660 and x8,180–8,420 across open air |
| Cargo lift | x10,880/y440, width140, rises140, speed55, pause0.5s | Connects y350 departure to y300 gallery |
| Broken suspension | x16,300 and x16,520/y390, widths120, collapse delay1.5s | Two timed transfers over the actual x16,220–16,660 ravine |
| Perch bridge | x17,960/y305, width110, collapse delay1.5s | Optional cleft crossing; no safe floor directly underneath |
| Summit lift | x20,850/y430, width140, rises130, speed55, pause0.5s | Reaches the y300 summit gallery from y400 |
| Sky ferry | x23,110/y330, width150, travel280, speed80, pause0.5s | Crosses the last ravine to the safe flag bank at x23,550 |

Three rocks reuse the existing `Stalactite` state machine and swept collision, with a gray cracked-rock appearance. Positions are x13,420, x15,170 and x17,990; warnings last 1.0, 1.0 and 0.9 seconds. Trigger entries start earlier than the impact columns so players can bait them from visible observation space. Only falling rocks hurt. Impact spends the rock until death/replay, which resets it. Pause freezes warnings and falling time. No rolling physics or new hazard engine.

Goats patrol broad static terraces near x4,070, x13,870 and x19,080. One eagle patrols the exposed air near x8,740. All are deliberately non-stompable; previous enemy stomp rules remain unchanged.

## Developer Tools

Run the explicitly enabled local development server:

```powershell
python game/scripts/serve-development.py --dev-tools
```

Open the printed local URL, sign in normally, enter the game, then Pause → Settings → Developer Mode → Enable → Admin Tools. Quick-load Level 8 for inspection. Assisted attempts are marked and cannot save permanent progress.

Authored destinations: Foothills (170/440), Cliffside Trails (4,670/420), first ladder (6,920/460), Great Ascent (9,840/460), old route (11,830/450), Stormwatch lookout (14,600/400), perch entrance (17,580/440), summit lift approach (20,500/400). Generic destinations also cover start, all three coins, each optional entrance, final challenge and finish. Safe-position selection finds a valid nearby static landing rather than embedding the character in a hazard or rock face.

Show Hitboxes outlines climb attachment zones, rockfall triggers, moving/collapsing collision surfaces, enemies and coins. Fly Mode remains independent of climbing. Disable assistance and restart for a clean attempt; merely turning tools off does not clear the attempt's assisted marker.

## Visual review

All previews are native canvas renders using the real level, terrain, enemy and interaction drawing code. They use the fallback stick avatar, not an authenticated customized avatar. They are **not browser screenshots or proof of human gameplay**.

[Foothills](level8-foothills.png) · [Cliff shelter / Coin 1](level8-shelter.png) · [Timber walkway](level8-trails.png) · [First ladder](level8-ladder.png) · [Wall rope](level8-ascent.png) · [Cargo lift](level8-lift.png) · [Old gallery / Coin 2](level8-coin2.png) · [Rockfall warning](level8-stormwatch.png) · [Cracking bridge](level8-bridge.png) · [Perch / Coin 3](level8-coin3.png) · [Summit lift](level8-summit.png) · [Finish / distant volcano](level8-finish.png) · [Eagle](level8-wildlife.png) · [Goat](level8-goat.png).

The mountain background uses separate region silhouettes, two parallax layers and pale cloud banks. Snow is confined to the arrival; alpine pines thin out before the exposed high regions. Solid-looking walkable edges are darker and outlined; decorative walls, frames and arches are lower-contrast background shapes. New foreground pines are spaced well apart. Bridges visually join actual cliff endpoints. Cracking bridge planks show fractures before activation and stronger warning cracks/shake after landing. The summit volcano is scenery only.

## Music

Original track: **The Skyward Trail**, 24 bars in 4/4 at 108 BPM, approximately 53.33 seconds per loop. Warm reed melody, harp replies, sustained harmonies, bass and a soft marching drum distinguish it from Frozen Peaks. The existing audio manager handles mute, volume, pause/resume, map transitions and single-track playback. It appears in the existing listening room. Listening enjoyment and balance still need the player's approval.

## Automated validation and limitations

Run from the repository root:

```powershell
npm test
npm run validate:levels
```

The tests include the entire previous suite, exact configuration/score hashes for Levels 1–7 and all eight earlier tracks, new climbing cases, full all/zero-coin routes, optional reconnections, no lower-route coin sniping, varied moving-platform arrival phases, collapse/reset, rockfall baiting, non-stompable wildlife, completion-only saving, account isolation, map unlocking, paused climbing, existing audio and Developer Tools.

Full input fixtures start at spawn and use ordinary direction, jump, E interaction and held climb inputs. No flight, teleportation, invincibility, enemy removal or save patch proves the routes. Local optional witnesses are explicitly separate entrance-to-exit checks. The jump graph now supplements real jumps with simulated attachment/climb/dismount edges; a declared connection alone never grants reachability.

Final checks: **259/259 automated tests passed**; `npm run validate:levels` passed structural, jump/climb graph, full all/zero-coin and optional-route checks across all eight levels at 30/60/120 FPS.

Optimized full traces take about **91.0–91.4 seconds**, including all three coins or none, at 30/60/120 FPS. That establishes reachability, **not the requested 5–8 minute first human playthrough**. Human exploration, timing, mistakes and difficulty must determine actual first-play duration. No artificial slowdown or filler was added to force that estimate. Actual browser frame rate, subjective pacing, perceived fairness, authenticated avatar appearance and listening quality remain unverified here. Chromium launch is blocked by the environment (`socket() failed: Operation not permitted`).

## Manual acceptance checklist

1. Use your normal local server and sign in. Complete Level 7 on a clean run (or use an account that already has), open the World Map, select Level 8 and verify the name and three coin indicators. Developer quick-load is available for inspection, but never validates normal progression or saves.
2. Start a **clean normal attempt**, click the game, and follow the stone terraces. Check the snow-to-rock transition, predictable goat and first shelter detour.
3. In the sheltered ladder court, press E close to the ladder. Test W/Up, S/Down, idle holding, E detach and Space jump-off. W/Up should still jump normally when unattached.
4. Cross the ferry at different arrival times. Ride it without movement input through a reversal; jump to the far bank. Repeat this check for a lift.
5. Climb the Great Ascent rope, take the cargo lift and explore the forgotten gallery for Coin 2. Confirm the optional route returns to the main trail.
6. Bait a rock from its observation bank, watch the warning and floor marker, wait for impact, then cross. Check pause during warning and climbing.
7. Try the broken bridge: stand long enough to see it fall, then restart and cross before collapse. All platforms and hazards should reset.
8. Choose Eagle's Perch for Coin 3, then return east. On another run, use the lower gully and finish with no optional coins.
9. Test goat/eagle contact: both are lethal, including head contact. Existing slimes in earlier levels must remain stompable.
10. Finish. Verify saved coin union, Replay, World Map and unavailable Level 9. Die or abandon a run with a new coin and confirm it was discarded while previously saved coins remain.
11. Check music volume/mute/pause/map transitions and your customized character's climb pose. Compare all five landscapes and the final volcano view.
12. Report unclear landings, excessive waiting, unwanted decoration overlap, frustrating dismounts, actual play time and difficulty before approving the level.

## Files

New core files: `levels/Level8.js`, `levels/Level8Scenery.js`, `engine/Climbing.js`, `rendering/MountainRenderer.js`.

Shared integration changes: `game.js`, `index.html`, `engine/Physics.js`, `engine/stepLevel.js`, `entities/Player.js`, `entities/PlayerAnimation.js`, `levels/levels.js`, `levels/design/defineLevel.js`, `levels/design/validateLevel.js`, `levels/design/platformReachability.js`, `levels/design/simulateRoute.js`, `levels/design/simulateExploration.js`, `rendering/PlatformRenderer.js`, `rendering/CaveMechanicsRenderer.js`, `rendering/EnemyRenderer.js`, `audio/MusicScores.js`, `dev/DeveloperModeManager.js`, `dev/DebugRenderer.js`.

New tests/fixtures: `tests/climbing.test.mjs`, `tests/level8.test.mjs`, `tests/fixtures/pre-mountain-baseline.json`, `tests/fixtures/level8-routes.json`, `tests/fixtures/level8-main-routes.json`. Existing exploration fixtures gain only Level 8 witnesses. Registry/count and unavailable-next-level expectations in existing tests expand to eight playable levels and nine music tracks; prior gameplay expectations remain active. `tests/helpers/pauseGameHarness.cjs` exercises the actual entry point's Level 8 keys, pause, navigation and completion boundaries with mocked DOM/auth.

Documentation: this guide, `level8-layout.svg` and fourteen renderer previews. No pre-existing level configuration, earlier music arrangement, account schema or shop file changes.
