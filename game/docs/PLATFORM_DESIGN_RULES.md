# Special platforms: purpose before movement

These rules apply to all current and future QuestManager levels. They are also in
`game/AGENTS.md`, and `validateLevel` now runs `validatePlatformPurpose`.

- **Vertical:** reach a genuinely higher destination. A lift is not a ferry for a
  lower ledge across a hole.
- **Horizontal:** cross a pit or connect separated airborne landings. The motion
  should help the player complete that connection.
- **Breaking:** stand above a pit, enemy or hazard, so the warning has consequences.
- Do not add ordinary stepping stones beside a special platform that duplicate its
  transfer. Put boarding/exit ledges on clear banks or route endpoints, keep the
  crossing open, and test whether a normal jump can replace the intended transfer.
- Every special platform declares `connection: { from, to }` with actual platform
  IDs. Each departure needs a safe approach and each destination needs landing space.

Geometry checks reject missing endpoints, lifts aimed at lower destinations,
horizontal platforms whose declared landings overlap, and breaking boards above
safe terrain without danger. These checks cannot judge fun or replace boarding and
continuous real-input route tests.

## Current placements

Level 1 has no special platforms, so it is unchanged in this pass.

| Level | Platform | Route / reason |
| --- | --- | --- |
| 2 | Intro ferry, x2890–3120, y365 | Replaces the vertical platform shown in the screenshot. The dock is now back at x2590–2790 on the near bank, with no extra ledge beside the boat. A real 460px river (x2820–3280) separates it from the x3280 landing; ordinary jumps cannot replace the ferry. |
| 2 | Canopy lift, x4910, y365–260 | Relocated from the entrance. Replaces the old x4910 static step and takes players from the x4700 branch to the higher x5120 canopy and Coin 2. |
| 2 | Canopy bough, x5620–5690, y300 | Connects the canopy edge to the farther x5900 airborne exit. Ride toward the right endpoint before jumping. The exit now reaches the gap takeoff; the redundant small step is removed. |
| 2 | Mushroom Bend ferry, x7560–7770, y335 | Existing pit crossing from its safe dock to the far bank. Kept. |
| 2 | Fern bridge, x4030–4190, y365 | Existing one-second cracked bridge over its real pit. Kept. |
| 2 | Coin 3 board, x15750–15860, y300 | Existing cracked takeoff over the gap before the lookout landing. Kept. |
| 3 | Stream ferry, x6460–6660, y335 | Existing horizontal connection across the stream gap. Kept. |
| 3 | Tree lift, x7600, y365–260 | Existing lift reaches the higher branch spanning the root ravine. Kept. |
| 3 | Heart bridge, x9750–9900, y365 | Existing cracked bridge spans the ravine to the x10000 landing. Kept. |
| 3 | Nest bough, x11030–11110, y260 | Existing horizontal transfer connects the higher coin route to the separate nest board. Kept. |
| 3 | Nest board, x11300–11440, y300 | Added a real pit directly underneath; ground resumes at x11440. Its 1.1-second warning now matters. The ground-level jump remains a viable main route. |

All nine coin IDs and existing credit are preserved. The canopy secret reconnects
on safe ground at x6370 after the upper route's final gap. Only level configuration,
placement validation, tests and documentation change. No new physics, persistence,
Supabase, music or character logic is introduced.

## Test in VS Code

```sh
git switch game-prototype
git pull --ff-only origin game-prototype
npm test
npm run validate:levels
py -m http.server 8000
```

Hard-refresh http://127.0.0.1:8000/game/. Use your usual browser/origin for saves.

1. Level 2 entrance: the screenshot platform should now have left/right arrows.
   Board from the near-bank dock at x2590–2790 and ride toward the far-bank landing at x3280; it should not move up/down. The ground and any ordinary stepping stones are absent across x2820–3280.
2. Level 2 canopy: board the lift when low, ride upward, move toward its right edge
   and jump to the higher canopy. Collect Coin 2 or inspect the faded earned coin.
3. At the canopy exit, use the horizontal bough's far endpoint, then jump right.
   You can also deliberately drop to the lower route; the upper connection is a choice.
4. Level 3 nest: stand on the cracked board and let it break. The new hole below
   should cause falling/death if you do not jump away. Try the lower gap jump too.
5. Check the other special platforms against the table. Restart/death/replay should
   reset motion and boards. Pause, resume and collect/save coins as before.

Automated checks cover full main and all-coin routes at 30/60/120 FPS, the revised
canopy secret entrance/exit, and boarding/riding/reversal/exits from multiple motion
phases. Negative checks reject bad placements. A direct canopy jump without the
bough drops to the lower route; separate boarding tests verify the intended air exit.
Browser gameplay feel and your approval are still pending.

The widened river has a clear landing zone before the Fern Walk slime. The next
route is one continuous hazard bypass; its redundant intermediate ledge was removed.
All five horizontal transfers are tested with the most favorable static takeoff
(including overhang) at 30/60/120 FPS: none can directly reach its declared airborne
destination without the moving platform. This does not forbid an intentional
separate lower route; it prevents a nearby static ledge from duplicating the transfer.
A canvas rendering of the redesigned river crossing was also visually inspected.
