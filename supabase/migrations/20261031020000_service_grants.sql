-- Lets the ID check function (which runs with the service key) read members and save ID check results.
-- This project doesn't give table access by default, so the service role needs it spelled out too.
-- Safe to run more than once.

grant select on public.members to service_role;
grant select, insert, update on public.id_checks to service_role;
