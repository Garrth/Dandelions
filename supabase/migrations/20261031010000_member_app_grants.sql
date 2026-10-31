-- Lets signed-in members reach their own rows from the website.
-- This project doesn't give table access to the website by default (the to-do list and ideas
-- tables already have their own grant lines), so the member app tables need these too.
-- The row rules still decide which rows: each member sees and changes only their own.
-- Safe to run more than once.

grant select on public.members to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.work_answers to authenticated;
grant select on public.id_checks to authenticated;
