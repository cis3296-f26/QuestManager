# Local leaderboard review

Implemented on `game-prototype`, based on the live branch at `2f799335f60b6a70924fb9c39d2d1308a7a367e8`. Published to `game-prototype` after explicit approval. No merge or Supabase change.

## Interface and records

The World Map's **Leaderboard** link opens `game/index.html#leaderboard` through the existing WorldMap hash router. Three keyboard-accessible tabs show the current player's actual records. Arrow keys/Home/End switch tabs, focus is visible, and the full-game breakdown scrolls. Map navigation describes all ten implemented levels.

| Tab | Current local behavior | Future ranking rule |
| --- | --- | --- |
| Adventure Rankings | Current player's completed levels, permanent coins and number of recorded bests; no invented rank/podium. | Completed levels first, permanent coins second. Only comparable complete ten-level times can break timing ties. |
| Level Times | All ten actual configuration names in the selector, selected-level best, useful missing/legacy-time states, and an unlock-aware play/replay button. | Fastest eligible best for that level first. |
| Full Game | Combined Best Times, qualified total only with ten valid times and completions, ten-level breakdown, missing-time explanation. | Qualified sums ascending. Not a continuous speedrun. |

All tabs explicitly explain that global rankings are unavailable. There are no fake users, numbered local ranks or empty tables pretending to be successful global queries. Gold highlights identify **My records**, not a first-place podium. Silver/bronze podiums and top-100 global tables await actual verified records.

`personalRecords()` is a read-only projection over `getLevel()`, `getBestTime()` and `totalCoins`. `formatRunTime()` supplies the existing M:SS.hh format. No new timer, local save schema, migration, direct internal-record mutation, progress reset, coin write, death-count estimate or Supabase call for scores is added. The existing completion path still determines saved best eligibility, including assistance restrictions. Local records are useful personal feedback and are not trusted global verification.

Identity loads only the current signed-in player's existing `loadPlayer()` data. `AvatarRenderer` and `Player` render their existing equipped/customized character in an idle portrait; there is no new avatar editor. Unsafe/unavailable names use Adventurer, with a neutral portrait on failure. Usernames use textContent; no email/auth-ID fallback is displayed. Async revision checks clear identity immediately on signout/account switch and discard stale responses. Profile/storage errors preserve access to available records. Signed-out guests and blocked storage are explicitly labeled as session-only. No other account's localStorage is enumerated.

The existing auth observer remains the account source. Map → leaderboard → map does not run the gameplay reset path. Leaving gameplay via browser history follows the existing map-abandon path once; returning to a level intentionally starts a fresh attempt as before. Selection is preserved. No changes to physics, level layouts, avatar assets, audio logic, timer or achievement storage.

## Files

Added:
- `game/leaderboard/records.js`: record projection, safe names and isolated future ranking comparators.
- `game/leaderboard/identity.js`: current-profile and existing-avatar adapter.
- `game/ui/Leaderboard.js`: tabs, selected-level records, scope/error states and replay controls.
- `game/tests/leaderboard.test.mjs`: progression, valid/invalid/legacy times, all-ten eligibility, sorting, account/session isolation, stale responses, UI and keyboard checks.
- `game/docs/LEADERBOARD_BACKEND_DESIGN.md`: proposed storage, privacy, RLS, authoritative validation, remaining permissions and limitations.
- This review and `game/docs/leaderboard-previews/{adventure,level,full}.png`.

Modified:
- `game/index.html`: World Map link, leaderboard section and accurate ten-level descriptions.
- `game/game.css`: scoped responsive cream/forest/brown/gold styles.
- `game/game.js`: instantiate the view and refresh identity on account change; existing completion/timer logic unchanged.
- `game/ui/WorldMap.js`: leaderboard route, visibility/focus and avoid map-to-record reset.
- `game/tests/map.test.mjs`: map/leaderboard/back navigation regression.
- `game/tests/helpers/pauseGameHarness.cjs`: actual game-entry leaderboard navigation and account/signout regression.
- `game/docs/README.md`: guide links.
- `README.md`: local leaderboard feature and scope.

## Verification

- `npm test -- --test-concurrency=4`: **314 tests passed**, including all existing timing, saving, account, avatar, audio and developer-mode checks.
- `npm run validate:levels`: **passed** all ten levels and existing recorded routes at 30/60/120 FPS.
- `git diff --check`: passed.
- Browser testing attempted: Chromium cannot launch because the environment denies its required socket operation. No browser/mobile visual or player playtest approval is claimed.

The attached images are **renderer design previews** with an approximate layout, derived from the actual UI controller's guest/empty state. They are not browser screenshots, have no fabricated records, and do not verify actual browser layout, canvas avatars or responsive behavior. Inspect the running interface before approving the visual polish.

## Test in VS Code

Pull the approved changes on your computer before testing:

```bash
git switch game-prototype
git pull origin game-prototype
```

From the updated repository root:

```bash
python game/scripts/serve-development.py
```

Open `http://127.0.0.1:8000/`, sign in as usual, enter Adventure, then choose Leaderboard in the World Map navigation. A direct link is `http://127.0.0.1:8000/game/#leaderboard`.

1. Adventure: check your completed levels/30 permanent coins against the map. The page should show no global rank or fictional podium.
2. Level Times: select each level; check actual level names, existing bests and missing-time messages. Check that locked levels cannot launch. Replay an unlocked level normally, finish and return to see the best update. Slower runs must preserve the old best.
3. Full Game: check the ten-row breakdown. A missing time must prevent qualification. Ten valid recorded completions should show their summed best, clearly labeled as separate runs.
4. Keyboard: Tab through Back/tabs/selector/replay. Arrow keys/Home/End operate tabs. Check focus, no overlap and readable contrast at desktop and about 375px width.
5. Navigate back to map and use browser Back/Forward. Map selection should survive; changing tabs or viewing records must not launch a level. Leaving a running level via browser navigation discards the unfinished attempt through existing rules.
6. Switch/sign out and reopen records. The old username/avatar/progress must disappear; the new account sees its own records. Test guest/blocked storage in a separate browser session without clearing your actual account's data.
7. Pause/death/restart and developer-assisted completion checks should behave exactly as before. Existing completion results still show run death totals; the leaderboard does not invent historical best-run deaths.

Global rankings, account-to-account comparisons, cross-device synchronization, public cosmetic publication and trustworthy online validation remain unimplemented. See the separate backend design; score publication must stay disabled pending approval and a reviewed authoritative protocol.
