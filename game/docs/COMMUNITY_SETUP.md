# Opt-in community leaderboard setup

Status: **database setup installed in the existing QuestManager Supabase project on November 26, 2026**, migration `20261126194441` (`community_leaderboard`). Frontend integration is being published to `game-prototype` as part of the approved setup. Do not rerun the applied migration.

This is the explicitly selected **unverified community** option. Authenticated users can report their own browser records, so a modified browser can fabricate scores. RLS and RPC checks prevent access to another account's records; they do not prove honest gameplay. No verified ranking or anti-cheat claim is made.

## Components

- `supabase/migrations/20261126194441_community_leaderboard.sql`: three private RLS-protected tables in `qm_community`, plus four narrow public RPCs. No changes to existing profiles, inventory, shop balances, auth tables or their policies.
- `game/leaderboard/CommunityStore.js`: authenticated opt-in publication, nonblocking completion sync, retry-on-refresh, response validation and account-race guards.
- `game/ui/CommunityLeaderboard.js`: actual top-100 rows, real top-three adventure cards, highlighted current-player row, own rank outside the top 100, category/level selection, consent, withdrawal, loading/error/empty states.
- `game/index.html`, `game/game.css`, `game/ui/Leaderboard.js`, `game/game.js`: navigation/visual integration and upload hook at the existing eligible completion boundary.
- `game/tests/community-leaderboard.test.mjs`: mocked-transport client tests, including explicit consent, retries, account races, scope isolation and safe response rendering.
- `supabase/tests/community-leaderboard.sql`: PostgreSQL migration/behavior/access checks using disposable fixture accounts. The fixture refuses an existing auth/profile database. **Never run this fixture on the actual project.**

The fixed current course is `adventure-2026-11-v1`. The SQL definitions contain the actual 30 stable coin IDs. If level routes/physics change significantly, introduce a new course/version deliberately rather than comparing unlike runs. This first schema supports only that single course. Client and server course constants must stay aligned.

## Participation and data behavior

No player is enrolled automatically. A signed-in player must check the publication consent and click **Share my records**. Their existing eligible local completions/coins/times are then uploaded as **unverified**, and future eligible completions sync while enrolled. Opening/refreshing the board retries local records if an earlier upload failed; login checks existing enrollment. Guests cannot upload.

The backend derives the owner from `auth.uid()`, checks the expected account on every private operation, and serializes submissions against withdrawal. It unions permanent valid coin IDs and keeps minimum positive times; slower/equal uploads never replace faster records. Missing legacy times remain null. Payloads are limited to ten levels and 16KB. The online category accepts times up to seven days per level; a longer local time remains local and its online time is omitted. Online arithmetic remains safely within JavaScript integer limits.

**Leave board and remove online records** deletes community membership and all community records for that account, preserving local progress. Rejoining republishes the records still on this browser. A developer coin reset does not automatically erase previously uploaded online achievements. Withdraw explicitly to remove those online records.

Online records and ranks can be read from other devices. The original browser-local gameplay saves/unlocks stay unchanged; this implementation does not import cloud records into gameplay or reset local saves. Current-player browser records stay in their existing separate card. Online times appear in the community table and own-community-rank summary. No second timer is introduced.

Other users see existing safe usernames and aggregate statistics only. Emails, auth IDs, inventory, tokens and private cosmetics are not returned by the ranking API. Existing username changes affect the board. Other players do not receive avatar data; their podium cards use names and achievements. The current user's existing private avatar remains in their local personal card.

## Rankings

- Adventure: completed levels descending, unique permanent achievement coins descending. Apply combined-time tiebreaking only if **every member of the tied progression group** has a complete ten-level time set; otherwise that group remains tied. This avoids nontransitive pairwise comparisons. Tied ranks use a private random ordering key for stable pagination without changing the rank.
- Level Times: selected level's recorded best ascending; missing times are excluded.
- Full Game: ten completed levels and ten valid times required; sum per-level bests ascending. This is not a continuous speedrun.
- Equal scoring tuples share a dense rank. At most 100 actual rows are returned; the current player's qualifying row is also returned separately even outside that window. There are no fabricated users or sample database scores.

## Activation procedure

Database steps 1–4 have been completed: project/profile structure checked, migration applied, permissions checked, and all three ranking RPCs tested through the actual REST API with the existing publishable key. Player enrollment remains empty; no one was opted in automatically. Real signed-in player browser testing (steps 6–8) remains. Do not run the migration a second time.

1. Connect Supabase in this conversation so the existing project's schema and permissions can be inspected. Alternatively, a project owner can review and run the migration manually in Supabase's SQL editor. Never share database passwords, service-role keys or auth tokens in chat.
2. Before applying anything, confirm the intended project is the existing QuestManager project; check `public.profiles.id` is UUID and `profiles.username` exists, the new schema/functions do not already conflict, and the existing auth/profile policies remain untouched. Review the exact migration and approve its application. This was approved and applied in the existing project; future database changes need their own review.
3. Apply **only** `supabase/migrations/20261126194441_community_leaderboard.sql` as the database owner, as one transaction. If a migration fails, diagnose and rollback rather than weakening RLS or granting direct table access. The migration is intended to run once, not as a repeated reset script.
4. Run read-only catalog checks and test opt-in behavior with designated project test accounts after approval. Verify guest/cross-account restrictions, no private fields in responses, slower-time preservation, coin validation, empty/legacy states, full-game eligibility and withdrawal. Do not seed fictional production leaderboard players.
5. Approve pushing the frontend changes to `game-prototype`. Pull on the local VS Code checkout and use the existing development server. No main/master merge is needed.
6. Sign in, open Adventure → Leaderboard, check the publication consent and choose **Share my records**. Finish an unlocked level with assistance off. Refresh the community board and verify the upload.
7. Sign into another browser/device with the same account: community rank/online time should load without changing that device's local gameplay progress. Test another consenting account and confirm it can change only its own online records.
8. Test **Leave board and remove online records**. Other browsers should no longer see that account in ranking reads; the local personal records must remain.

## Validation and limits

Validation completed: **325 JavaScript tests passed**, `npm run validate:levels` passed at 30/60/120 FPS, and the actual SQL migration plus all fixture assertions passed in disposable embedded PostgreSQL (PGlite 0.5.17; 81 statements). Live Supabase anonymous REST checks passed for all three categories (HTTP 200); anonymous submit and private-status calls were correctly denied (HTTP 401/403). Catalog checks confirmed fixed function search paths, RLS on all new tables, and no direct anonymous/authenticated table writes. Signed-in player publication still needs a real opt-in browser test.

Run `npm test -- --test-concurrency=4` and `npm run validate:levels` from the root. Client transport tests use mocks and are not a claim that the live database is configured. SQL fixture results must be reported separately from live Supabase/RLS integration.

If using a new disposable local PostgreSQL database, run:

```bash
psql "$QM_TEST_DATABASE_URL" -f supabase/tests/community-leaderboard.sql
```

The fixture creates mock auth/profile tables and refuses a database containing them. It is not a production smoke test. It exercises the actual migration and checks minimum times, missing-time eligibility, progression-first ordering, privacy, account ownership and withdrawal. Production auth JWT handling and existing profile policies still require a connected Supabase integration check.

Chromium remains unavailable in this environment, so desktop/mobile visual approval is still needed. The database migration has been applied. No player records have been uploaded, and frontend changes are published to `game-prototype`, with no main/master merge. SQL schema/permission details follow the official [database function guidance](https://supabase.com/docs/guides/database/functions) and [RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security), including explicit grants/revokes and fixed search paths for narrowly scoped security-definer functions.


## Security advisor review after installation

Supabase reports [RLS enabled without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) for the three private tables. This is intentional deny-by-default: browser roles have no schema/table access; only the reviewed RPCs operate on these records. No permissive table policy was added to suppress the notice.

The advisor also flags [anonymous privileged-function execution](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) and [authenticated privileged-function execution](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). For `qm_community_*`, these are the intentionally exposed, narrowly scoped RPCs: only the privacy-filtered read-only board is callable anonymously; writes/private-status require authenticated identity checks and opt-in. All use an empty search path and fully qualified tables. Direct table access remains denied.

Existing unrelated advisor findings for older project functions and [leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) were present before this migration and were not changed as part of this feature.


## Missing or email-like profile username

A real player test showed `qm_community_participate` correctly rejecting a profile without a publishable username. The former UI hid that actionable error behind a generic failure. The repair now recognizes the server message and presents a public-username field only when needed.

Choose a username (3–80 characters, not an email) and click **Save username and share**, keeping the publication consent checked. This updates only `public.profiles.username` for the current authenticated account through the existing owner-scoped UPDATE policy, then retries the normal opt-in flow. It does not create a separate display-name system, change your login email, touch balances, or choose a username automatically. Duplicate names and expired sessions get specific safe messages; raw database errors are never displayed. Account changes clear the field and discard stale responses.

This repair requires no migration or policy changes. Live catalog checks confirmed the existing authenticated column grants and owner UPDATE policy. Player-specific name changes occur only after the player chooses and submits a name in the interface.
