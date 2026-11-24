-- =====================================================================
--  Annuler un point commencé par erreur (seulement s'il est en cours)
--  À coller dans Supabase > SQL Editor > New query > Run
-- =====================================================================

create or replace function public.cancel_point(p_point uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.points
   where id = p_point
     and couple_id = public.my_couple_id()
     and status = 'en_cours';
  if not found then raise exception 'Ce point ne peut pas être annulé'; end if;
end $$;

revoke execute on function public.cancel_point(uuid) from public, anon;
grant execute on function public.cancel_point(uuid) to authenticated;

-- Fait connaître la nouvelle fonction à l'app tout de suite
notify pgrst, 'reload schema';
