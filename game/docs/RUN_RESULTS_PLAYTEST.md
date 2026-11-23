# Completion results and personal-best times

The existing completion popup now shows a compact run card in all ten levels, including Level 10's final ending:

- Active completion time, formatted as minutes:seconds.hundredths.
- Deaths during the measured run.
- New coins carried to the finish flag. Lost coins from earlier deaths and previously banked faded coins do not inflate this figure. Existing saved coin totals/icons remain below it.
- The account's best time for this level, with a message when a strictly faster time is recorded. Any coin total qualifies; this is not a separate all-coin speed category.

## Rules

Time advances through the shared active game loop. Death animations and automatic respawns, including checkpoint retries, remain part of the same measured run. Pauses, settings, inactive canvas focus, unfocused windows, hidden tabs, completion dialogs and asynchronous save verification do not advance it.

Manual R, Replay Level, leaving for the map, changing levels or changing accounts start fresh statistics. A manual restart also follows the original full-level reset path, so it cannot turn a checkpoint start into a short legitimate record. Death discards pending coins exactly as before; it does not erase the measured run's time or death count.

Best times save only at the existing verified, unassisted completion boundary, alongside account-specific browser achievements. Guest or blocked-storage bests are session-only and labeled **Session best**. Assisted runs still display their timing/deaths but do not replace any best time or save achievements. Assistance remains sticky through automatic retries, even in levels without checkpoints.

Old version-1 saves remain valid. Completed levels without a recorded time display an em dash until a new timed completion. The optional `bestTimeMs` field stores a positive integer millisecond value on completed level records. No Supabase or database change is involved. Coin reset revisions and time records merge independently; clearing coins does not clear best times. Slower/equal completions do not replace a record, and available faster records from another tab are retained before saving.

## Files

- `progress/RunStats.js`: transient time, death count, assistance and immutable completion snapshot; shared time-value validation.
- `progress/LevelProgressManager.js`: optional best-time field, sanitization and faster-only save/merge behavior. Existing progress API shapes and coin IDs are preserved.
- `ui/RunResults.js`: formatting and reusable result-card text, including permanent versus session records.
- `game.js`: shared clock, death/retry/reset and verified completion integration. The focus gate freezes the whole simulation together with the timer.
- `index.html` and `game.css`: cream/green result card, scrollable completion dialog and initial focus at the results heading on shorter screens.
- `tests/run-results.test.mjs`, `tests/results-integration.test.mjs`, and the existing entry-point harness: deterministic timing, persistence and actual UI wiring.

No level layouts, movement constants, enemies, collectible placements, avatar artwork or Supabase code were changed.

## Manual checks in VS Code

1. Start `python game/scripts/serve-development.py`, open `http://127.0.0.1:8000/`, sign in and enter Adventure. Use an ordinary run with developer assistance off to test a saved best.
2. Finish any level. Check the Time, Deaths, New coins at flag, Personal best and new-record message. Saved coin indicators, Replay, World Map and Next Level must retain their behavior.
3. Replay and finish faster, then slower. Only the faster run should update the best or show a new-record message. Refresh and finish again to check persistence.
4. Die once or more before finishing. Deaths and time should carry through automatic respawns. A checkpoint death should retain its checkpoint and run totals, while newly collected coins still reset. Press R or choose Replay to confirm a full fresh run and zero deaths/time.
5. Pause, visit Settings, switch tabs and switch away from the browser window. Resume: no paused/background time or movement should be added. Changing canvas focus should also suspend the run.
6. Start collecting coins, die and later finish. Only newly collected coins carried through that final successful attempt should appear in the run's coin figure; previously banked coins remain credited separately.
7. Switch accounts: the other account must not inherit a best time. Guest or unavailable-storage play should say Session best and make no promise of cross-refresh persistence.
8. With `--dev-tools`, use flight, speed, invincibility or teleportation, then disable it and finish. Check **TEST RUN — PROGRESS NOT SAVED** and confirm the best is unchanged, including after an automatic death recovery. Restart normally from the beginning with assistance off for an eligible run.
9. In Level 10, confirm the Warden is still required, the run card remains present alongside adventure totals/credits, and there is no Level 11 navigation. On a shorter screen, the popup should open at the heading and scroll to its actions.

## Validation and remaining approval

- `npm test -- --test-concurrency=4`: **307 passing tests**.
- `npm run validate:levels`: passes all ten levels and recorded all/zero-coin/optional routes at 30/60/120 FPS.
- The dedicated entry-point test uses a small DOM/auth boundary, ordinary frame/key events, and explicit finish/checkpoint boundary setups. It checks pauses/focus, duplicate death notifications, automatic retries, manual reset, replay, account/guest separation, unverified and assisted finishes, and a save verification arriving after a restart. These setups are not claims of browser playtesting or whole-course human runs.
- Existing full-course route fixtures and regressions remain intact. New unit checks cover old saves, malformed times, faster/equal/slower completions, stale-tab merges, independent coin resets and display formatting.
- Chromium cannot launch here because its required socket operation is blocked. The results card still needs the player's browser visual/play approval. Nothing is pushed or merged as part of implementation.
