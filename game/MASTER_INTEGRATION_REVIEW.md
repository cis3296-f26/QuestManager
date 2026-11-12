# Master integration review

Candidate source: `game-prototype` at `6c40b8bf4e470702899d8cae280bd1beee40da06`, combined with master at `cdba89b38b6fa0ac9b73a89492400c5b5eaa040b`.
Common ancestor: `2779b0fee12cc339dd70e1d2a93e921a05b9983c`.

## Result and scope

Master has eight commits absent from the game branch. Its eight changed files have no competing game-branch edits: each branch version is byte-identical to the common ancestor. The candidate therefore takes those eight files directly from master, preserving all game changes. No manual conflict resolution or new database logic is needed.

Upstream files: `index.html`, `main/script.js`, `main/quests/questObject.js`, `main/users/playerData.js`, `main/customize/customizePage.js`, `style/home.css`, `style/journal.css`, and `style/customize.css`.

These bring in master's task time, type/priority, calendar rescheduling, journal dialog and styling changes. Player loading, equipment APIs and all game modules remain unchanged. No Supabase service, schema, account or real task was modified. The integration harness supplies in-memory responses only.

## Verification

- Full `npm test`: **170 passing, zero failing** (167 existing plus three shared-module integration checks).
- `npm run validate:levels`: all four implemented levels pass layout and recorded main/collectible/exploration routes at 30/60/120 FPS.
- `node --check`: all 79 application/game JavaScript modules parse.
- New checks run real task/model modules with timed and legacy calls, real game avatar/equipment layering across two accounts, and shared session account switching/sign-out.
- Existing game, coin persistence, pause/audio, developer tools, reset and progression tests remain intact.
- Existing upstream whitespace warnings in the imported files were retained to preserve master verbatim; no game source was reformatted.

## Pre-existing equipment fallback defect

Both the current game branch and master reference undefined `MISSING_COLUMN` and `MISSING_FUNCTION` constants in `main/users/playerData.js`. The normal equipped-column/RPC-success paths pass the integration checks. A separate in-memory error-path reproduction confirms:

- inventory response `42703` causes `ReferenceError: MISSING_COLUMN is not defined`;
- equipment RPC response `42883` causes `ReferenceError: MISSING_FUNCTION is not defined`.

This predates the integration, but prevents the intended local equipment fallback on older schemas. It is not a merge conflict. It remains unchanged under the instruction not to modify Supabase integration; decide whether to address it before final master merge.

## Local browser approval still required

Chromium launch fails in this environment. VM integration checks and route simulations are not real browser playtesting, database verification or subjective gameplay approval.

After publication is approved, pull `game-prototype` and serve the repository using your usual local server. Open the root page and `/game/` (there is currently no root navigation link to the game).

1. Sign in. Add a dated/timed quest with type and priority; verify its board/calendar entry and completion reward. Test the Journal + dialog and rescheduling.
2. Check shop inventory and customization, then open `/game/` on the same origin and verify your equipment.
3. Play the revised entrances in Levels 1–4; test movement, enemies/stomps, gaps, lifts/ferries/cracked platforms and finish/replay.
4. Collect a new coin, die, and confirm it is discarded. Complete a run and confirm credit survives refresh. Check map unlocking.
5. Test pause/settings/audio and developer-mode save protection.
6. Sign out and switch accounts; verify equipment, currency and collectible progress remain separate.

Do not merge the game into master until these browser checks and gameplay approval are complete. This review prepares master-to-game integration only.
