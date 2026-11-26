-- REVIEW FIRST. Unverified, opt-in community records; never a trusted speedrun board.
-- No changes to existing profiles, auth policies, inventory, balances or local saves.
begin;
create schema qm_community;
revoke all on schema qm_community from public, anon, authenticated;

create table qm_community.members (
    user_id uuid primary key references auth.users(id) on delete cascade,
    public_key uuid not null unique default gen_random_uuid(),
    joined_at timestamptz not null default now()
);
create table qm_community.level_definitions (
    level_id integer primary key check (level_id between 1 and 10),
    coin_ids text[] not null check (cardinality(coin_ids) = 3)
);
insert into qm_community.level_definitions(level_id,coin_ids) values
(1, ARRAY['level-1-coin-1','level-1-coin-2','level-1-coin-3']),
(2, ARRAY['level-2-coin-1','level-2-coin-2','level-2-coin-3']),
(3, ARRAY['level-3-coin-1','level-3-coin-2','level-3-coin-3']),
(4, ARRAY['level-4-coin-1','level-4-coin-2','level-4-coin-3']),
(5, ARRAY['level-5-coin-1','level-5-coin-2','level-5-coin-3']),
(6, ARRAY['level-6-coin-1','level-6-coin-2','level-6-coin-3']),
(7, ARRAY['level-7-coin-1','level-7-coin-2','level-7-coin-3']),
(8, ARRAY['level-8-coin-1','level-8-coin-2','level-8-coin-3']),
(9, ARRAY['level-9-coin-1','level-9-coin-2','level-9-coin-3']),
(10, ARRAY['level-10-coin-1','level-10-coin-2','level-10-coin-3']);
create table qm_community.records (
    user_id uuid not null references qm_community.members(user_id) on delete cascade,
    level_id integer not null references qm_community.level_definitions(level_id),
    coin_ids text[] not null default '{}' check (cardinality(coin_ids) <= 3),
    best_time_ms bigint check (best_time_ms between 1 and 604800000),
    primary key(user_id, level_id)
);
alter table qm_community.members enable row level security;
alter table qm_community.level_definitions enable row level security;
alter table qm_community.records enable row level security;
revoke all on all tables in schema qm_community from public, anon, authenticated;
-- Deliberately no direct-client policies/grants. Narrow RPCs below check caller identity.

create function public.qm_community_participate(p_expected_user uuid, p_enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
    if auth.uid() is null or auth.uid() is distinct from p_expected_user then
        raise exception 'Sign in again before changing community participation.' using errcode = '42501';
    end if;
    if p_enabled is null then raise exception 'Participation choice is required.'; end if;
    if not p_enabled then
        -- Withdrawal removes all online records immediately; local data is untouched.
        delete from qm_community.members where user_id = auth.uid();
        return;
    end if;
    select p.username::text into v_name from public.profiles p where p.id = auth.uid();
    if v_name is null or length(btrim(v_name)) not between 1 and 80
       or position('@' in v_name) > 0 or v_name = auth.uid()::text or v_name ~ '[[:cntrl:]]' then
        raise exception 'Set a public username in your existing profile before joining.';
    end if;
    insert into qm_community.members(user_id) values(auth.uid()) on conflict do nothing;
end $$;

create function public.qm_community_status(p_expected_user uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
    if auth.uid() is null or auth.uid() is distinct from p_expected_user then
        raise exception 'Account changed.' using errcode = '42501';
    end if;
    return jsonb_build_object('participating', exists(select 1 from qm_community.members where user_id = auth.uid()),
        'records', coalesce((select jsonb_agg(jsonb_build_object('level_id',r.level_id,
            'coin_ids',r.coin_ids,'best_time_ms',r.best_time_ms) order by r.level_id)
            from qm_community.records r where r.user_id = auth.uid()), '[]'::jsonb));
end $$;

create function public.qm_community_submit(p_expected_user uuid, p_records jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare rec jsonb; v_level integer; v_time bigint; v_coins text[]; v_allowed text[]; v_seen integer[] := '{}';
begin
    if auth.uid() is null or auth.uid() is distinct from p_expected_user then
        raise exception 'Account changed; records were not uploaded.' using errcode = '42501';
    end if;
    -- Serialize submissions and withdrawal on the membership row.
    perform 1 from qm_community.members where user_id = auth.uid() for update;
    if not found then raise exception 'Join the community board before publishing records.' using errcode = '42501'; end if;
    if jsonb_typeof(p_records) is distinct from 'array' or octet_length(p_records::text) > 16000 then
        raise exception 'Invalid record payload.';
    end if;
    if jsonb_array_length(p_records) > 10 then raise exception 'At most ten levels are allowed.'; end if;
    for rec in select value from jsonb_array_elements(p_records) loop
        if jsonb_typeof(rec) is distinct from 'object' or jsonb_typeof(rec->'level_id') is distinct from 'number'
           or jsonb_typeof(rec->'coin_ids') is distinct from 'array' then raise exception 'Invalid level record.'; end if;
        if (rec->>'level_id')::numeric <> trunc((rec->>'level_id')::numeric) then raise exception 'Invalid level.'; end if;
        v_level := (rec->>'level_id')::integer;
        if v_level = any(v_seen) then raise exception 'Duplicate level.'; end if;
        v_seen := array_append(v_seen, v_level);
        select coin_ids into v_allowed from qm_community.level_definitions where level_id = v_level;
        if not found then raise exception 'Unknown level.'; end if;
        if jsonb_array_length(rec->'coin_ids') > 3 or exists(
            select 1 from jsonb_array_elements(rec->'coin_ids') as items(value) where jsonb_typeof(items.value) <> 'string') then
            raise exception 'Invalid coins.';
        end if;
        select coalesce(array_agg(distinct value order by value), '{}'::text[]) into v_coins
            from jsonb_array_elements_text(rec->'coin_ids');
        if not v_coins <@ v_allowed then raise exception 'Unknown achievement coin.'; end if;
        v_time := null;
        if rec->'best_time_ms' is not null and rec->'best_time_ms' <> 'null'::jsonb then
            if jsonb_typeof(rec->'best_time_ms') <> 'number' then raise exception 'Invalid time.'; end if;
            if (rec->>'best_time_ms')::numeric <> trunc((rec->>'best_time_ms')::numeric)
               or (rec->>'best_time_ms')::numeric not between 1 and 604800000 then raise exception 'Invalid time.'; end if;
            v_time := (rec->>'best_time_ms')::bigint;
        end if;
        insert into qm_community.records as existing(user_id, level_id, coin_ids, best_time_ms)
            values(auth.uid(),v_level,v_coins,v_time)
        on conflict(user_id,level_id) do update set
            coin_ids = array(select distinct x from unnest(existing.coin_ids || excluded.coin_ids) x order by x),
            best_time_ms = least(existing.best_time_ms, excluded.best_time_ms);
    end loop;
end $$;

create function public.qm_community_board(p_tab text, p_level_id integer, p_expected_user uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
    if p_expected_user is not null and auth.uid() is distinct from p_expected_user then
        raise exception 'Account changed.' using errcode = '42501';
    end if;
    if p_tab is null or p_tab not in ('adventure','level','full') or p_level_id is null or p_level_id not between 1 and 10 then
        raise exception 'Invalid category or level.';
    end if;
    with totals as (
        select m.user_id, m.public_key, btrim(p.username::text) as username,
            count(r.level_id)::integer as completed,
            coalesce(sum(cardinality(r.coin_ids)),0)::integer as coins,
            case when count(r.best_time_ms) = 10 then sum(r.best_time_ms)::bigint end as combined_ms,
            max(r.best_time_ms) filter (where r.level_id = p_level_id) as level_ms
        from qm_community.members m join public.profiles p on p.id = m.user_id
        left join qm_community.records r on r.user_id = m.user_id
        where length(btrim(p.username::text)) between 1 and 80 and position('@' in p.username::text) = 0
            and p.username::text <> m.user_id::text and p.username::text !~ '[[:cntrl:]]'
        group by m.user_id,m.public_key,p.username
    ), comparable as (
        select *, bool_and(combined_ms is not null) over(partition by completed,coins) as comparable_times
        from totals
    ), ranked as (
        select *, dense_rank() over(order by
            case when p_tab = 'adventure' then completed end desc,
            case when p_tab = 'adventure' then coins end desc,
            case when p_tab = 'adventure' and comparable_times then combined_ms
                 when p_tab = 'level' then level_ms when p_tab = 'full' then combined_ms end asc nulls last) as rank
        from comparable where (p_tab = 'adventure') or (p_tab = 'level' and level_ms is not null)
            or (p_tab = 'full' and completed = 10 and combined_ms is not null)
    ), safe_rows as (
        select rank, public_key, user_id,
            jsonb_build_object('rank',rank,'username',username,'completed',completed,'coins',coins,
                'time_ms',case when p_tab = 'level' then level_ms else combined_ms end,
                'is_you',p_expected_user is not null and user_id = auth.uid()) as entry from ranked
    )
    select jsonb_build_object('verification','unverified','course','adventure-2026-11-v1',
        'rows',coalesce((select jsonb_agg(t.entry order by t.rank,t.public_key)
            from (select * from safe_rows order by rank,public_key limit 100) t),'[]'::jsonb),
        'mine',(select entry from safe_rows where user_id = auth.uid() and p_expected_user is not null)) into result;
    return result;
end $$;

revoke all on function public.qm_community_participate(uuid,boolean) from public,anon,authenticated;
revoke all on function public.qm_community_status(uuid) from public,anon,authenticated;
revoke all on function public.qm_community_submit(uuid,jsonb) from public,anon,authenticated;
revoke all on function public.qm_community_board(text,integer,uuid) from public,anon,authenticated;
grant execute on function public.qm_community_participate(uuid,boolean) to authenticated;
grant execute on function public.qm_community_status(uuid) to authenticated;
grant execute on function public.qm_community_submit(uuid,jsonb) to authenticated;
grant execute on function public.qm_community_board(text,integer,uuid) to anon,authenticated;
comment on function public.qm_community_board(text,integer,uuid) is
    'Opt-in, browser-reported UNVERIFIED community records. No anti-cheat or authoritative timing claim.';
commit;
