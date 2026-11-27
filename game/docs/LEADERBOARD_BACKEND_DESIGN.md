# Future verified global rankings — design only

Status: **verified competitive rankings remain unimplemented**. A separate opt-in, unverified community implementation is now prepared; see [Community setup](COMMUNITY_SETUP.md). Its community migration was approved and applied to the existing project on November 26, 2026; the matching frontend is published on `game-prototype`. This document describes the additional authoritative verification needed beyond browser-reported community records. Existing private inventory/appearance remain current-player data, not a public avatar directory.

## Proposed records, subject to approval

| Proposed storage | Purpose and visibility |
| --- | --- |
| Private run sessions | Server-issued one-use run identifier, authenticated owner, level ID, immutable level/physics version, server lifecycle timestamps, challenge/version, input evidence reference, status and expiration. No public reads. |
| Private verified results | Server-derived integer milliseconds, completed level, valid stable coin IDs, verification version, unique run ID, owner; optional associated verified deaths. Only an authoritative service may insert/update. |
| Private per-player bests/achievements | Transactionally derive minimum eligible times and unique permanent coin unions from verified results. Partition by season/rules version to avoid comparing different courses. |
| Opt-in public identity | Existing username plus an opaque public alias unrelated to the auth ID, moderated name, approved public cosmetic IDs and supported appearance. Consent, visibility, deletion and rename rules required. Do not grant public access to existing private profiles/inventory. |
| Public ranking projection | Only consented username/public alias/cosmetics and aggregate verified metrics. Exclude auth IDs, emails, balances, inventory, tokens and run evidence. Derive ranks server-side; bounded queries/pages for up to 100 visible entries and an authenticated own-rank endpoint. |

The local version-1 storage schema remains unchanged. Old local times/coins must **not** be silently promoted to trusted global results. They can remain local records; a future unverified-import category would need separate explicit labeling and consent. Username should continue to originate from the existing profile, not a new name editor.

## RLS, privacy and permissions

Enable RLS on every new table. Deny anonymous and authenticated browser INSERT/UPDATE/DELETE on sessions, verified results, bests and aggregate projections. Authenticated private reads, where needed, must check owner equals `auth.uid()`; public reads may access only the intentionally published, opt-in projection. A narrowly scoped authenticated endpoint handles run requests; service credentials live only on the server and are never shipped to JavaScript. RLS protects ownership and access; it does not validate a score.

Opt-in/out endpoints must authenticate the caller, update only that user's visibility and remove their public rows/cosmetics promptly. Define username moderation, retention/deletion of run evidence, cosmetic allowlists, asset URL restrictions and default private profiles. Public APIs must not return raw private rows and then hide fields in the UI. Use trusted server aggregation or carefully permissioned public projection storage; review view ownership/security-invoker semantics before choosing any SQL view. Test every policy as guest, another user, owner and server role, including indirect view access.

## Authoritative score validation: unresolved prerequisite

Never accept `{ timeMs, coins, completed, assisted: false }` from the browser as evidence. JWT authentication, a plausible minimum time, signed run-start tokens, rate limiting and client Developer Mode checks do not prove honest gameplay. Developer-assisted restrictions remain useful locally but are not server-side anti-cheat.

A possible future architecture is server-authoritative simulation, or a version-pinned deterministic verifier paired with server-paced, sequenced input submission and a trusted run lifecycle. Before enabling publication it must establish:

1. Server-issued expiring run sessions bound to authenticated owner, level, approved physics and immutable course version.
2. Ordered bounded input streams; no arbitrary client-supplied timestamps, teleports, coordinates, completion flags or accumulated time. Prevent replay/reuse, conflicting submissions, forged pause intervals and short checkpoint starts.
3. Authoritative simulation/verification of movement, collisions, hazards, checkpoint/death recovery, stable coin IDs, finish flag and Level 10 guardian requirements. Preserve the exact existing active-time rules, including death retries, full manual resets, pauses and focus suspension, under a separately specified server protocol.
4. Server-derived integer elapsed time and eligibility, safe limits for payload/frame count/CPU, challenge expiration, idempotency and transactional coin-union/minimum-time writes. A client flag saying assistance is off is insufficient.
5. End-to-end tests against fabricated times, reordered input, duplicate/expired sessions, altered physics, pause abuse, cross-account requests and forged cosmetic URLs. Explain residual automated-play/tool-assisted input limitations; deterministic replay alone is not proof of real-time human play.

The present architecture cannot provide this authority. Focus/background pauses are browser observations and cannot simply be trusted in global results. The proposed verifier is a design direction, **not an implemented or proven secure solution**. Keep publication disabled until timing authority, pause semantics, cheating threat model and backend verification are designed, implemented and reviewed together. No client-only workaround should populate a trusted board.

## Ranking semantics

- Adventure: completed levels descending, permanent unique achievement coins descending. Use combined time only when both tied players have valid verified times for the same complete ten-level course/version. Players lacking comparable timing remain tied on progression; do not invent times or let faster partial coverage beat greater progress. For multi-player tie groups, design a deterministic server rank policy rather than relying on a pairwise comparator with incomparable records. Display ties as ties; pagination order can use a non-scoring public alias.
- Level Times: eligible per-level best milliseconds ascending for the selected course/version; missing times excluded, equal values share rank.
- Full Game / Combined Best Times: all ten completed levels and ten positive valid times required. Sum the per-level minima using safe arithmetic, rank ascending. This is **not a continuous full-game speedrun**. Missing times never become zero. Death totals are not a tiebreaker unless a corresponding verified best-run death count exists.
- Permanent achievement coins remain distinct from shop currency and pending-attempt pickups. No local coin-saving behavior changes.

## Work requiring permission

Approve the schema/policy/public-identity consent design; provision server validation and trusted run lifecycle; implement/test migrations, RLS and server-only credentials; create privacy-safe read endpoints and transactional aggregation; decide seasons/versioning and ties; review security and residual anti-cheat limitations; then explicitly enable opt-in publication. None of this work has been performed or authorized by the local leaderboard implementation.
