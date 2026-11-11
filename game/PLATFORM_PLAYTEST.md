# Moving and collapsing platforms

Implemented on `game-prototype`; awaiting Victoria's playtest and approval.
Only Level 2 has interactive platforms. No later levels or Supabase changes are included.

## Try it in VS Code

Pull `game-prototype`, keep your local server running, and refresh `/game/` on the same
browser/origin where you saved progress. Select Level 2 from the map. If needed, start
the server from the repository root with `python -m http.server 8000` (`py` on Windows).
Level 2 still unlocks by completing Level 1, without requiring all three coins.

| Location | Mechanic | What to try |
| --- | --- | --- |
| Opening gap, x=660–850, top y=330 | Horizontal ferry | Use the opening raised path to board the marked wooden ferry. Release movement keys and let it carry you. Jump off toward the far side. |
| Just before Fern Walk, x=2890, top y=375–215 | Vertical lift | Approach from the existing x=2770 ledge. Board when the lift is low enough, ride upward, and jump toward the x=3100 ledge. The original ground jump remains available. |
| Fern Walk, x=4030, top y=375 | Collapsing board | Land, watch for cracks/shaking, then jump away. If you stay, it drops after one second; the safe ground below can catch you. |
| Sparrow Ledges, x=15750, top y=300 | Collapsing board | Keep moving and jump for Coin 3 before the one-second warning ends. This is the original coin takeoff ledge, with its position and dimensions preserved. |

Moving platforms have cream direction arrows and pause briefly at both endpoints.
Collapsing platforms are solid during their warning, then become non-solid immediately
while a short falling/fading visual plays. They remain gone for the rest of the attempt.
As with the existing terrain, platforms have one-way tops: jumping up through them is allowed.

## Personal checks

- Ride without movement input through both endpoint pauses/reversals. Feet should stay
  on the platform without repeated falling/landing animations or visible jitter.
- Jump from and onto each moving platform, including near its edges. Walk off an edge
  and confirm that it stops carrying you.
- Jump just before a collapsing board disappears. It must not cancel your jump or
  directly kill you. Falling into a pit, thorns or enemies still uses normal death rules.
- Stand on a board, leave and return: the original warning deadline continues; it is
  not restarted by repeated landings.
- Press R, die, or finish and choose Replay Level. Moving platforms return to their
  configured starting positions; warning and collapsed boards return fully stable.
- Check all three coins, saved progress, map navigation, level unlocking, the completion
  popup, slime stomping and the equipped character. Level 1 should feel unchanged.

## Shared architecture

- `entities/Platform.js`: runtime motion/state/timers. Configuration objects are copied
  and never receive temporary state.
- `levels/LevelManager.js`: instantiates interactive definitions and resets/updates them.
  Static terrain remains the same plain rectangles.
- `engine/Collision.js`: relative top-crossing checks for moving surfaces alongside
  the existing static landing checks.
- `engine/Physics.js`: records the supporting platform, carries grounded riders,
  detaches jumps and handles landing on the moving surface.
- `entities/Player.js`: clears the support reference on reset.
- `engine/EnemyInteractions.js`: passes the remaining frame interval to platform physics
  when continuing a stomp bounce.
- `rendering/PlatformRenderer.js`: wooden boards, direction arrows, cosmetic warning
  cracks/shake and a short collapse effect. Rendering never changes collision geometry.
- `game.js`: updates platforms before player movement and renders interactive terrain.
- `levels/Level2.js`: adds two optional moving platforms and converts exactly two ledges
  to collapsing boards. Enemy patrols, coins, hazards and the finish flag are unchanged.

## Future level configuration

Add definitions to a level's existing `platforms` list:

```js
{ id: "ferry", type: "moving", x: 660, y: 330, width: 110, height: 24,
  axis: "x", distance: 190, speed: 70, pause: 0.3,
  startProgress: 0, startDirection: 1, appearance: "wood" }

{ id: "lift", type: "moving", x: 2890, y: 375, width: 100, height: 24,
  axis: "y", distance: -160, speed: 55, pause: 0.4, appearance: "wood" }

{ id: "crumble", type: "collapsing", x: 4030, y: 375, width: 160, height: 24,
  collapseDelay: 1, appearance: "wood" }
```

Positions and distances use world pixels; speed uses pixels/second, delays use seconds.
`startProgress` is a fraction from 0 to 1; `startDirection` is 1 or -1. `appearance`
supports wood or a thicker grass cap. Keep enemy patrols on static terrain for now.
Do not place moving paths through other solid ledges or beyond the level boundaries.

## Automated checks

```sh
npm test
```

The existing suite plus platform tests cover movement, pauses/reversals, riding, edge
landings, jumping off, warning deadlines, disappearance, resets and camera-independent
world coordinates at 30/60/120 FPS. A continuous Level 2 run with live platform/enemy
state collects all three coins and reaches the flag at each rate. Original Level 1
movement/stomp traces also match the prior engine. Automated checks supplement your
browser playtest; the feel of the new mechanics is not finalized yet.
