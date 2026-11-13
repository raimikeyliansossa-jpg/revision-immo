-- =====================================================================
--  Souvenirs : une date (jour du souvenir) et une légende modifiables
--  À coller dans Supabase > SQL Editor > New query > Run
-- =====================================================================

alter table public.memories add column if not exists taken_on date;

update public.memories
   set taken_on = (created_at at time zone 'Europe/Paris')::date
 where taken_on is null;

alter table public.memories
  alter column taken_on set default ((now() at time zone 'Europe/Paris')::date),
  alter column taken_on set not null;

create index if not exists memories_taken_on_idx on public.memories (couple_id, taken_on desc);

-- Les souvenirs sont à vous deux : chacun peut corriger la date et la légende
drop policy if exists "souvenirs: modifier" on public.memories;
create policy "souvenirs: modifier" on public.memories for update to authenticated
  using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id());
revoke update on public.memories from authenticated;
grant update (caption, taken_on) on public.memories to authenticated;
