> Historical design notes from an earlier pass. For the current three-level layouts and testing instructions, see [COURSE_REVIEW.md](COURSE_REVIEW.md).

# Layout review — local changes based on game-prototype 12a52c1

These changes are prepared locally and have not been committed or pushed.
The branch already contains the earlier section-based redesign. This pass keeps
its working routes and concentrates on the opening enemy encounter, a useful
ferry location, and missing main-route test coverage. Human approval is pending.

## Review findings and plan

What already works: six authored stages per level, readable mushroom bypasses,
isolated introductory enemies, three distinct coin challenges, safe flag areas,
and shared physics/platform/enemy/progress systems. All original 53 tests passed
before this pass. Six stages fit the requested approximately five sections by
splitting the main challenge into practice and combination sections.

The opening ferry duplicated a short jump and a raised staircase, introducing
extra motion before players reached the main forest challenge. The first Level 1
mushroom's patrol extended beyond both sides of its main bypass. Existing recorded
completion routes collected three coins; there was no continuous zero-coin proof.

| Element | Before this pass | Local revision | Purpose |
| --- | --- | --- | --- |
| Level 1 first mushroom | Start 2580; patrol 2450–2780; speed 75 | Start 2620; patrol 2530–2700; speed 60 | Keep the introductory patrol centered beneath the bypass, with more predictable approach/recovery space. |
| Level 2 opening | Three practice ledges plus a ferry | Two practice ledges; remove the x=660 upper ledge and relocate the ferry | Simplify the introduction without changing the initial ground gap or first slime. |
| Level 2 Mushroom Bend dock | x=7200–7380, y=365 | Extend to x=7510 | Give players a safe, enemy-free waiting point above the thorns. |
| Level 2 ferry | x=660, y=365, width 110; travel 190 | x=7560, y=335, width 140; travel 210 | Replace the static gap-assist ledge with a useful ride across the wider 7700–7880 pit. |

Ferry speed remains 70px/s, with 0.3-second endpoint pauses. The lower ground jump
remains an alternative; boarding the ferry requires waiting for its approach.
The lift and both collapsing boards retain their current positions and behavior.
There are now 67 Level 2 platforms, down from 69 in the current remote branch.

No coins needed further repositioning in this pass: the easy coins remain on the
main route, medium coins reward upper routes, and difficult coins reward optional
gap/timing challenges. All positions, unique IDs and saved-credit rules are preserved.
The finish flags, ground islands, hazards, avatar integration, account storage and
unlock logic are unchanged. No Supabase files or later levels were changed.

## Automated verification

```sh
npm test
npm run validate:levels
```

55 tests pass. Both levels have continuous spawn-to-flag input traces at 30, 60 and
120 FPS for both objectives: all three coins and zero coins. The zero-coin traces
reject any incidental pickup; they do not disable collection. Three-coin proofs
still require every coin and use real enemy/stomp/platform/hazard state. Recording
inputs offline does not generate layouts or add autoplay to the game.

The validator now checks that the player remains horizontally inside the viewport
and above the HUD boundary throughout these traces, in addition to camera bounds.
Boarding/riding/exiting both moving platforms is checked at all three rates and
three starting phases (0, 1.2 and 3.3 seconds). Existing collapse warning, last-moment
escape, falling, reset, progress, authentication and map tests continue to pass.

These are automated simulations and canvas renders, not browser gameplay tests.
They prove successful routes exist, not that every timing is comfortable. Wide
ground gaps remain explicit manual-review warnings. No claim of professional
quality or final gameplay approval is made by the automated checks.

## Manual test instructions

After these changes are pushed with your permission, pull game-prototype. Alternatively,
apply the supplied patch to a clean checkout at 12a52c1 using `git apply`.
Start your existing server from the repository root:

```sh
python -m http.server 8000
```

On Windows, use `py -m http.server 8000` if needed. Open
http://127.0.0.1:8000/game/ on the same browser/origin used for saved progress.

1. Level 1: check the welcoming introduction, then the slower mushroom beneath
   Meadow Choices. Try waiting, jumping past it and taking the upper bypass.
2. Finish without pursuing upper-route coins. Replay to collect the meadow perch
   coin and final gap coin. Confirm the flag, completion popup and saved coin slots.
3. Level 2: confirm the opening is simpler and the lift near x=2890 still works.
   Complete Level 1 first if this account has not unlocked Level 2.
4. At Mushroom Bend, cross above the mushroom and thorns to the long grassy dock.
   Wait for the ferry, jump aboard, release movement, ride through both reversals,
   then jump off toward the far bank. Try arriving at different times.
5. Try the lower gap jump too. Replay for the canopy mushroom's coin and final
   collapsing takeoff coin. There are still exactly three coins in each level.
6. Let the first collapsing board drop over safe ground, then jump away just before
   the final board disappears. Die, press R, and replay; every enemy/platform resets.
7. Check equipped appearance, movement/landing/death animations, camera, map,
   account isolation, completion-based saving and next-level unlocking.

Please judge pacing, route readability, landing space and difficulty yourself.
Neither level is finalized until you have played and approved it.
