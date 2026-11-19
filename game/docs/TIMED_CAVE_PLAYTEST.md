# Crystal Cave: timed vault and falling-spike revision

This revision stays on `game-prototype`. It changes only the cave encounters and
shared configurable switch behavior; Levels 1–3, account saves, movement physics,
coin IDs and the first two coin positions, ferry/cracked-slab definitions and the finish flag are preserved.
Gameplay feel still needs your approval.

## Floor switch → jump through → run back

![Native canvas preview of the revised vault](timed-vault-preview.png)

The two redundant floating return steps are removed. The switch remains at
**x13030–13094, floor y460**. Walking onto it opens the door for **3.5 seconds**.
The blue-edged runway is at **y365**, a 95px rise that the normal jump can reach
at 30, 60 and 120 FPS. It remains an ordinary jump-through platform.

1. Step onto the floor switch.
2. Jump straight through the runway above, then land on it while falling.
3. Turn LEFT and run through the open door at **x12640**.
4. Collect the coin at **x12490/y335**, inside the alcove to the left of the door.
5. Leave to the right and drop off the runway to rejoin the main passage.

If the timer expires before entry, drop off the runway's right end and walk back
onto the floor switch to restart the countdown. Standing on it does not hold the
door open. Walking on the runway above cannot activate it.

The coin retains ID `level-4-coin-3`. Its alcove has a solid stone floor, roof and
back wall, resolved through the existing swept gate-wall collision system. This
is an explicit exception for the sealed alcove: the runway remains jump-through,
but the protected floor blocks collecting the coin from below. The roof cannot be
reached from surrounding ledges with the existing jump. The gate joins the floor
and roof without a gap. The old cracked-slab pit crossing remains; its landing
shelf ends before the new back wall rather than intersecting the enclosure.

The main route passes beneath the alcove and can finish without any switch or
coin. The existing falling spikes, thorns, enemies and ferry are unchanged.

A closing door stays open while occupied, preventing crushes or displacement.
It also opens for exit from the protected side only, so the player can leave after
collecting the coin even if the countdown has expired. This does not permit entry
from the right. An inside `EXIT →` cue identifies the escape direction.
Death, restart, load and replay reset puzzle state. Pausing freezes the countdown.

## More deliberate falling-spike encounters

There are now **11** falling spikes instead of six. They remain fixed to authored
lanes, warn with shaking/color/`!`, and show a small landing marker before falling.
They do not track or home toward the player. The existing swept collision and
platform shielding are reused.

| Area | Spike x positions | Purpose |
| --- | --- | --- |
| Crystal Passages | 3020, 3500 | A longer introductory warning, then a gallery-route drop. |
| Stalactite Cavern | 6500, 6910, 7670, 7930, 9020 | A shelf encounter and two separated approach lanes requiring a change in pace. |
| Ancient Chamber | 10080, 11540 | Separate encounters before/after the ferry; none inside the timed vault race. |
| Cave Exit | 13980, 14400 | A final warning sequence before the last gap; the flag bank stays safe. |

Drop speed is 720px/s. Warning times are 0.6–0.9 seconds, with authored trigger leads
matched to the 280px/s run speed and the drop height. Unlike the old early-trigger,
long-delay combination, the main challenge lanes can hit a player who blindly holds
right. Stop short, retreat, or bait the warning and cross after impact. Safe spaces
between lanes allow recovery rather than overlapping unavoidable falls.

## Verification and manual checks

Run `npm test` and `npm run validate:levels` from the repository root.

Executed for this revision: **189 tests pass**. All four implemented levels
pass layout, full-route and exploration validation at 30/60/120 FPS. Level 4's
optimized all-coin traces take 63.2–63.8 seconds; coin-free traces take 57.4–58.0
seconds. These are feasibility proofs, not human play duration.

Targeted normal-movement/jump simulations verify direct runway landing, leftward
gate crossing, timeout and retry, safe exit, perimeter/fast-corner blocking and
reset. From the declared lower entrance, a prompt attempt clears the gate with
about **1.6–1.7 seconds** remaining. A one-second delay before jumping still works
at every tested rate. Tests distinguish local perimeter setups from full
spawn-to-flag traces, which retain all hazards and use no flight or teleportation.
The entry-point pause harness checks a live 2.5-second countdown stays frozen
through pause and only advances on the resumed gameplay tick.

The full-course tests preserve stable coin IDs, existing interactive-platform
settings, finish flags, account isolation and completion-based saving. Levels
1–3 and the cave entrance remain covered by scope-baseline tests.

In VS Code, start your existing local development server and open the game in your
browser. Select Crystal Cave with Developer Mode off, then:

- Find the Ancient Crystal Chamber, after the ferry. Confirm both crossed-out
  steps are gone and the switch is on the lower floor.
- Walk onto the switch, jump straight up, land on the blue-edged runway and run
  LEFT through the door. Judge the countdown and turning/landing rhythm.
- Wait too long and retry by dropping off the runway's right end, returning to
  the switch, then repeating the same jump. The timer must restart.
- Try to reach the coin from below and around the closed door. Only the timed
  entry should work. After collecting it, wait for expiry and leave to the right.
- Pause mid-countdown; resume and check it continues without consuming pause time.
- Die/restart and replay: the door should reset closed, and the coin should save
  only after reaching the finish flag. Also finish without doing the puzzle.

The native canvas preview uses the actual renderer and fallback character; it is
not a browser screenshot or a real-account equipment test. Chromium cannot launch
in this environment, so no browser playthrough is claimed. Final feel, appearance,
audio and difficulty still require your manual approval. Nothing is pushed or
merged for this revision without permission.
