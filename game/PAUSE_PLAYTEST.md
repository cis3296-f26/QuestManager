# Pause menu and game settings

Implemented on `game-prototype`; personal gameplay approval is still pending.
No level layout, Supabase, shop currency or achievement schema was changed.

## Test from VS Code

```sh
git switch game-prototype
git pull --ff-only origin game-prototype
npm test
npm run validate:levels
py -m http.server 8000
```

Use `python -m http.server 8000` if that is your Python command. Open
http://127.0.0.1:8000/game/ and refresh fully so the new HTML, JS and CSS load.
Keep the same browser/origin you used for saved progress.

1. Start either level, click the game, move/jump, then press Esc. The player,
   creatures, camera, coins, moving platforms, warning/collapse timers, exploration
   notices and animations should freeze. Try holding movement when pausing; it
   should not stick after resuming. Resume or Esc returns focus to the canvas.
2. Pause while standing on a moving platform and during a collapsing board's
   warning. Wait several seconds, then resume. You should continue at the same
   position and warning deadline, with no extra movement from the paused time.
3. Collect a new coin and pause. Try Restart Level → Cancel, then confirm Restart.
   Cancel preserves the attempt; confirmation resets the current level and all
   temporary coins/platform/enemy/discovery state. Previously saved coins remain.
4. Repeat World Map → Cancel, then Return to Map. The confirmed exit uses the
   existing map and discards only the unfinished attempt. The header World Map
   button now uses the same confirmation while gameplay is active.
5. Open Settings. Change volumes with the slider or its arrow keys, toggle Mute
   All, Show Controls and Reduce Motion, then return to the game. Refresh and
   check the same account's preferences. A different account gets its own values.
6. Test keyboard focus: Tab/Shift+Tab should stay inside the native modal;
   Enter/Space activate the focused button. R/movement keys must not operate the
   game from a menu. Cancel receives focus first on destructive confirmations.
7. Check a narrow browser window: the menu should fit and its settings should
   scroll within the panel. Esc from Settings or a confirmation returns to the
   main pause menu; another Esc resumes.
8. Try Esc on the map, during death and in the completion popup. It must not open
   the pause menu. The completion dialog retains its existing native Escape behavior.
   When typing in an unrelated input, game shortcuts should not be intercepted.

| Menu state | Esc | Attempt state |
| --- | --- | --- |
| Active canvas | Open pause menu | Freeze, preserve unsaved coins |
| Main pause menu | Resume | Preserve |
| Settings | Back to main pause menu | Stay frozen |
| Restart/map confirmation | Cancel to main pause menu | Preserve |
| Restart confirmed | Close menus, restart same level | Discard temporary state; keep saved achievements |
| Map return confirmed | Close menus, use existing map | Discard temporary state; keep saved achievements |

R still immediately restarts during ordinary canvas play, as before. It is blocked
inside menus and during death. Leaving/reloading the page still discards the
unfinished attempt; pausing is not an attempt-save system.

## Preferences and audio

Defaults are master 80%, music 60%, effects 80%, unmuted, Show Controls on and
Reduce Motion off. Only known values are loaded, volume numbers are bounded to
0–100, and corrupt/incompatible records fall back safely. Guest preferences and
each account have distinct browser keys, separate from collectible achievements.
If storage cannot be accessed/written, settings work in isolated session memory
and the panel explains that they will not survive refresh.

No music or effects currently exist in the game. The panel says so explicitly;
this task does not add audio assets/playback. `AudioPreferences` provides a future
media adapter: effective gain is master × channel gain, or zero while muted.
Connecting a media element applies its volume/muted values without starting playback.

Reduce Motion removes character bob/tilt/squash, coin spinning and pickup travel/
expansion, and collapsing-board warning shake. It preserves limb poses, moving
platform travel, warning cracks, fade feedback, collision geometry and movement.
Small coin bobbing remains aligned with the existing collection hit position.

## Implementation

- `engine/GamePauseManager.js`: one pause/menu state and a frame clock that rejects
  paused/inactive wall time. The first active frame after a gap advances no simulation.
- `ui/PauseMenu.js`: one native dialog with main/settings/confirmation panels, initial
  focus, Escape/back behavior and action callbacks. Native dialog modality supplies
  background inertness and Tab trapping; overlays never stack.
- `settings/GameSettings.js`: whitelisted settings and replaceable browser persistence.
- `settings/AudioPreferences.js`: future channel gain/mute adapter; no playback.
- `game.js`: gates the existing update and animation tick together, clears held keys,
  resets the clock across lifecycle changes and reuses restart/map/account flows.
- `index.html`, `game.css`: accessible controls, responsive cream/green/brown menu.
- `WorldMap.js`: optional navigation-request hook; other map callers keep their behavior.
- Existing avatar/coin/platform renderers: opt-in cosmetic Reduce Motion parameters.

No pause flags were scattered into individual physics/enemy/platform systems. All
their elapsed-time state remains frozen because the shared gameplay tick is not
called while the central pause gate is closed. Drawing the level continues from
that frozen state beneath the modal backdrop.

## Verification and limits

Automated tests cover pause/menu transitions, duplicate opens, first-frame timing,
frozen runtime snapshots at 30/60/120 FPS, confirmation callbacks and cancellation,
focus restoration, slider/toggle persistence and account isolation, unavailable/
corrupt storage, audio gain/mute and render-only reduced motion. An integration
test loads the actual game entry point with mocked DOM/auth/avatar boundaries to
verify both levels, keyboard guards, real reset/navigation paths, death/completion
restrictions and account changes while paused.

The full existing route, coin, account, map, enemy, stomp, secret and platform
regression suite remains in place, along with `npm run validate:levels`.

A local Chromium launch was blocked by this environment, so the integration checks
are not browser gameplay tests. Native Tab/Enter/Space interactions, panel appearance
on narrow screens, timing comfort and gameplay feel still require your browser test.
