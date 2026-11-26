-- psql-only test suite. Use a NEW DISPOSABLE PostgreSQL database, never the live project.
\set ON_ERROR_STOP on
-- Fail before touching an existing auth/profile database (including a real Supabase project).
do $$ begin
    if to_regclass('public.profiles') is not null or to_regclass('auth.users') is not null then
        raise exception 'This fixture requires a NEW DISPOSABLE database without auth/users or profiles.';
    end if;
end $$;
create schema auth;
create table auth.users(id uuid primary key);
create table public.profiles(id uuid primary key references auth.users(id), username text);
create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
do $$ begin
    if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
    if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
end $$;
\ir ../migrations/20261126194441_community_leaderboard.sql
begin;
create function pg_temp.assert(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'TEST FAILED: %',message; end if; end $$;
insert into auth.users values('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
insert into public.profiles values('00000000-0000-0000-0000-000000000001','SQL fixture A'),('00000000-0000-0000-0000-000000000002','SQL fixture B');
select pg_temp.assert(not has_schema_privilege('authenticated','qm_community','USAGE'),'private schema is inaccessible');
select pg_temp.assert(not has_function_privilege('anon','public.qm_community_submit(uuid,jsonb)','EXECUTE'),'guest cannot submit');
select pg_temp.assert(has_function_privilege('anon','public.qm_community_board(text,integer,uuid)','EXECUTE'),'guest may read safe board');
select pg_temp.assert((select bool_and(relrowsecurity) from pg_class where relnamespace='qm_community'::regnamespace and relkind='r'),'RLS enabled on all private tables');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.qm_community_participate(auth.uid(),true);
select public.qm_community_submit(auth.uid(),'[{"level_id":1,"coin_ids":[],"best_time_ms":2000}]');
select public.qm_community_submit(auth.uid(),'[{"level_id":1,"coin_ids":[],"best_time_ms":4000}]');
select pg_temp.assert((public.qm_community_status(auth.uid())->'records'->0->>'best_time_ms')::bigint=2000,'slower upload cannot replace faster');
select public.qm_community_submit(auth.uid(),'[{"level_id":1,"coin_ids":[],"best_time_ms":1000}]');
select pg_temp.assert((public.qm_community_status(auth.uid())->'records'->0->>'best_time_ms')::bigint=1000,'faster upload replaces best');
do $$ begin
    begin
        perform public.qm_community_submit('00000000-0000-0000-0000-000000000002','[]');
        raise exception 'TEST FAILED: cross-account write was allowed';
    exception when insufficient_privilege then null; end;
    begin
        perform public.qm_community_submit(auth.uid(),'[{"level_id":1,"coin_ids":["forged"],"best_time_ms":1}]');
        raise exception 'TEST FAILED: forged coin accepted';
    exception when raise_exception then
        if sqlerrm not like 'Unknown achievement coin%' then raise; end if;
    end;
end $$;
-- A legacy completion must not qualify as a zero-time full adventure.
select public.qm_community_submit(auth.uid(),(select jsonb_agg(jsonb_build_object('level_id',i,'coin_ids','[]'::jsonb,
    'best_time_ms',case when i=10 then null else 1000 end)) from generate_series(1,10)i));
select pg_temp.assert(jsonb_array_length(public.qm_community_board('full',1,auth.uid())->'rows')=0,'missing tenth time prevents qualification');
select public.qm_community_submit(auth.uid(),'[{"level_id":10,"coin_ids":[],"best_time_ms":1000}]');
select pg_temp.assert((public.qm_community_board('full',1,auth.uid())->'mine'->>'time_ms')::bigint=10000,'combined total uses all ten minima');
select pg_temp.assert(not (public.qm_community_board('full',1,auth.uid())->'mine' ? 'user_id'),'private IDs absent from response');
select pg_temp.assert(public.qm_community_board('full',1,auth.uid())->>'verification'='unverified','always marked unverified');
-- B has fewer completed levels and cannot beat A on speed alone.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select public.qm_community_participate(auth.uid(),true);
select public.qm_community_submit(auth.uid(),'[{"level_id":1,"coin_ids":[],"best_time_ms":1}]');
select pg_temp.assert((public.qm_community_board('adventure',1,auth.uid())->'mine'->>'rank')::int=2,'adventure prioritizes completed levels');
select pg_temp.assert((public.qm_community_board('level',1,auth.uid())->'mine'->>'rank')::int=1,'level ranks use fastest time');
-- Incomplete time coverage in an otherwise tied progression group is a real tie.
select public.qm_community_submit(auth.uid(),(select jsonb_agg(jsonb_build_object('level_id',i,'coin_ids','[]'::jsonb,
    'best_time_ms',case when i=10 then null else 1000 end)) from generate_series(1,10)i));
select pg_temp.assert((public.qm_community_board('adventure',1,auth.uid())->'mine'->>'rank')::int=1,'incomparable ten-level times remain tied');
select public.qm_community_submit(auth.uid(),'[{"level_id":10,"coin_ids":[],"best_time_ms":1000}]');
select pg_temp.assert((public.qm_community_board('full',1,auth.uid())->'mine'->>'time_ms')::bigint=9001,'full game uses faster existing level best');
select pg_temp.assert((public.qm_community_board('adventure',1,auth.uid())->'rows'->1->>'rank')::int=2,'comparable full time breaks progression tie');
-- Client roles cannot bypass the RPC access boundary.
set local role authenticated;
do $$ begin
    begin perform 1 from qm_community.records; raise exception 'TEST FAILED: direct records access';
    exception when insufficient_privilege then null; end;
    begin
        perform public.qm_community_status('00000000-0000-0000-0000-000000000001');
        raise exception 'TEST FAILED: another account status leaked';
    exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
    begin
        perform public.qm_community_submit('00000000-0000-0000-0000-000000000002','[]');
        raise exception 'TEST FAILED: anonymous write';
    exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.qm_community_submit(auth.uid(),jsonb_build_array(jsonb_build_object('level_id',1,
    'coin_ids',(select to_jsonb(coin_ids[1:2]) from qm_community.level_definitions where level_id=1))));
select public.qm_community_submit(auth.uid(),jsonb_build_array(jsonb_build_object('level_id',1,
    'coin_ids',(select to_jsonb(coin_ids[2:3]) from qm_community.level_definitions where level_id=1))));
select pg_temp.assert((public.qm_community_board('adventure',1,auth.uid())->'mine'->>'coins')::int=3,'coin union is unique and bounded');
select pg_temp.assert((public.qm_community_board('level',1,auth.uid())->'mine'->>'time_ms')::bigint=1000,'coin-only update preserves best time');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select public.qm_community_participate(auth.uid(),false);
select pg_temp.assert(public.qm_community_status(auth.uid())->>'participating'='false','withdrawal removes membership');
select pg_temp.assert((select count(*)=0 from qm_community.records where user_id=auth.uid()),'withdrawal deletes online records');
select set_config('request.jwt.claim.sub','',true);
select pg_temp.assert(public.qm_community_board('adventure',1,null)->'mine'='null'::jsonb,'guest sees no private own row');
rollback;
\echo 'PASS community SQL fixture tests (disposable database only)'
