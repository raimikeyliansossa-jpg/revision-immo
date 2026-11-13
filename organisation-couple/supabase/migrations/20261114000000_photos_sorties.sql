-- =====================================================================
--  Sorties : le lieu (ex. « Musée d'Orsay — expo Monet ») et les photos
--  de la sortie (rangées aussi dans Nos souvenirs)
--  À coller dans Supabase > SQL Editor > New query > Run
-- =====================================================================

alter table public.outings  add column if not exists place text not null default '';
alter table public.memories add column if not exists outing_id uuid references public.outings on delete set null;

create index if not exists memories_outing_idx on public.memories (outing_id);
