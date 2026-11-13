-- =====================================================================
--  Sécurité : les fonctions de l'app ne sont appelables que connecté
--  (elles refusaient déjà les visiteurs, on retire simplement le droit)
--  À coller dans Supabase > SQL Editor > New query > Run
-- =====================================================================

revoke execute on function public.my_couple_id()                from public, anon;
revoke execute on function public.create_couple(text, text)       from public, anon;
revoke execute on function public.join_couple(text, text, text)   from public, anon;
revoke execute on function public.start_point()                   from public, anon;
revoke execute on function public.set_ready(uuid, int, boolean)   from public, anon;
revoke execute on function public.go_to_step(uuid, int)           from public, anon;

grant execute on function public.my_couple_id()                to authenticated;
grant execute on function public.create_couple(text, text)       to authenticated;
grant execute on function public.join_couple(text, text, text)   to authenticated;
grant execute on function public.start_point()                   to authenticated;
grant execute on function public.set_ready(uuid, int, boolean)   to authenticated;
grant execute on function public.go_to_step(uuid, int)           to authenticated;

-- Les fonctions créées plus tard ne seront plus ouvertes aux visiteurs par défaut
alter default privileges in schema public revoke execute on functions from public, anon;
