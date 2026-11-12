# Slime stomp playtest

Implemented on `game-prototype`, awaiting Victoria's personal gameplay approval.
This mechanic works in both The First Adventure and The Winding Grove.

## Run in VS Code

1. Pull `game-prototype` as usual. Keep your current server running, or from the
   repository root start `python -m http.server 8000` (`py` also works on Windows).
2. Open `http://127.0.0.1:8000/`, sign in, then open `/game/` and select a level.
   Use the same browser/origin as your existing saved progress.
3. Level 2 still requires completing Level 1; all three coins are not required to unlock it.

## What to test

- Jump onto a green slime while falling, or drop onto it from a ledge. It should squish
  and fade for about 0.28 seconds, and you should automatically bounce upward.
- Keep moving left or right during the bounce. The bounce is smaller than a normal jump
  and uses the existing airborne animations; no extra jump button is required.
- Walk into a slime, let one walk into you, or jump upward into it: those contacts remain deadly.
- Landing on a mushroom is also deadly. Mushrooms cannot currently be stomped.
- A defeated slime is harmless immediately, even while its squish animation is visible.
- Press R after defeating a slime: all enemies should return to their spawn positions.
- Defeat a slime, then die to a mushroom, thorns or a pit: the normal death effect and
  automatic restart should restore every enemy, including previously defeated slimes.
- Complete a level after a stomp, then select Replay Level: enemies must reset again.
- Check the three-coin HUD, temporary pickups and saved coins. Stomping awards no shop
  currency or collectible achievement. Only reaching the flag saves new collectible coins.
- Return to the map and change/replay levels. Existing progress, unlocks, and the
  equipped shop character should continue working.

The first ground slime in each level patrols near the first few raised platforms, shortly
after the opening pit. Those ledges provide a convenient place to practice landing from above.
Please report whether the bounce feels too strong/weak or any contact feels unfair.

## Shared code

- `entities/Enemy.js`: explicit `stompable` configuration, active/defeated/removed state,
  temporary defeat animation time, motion snapshots and full reset behavior.
- `engine/Collision.js`: swept AABB collision checks, including the contact direction.
  Side, embedded and exact corner contacts cannot count as top landings.
- `engine/EnemyInteractions.js`: resolves the earliest contact, checks descent and
  stompability, and handles any remaining movement after a bounce.
- `engine/Physics.js`: shared 420-speed bounce versus the existing 650-speed jump.
- `rendering/EnemyRenderer.js`: squish/fade anchored at the feet. Active artwork is unchanged.
- `levels/Level1.js` and `levels/Level2.js`: slime stompability only; mushrooms remain deadly.
- `game.js`: calls the shared interaction resolver before the existing death/coin/finish handling.
- `index.html`: a short instruction explaining slimes versus mushrooms.

Positions, patrol speeds/ranges, platforms, hazards, collectible IDs/locations and finish
flags are unchanged. Defeats are attempt-only and are never written to localStorage or Supabase.
Future enemy responses can extend the enemy behavior without adding appearance checks
to collision detection; no multi-hit, flying or protected enemies are implemented here.

## Automated validation

```sh
node --test game/tests/*.test.mjs
```

The original 18 tests remain intact, alongside new stomp tests. Checks cover top/side/upward
contacts, mushrooms, high-speed sweeps, patrol boundary stops, multiple enemies, bounce
remainder time, rendering, resets and both levels at 30/60/120 FPS.
New input fixtures demonstrate continuous three-coin Level 2 completions under swept
collision checks. The original route fixtures remain for the original regression suite.
Automated physics and rendering checks supplement your browser playtest; they do not replace it.
