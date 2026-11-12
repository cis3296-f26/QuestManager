# QuestManager platform placement rules

Apply these rules to every current and future level:

- Vertical moving platforms lift the player to a genuinely higher route or ledge.
  Do not put a vertical lift in a gap where the destination is across/lower.
- Horizontal moving platforms cross pits or connect separated airborne landings.
  Declare actual departure and destination platforms; make the connection useful.
- Collapsing platforms belong above pits, enemies or hazards. Do not put a timed
  platform over an otherwise safe floor merely to demonstrate collapse.
- Do not place ordinary stepping stones beside a special platform that duplicate its
  crossing. Boarding and exit ledges belong at clear banks/endpoints; preserve an open
  traversal space and verify a normal jump cannot replace the intended air transfer.
- Every special platform declares `connection: { from, to }` using platform IDs.
  Run the placement validator and real-input route/boarding tests after changes.
- Foreground decorative trees and platform-support trees must not overlap. Check
  full scaled canopy/branch bounds with at least 16px breathing room, not trunk
  positions alone. Background silhouettes remain a separate depth layer.
- Preserve stable coin IDs, completion-based saving and shared movement physics.
  Validate 30/60/120 FPS. Passing tests establishes possibilities, not human approval.

Keep game development on `game-prototype`; do not merge into master or change Supabase.
