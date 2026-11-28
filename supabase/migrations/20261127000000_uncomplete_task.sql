-- SCRUM-130: let a player uncheck a finished quest.
-- Marks the quest not done and takes back the coins complete_task paid for it.
-- Before running: open complete_task in Supabase (Database > Functions) and make sure
-- the reward amounts and the p_task_id type below match it.

create or replace function public.uncomplete_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_task   public.tasks%rowtype;
    v_reward integer;
begin
    -- Only the quest's owner can undo it.
    select * into v_task
      from public.tasks
     where id = p_task_id and user_id = auth.uid()
       for update;

    if not found then
        raise exception 'Quest not found.';
    end if;

    if not v_task.completed then
        return; -- already not done, nothing to undo
    end if;

    v_reward := case v_task.difficulty
        when 'easy'   then 10
        when 'medium' then 20
        when 'hard'   then 30
        else 0
    end;

    -- Take the coins back. Refuse if they were already spent, so players
    -- can't complete, spend, uncheck and complete again for free coins.
    if v_task.rewarded then
        update public.profiles
           set balance = balance - v_reward
         where id = auth.uid() and balance >= v_reward;

        if not found then
            raise exception 'You already spent the coins from this quest, so it can''t be unchecked.';
        end if;
    end if;

    update public.tasks
       set completed = false, rewarded = false
     where id = p_task_id;
end;
$$;

revoke all on function public.uncomplete_task(uuid) from public;
grant execute on function public.uncomplete_task(uuid) to authenticated;
