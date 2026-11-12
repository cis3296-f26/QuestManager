# Level 2: The Winding Grove

Ready for Victoria's playtest, not final gameplay approval. The original Level 1 layout,
coins, physics, controls and scenery are preserved. All work stays on `game-prototype`.

## Open and play

1. Sign in on the normal homepage using the browser/origin where you played Level 1.
2. Open `/game/`. Finishing Level 1 unlocks Level 2; collecting all three coins is optional.
3. Click Level 2 and choose Play Level. Existing saved Level 1 completion also unlocks it.
   Alternatively, choose Next Level from Level 1's completion popup.
4. Move with A/D or arrows; jump with Space, W or up arrow. R restarts the current level.

The course is 18,000 pixels long with eight named sections, eleven ground gaps,
six thorn patches, twelve creatures and optional elevated routes. A quiet opening and
recovery clearings separate the harder sections. The existing camera and avatar animations
are reused. A low-contrast forest background and authored tree clusters distinguish the grove.

## Three special coins

- Coin 1: on the opening ground path, before the first pit.
- Coin 2: at the far end of Canopy Crossing's long upper ledge. Jump over the mushroom
  patrol to reach it; ground creatures patrol below.
- Coin 3: follow Sparrow Ledges' optional high route and jump from the narrow final ledge
  for the coin suspended over the last pit. Land in the clearing before the final climb.

IDs are `level-2-coin-1`, `level-2-coin-2`, and `level-2-coin-3`. These are independent
of Level 1's IDs and the shop balance. New pickups save only on successful completion;
death, R or returning to the map discards them. Previously credited coins stay faded.

## What to test personally

- Confirm the pace and challenge feel appropriate after Level 1. Tell us which jumps,
  patrols or stretches feel frustrating, too easy or empty.
- Check the canopy mushroom is readable and can be avoided without attacking it.
- Collect each coin and recover to a safe landing, especially after the last coin jump.
- Fall in a pit, touch a creature and touch thorns: each should trigger the same short
  death effect and restart Level 2 with all patrols reset.
- Reach the flag. Gameplay stops and the Level 2 completion popup appears; it never
  automatically loads another level. Replay and World Map work. Level 3 is not built.
- Save some Level 2 coins, return to the map, refresh and replay. Coin slots, totals
  and the saved achievements should stay correct for the signed-in account.
- Replay Level 1: its course and achievements must remain unchanged.
- Change accounts while Level 2 is open. If the new account has not finished Level 1,
  the game returns to the map and locks Level 2 for that account.

## Automated validation

```sh
node --test game/tests/*.test.mjs
```

Tests cover all local coin routes, the final climb and every ground gap at 30/60/120 FPS.
Recorded spawn-to-flag input routes at each rate collect all three coins with live enemy
timing and no deaths. They are physics regression fixtures, not in-game autoplay. Perfect
automated runs are about 64 seconds; human playtime and difficulty still need playtesting.
Existing account isolation, death/restart, persistence and map tests also remain in place.

## Changed responsibilities

- `levels/Level2.js`: authored collision geometry, coins, hazards, patrols and finish.
- `levels/Level2Scenery.js`: cosmetic foreground placements only.
- `levels/levels.js`: registers the two available levels; 3–10 remain unavailable.
- `rendering/GrasslandRenderer.js`: optional forest parallax layer; default grassland rendering is unchanged.
- `game.js`: theme selection, Next button state, and returning a newly locked account to the map.
- `ui/WorldMap.js` and `index.html`: forest summary and unlock/lock presentation.
- `tests/level2.test.mjs`, route fixtures and updated map tests: repeatable route and navigation checks.

No Supabase tables, shop logic, new movement controls, combat or later levels were added.
