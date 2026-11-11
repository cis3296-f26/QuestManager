# Level 1 collectible coin playtest

This feature is awaiting Victoria's gameplay approval. Level 1 is **The First Adventure**.
The world map is enabled again. Level 2's prototype remains in the repository, but only
Level 1 is registered as playable. This change does not add Supabase tables or spendable shop currency.

## Start

1. Sign in on the normal QuestManager homepage and equip your character as usual.
2. Open `/game/` on the **same origin** (for example, `http://127.0.0.1:8000/game/`).
3. Select Level 1 on the map to open its progress popup, then choose Play Level.
   Three coin icons appear at the top right of the tan section bar inside the game.
   Saves belong to your signed-in account on this browser.
   Signed-out play, unavailable authentication, or blocked storage uses session-only progress;
   the finish dialog explicitly identifies that mode.

Each coin icon has a fixed identity: left = coin 1, middle = coin 2, right = coin 3.
Gray means not earned, dashed gold means picked up this attempt, solid gold means earned
by reaching the flag. Saved coins appear faded in the level and cannot be collected again.
The three HUD slots include both saved coins and new pickups. The finish dialog shows
the saved collection count; screen readers also receive pickup count announcements.

## Gameplay checks

- Collect a coin: it disappears, sparkles appear, and the counter and correct icon update.
- Die immediately afterward, press R, refresh, or leave before reaching the flag:
  new pickups are discarded. Previously credited coins remain.
- Collect coins 1 and 2 and finish: the dialog shows 2/3. Replay and collect coin 3,
  then die: saved progress must still be 2/3.
- Replay, collect coin 3, and finish: the dialog shows 3/3 and the perfect-collection message.
- Finish without new pickups and replay repeatedly: progress must never exceed 3/3.
- Refresh/reopen after finishing: progress returns for the same signed-in account.
- Switch accounts on the homepage (or in another tab): the game restarts the attempt,
  clears the previous avatar while loading, and shows only the new account's progress.
  Sign back into the first account to recover its own saved achievements.
- Shop purchases must not affect collectible achievements or vice versa.
- Replay and World Map work from the completion dialog. The in-game World Map button
  discards unfinished pickups. Next Level stays disabled until another level is ready.
- Map selection shows the correct three earned slots and the saved total out of 30.

### Placement hints

1. Opening main ground path before the first pit.
2. The three-step elevated route at Meadow Trail (around x=6930).
3. Follow the Home Stretch upper route, then jump from the ledge at x=19220 across
   the wide pit near x=19480. This coin cannot be reached from the ground route.

All three routes, including safe landings after collection, are simulated at 30, 60 and
120 FPS using the unchanged jump strength, gravity, movement speed, platforms and enemies.
Human testing still needs to confirm the challenge and presentation feel right.

## Automated tests

From the repository root, with Node installed:

```sh
node --test game/tests/coins.test.mjs game/tests/session.test.mjs game/tests/map.test.mjs
```

Tests cover attempt discard, saving only completed runs, unique ID unions across replays,
duplicate pickups, account isolation, guest fallback, storage failures/corruption,
completion without coins, unlock metadata, 30-coin totals, coin-route physics and auth races.

## Code responsibilities

- `entities/CollectibleCoin.js`: coin collision and canvas appearance.
- `levels/CoinManager.js`: temporary pickups, faded earned coins and collection effects.
- `levels/Level1.js`: the three authored positions and stable coin IDs.
- `progress/LevelProgressManager.js`: completed levels, earned ID unions, derived unlocks,
  full completion and total progress across ten level slots. Other levels are not built.
- `progress/LocalProgressStore.js`: versioned browser persistence adapter, keyed by account ID.
  Namespace: `questmanager:adventure:v1:<account ID>`. No shared guest save is written.
- `progress/GameSession.js`: observes the existing Supabase auth client and verifies identity
  again before a finish is saved. It makes no database writes.
- `ui/CoinProgress.js`: shared three-slot indicators.
- `ui/LevelSelection.js`: reusable selection popup contents, connected to map nodes.
- `ui/WorldMap.js`: map selection and hash navigation, reading the shared progress manager.
- `levels/levels.js`: playable level registry; unfinished levels remain unavailable.
- `game.js`, `index.html`, `game.css`: existing lifecycle hooks, HUD and completion dialog.
- `rendering/AvatarRenderer.js`: rejects outdated avatar image loads after account changes.

Keep coin IDs stable when adjusting positions. New levels can define their own three IDs
and locations and reuse these modules. Local saves are development achievements on one
browser/origin, not an authoritative reward system. Supabase persistence is a later task.

