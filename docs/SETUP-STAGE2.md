# Stage 2 setup: businesses and the directory

## 1. Run the database change

1. Open Supabase, project **dandelions**, then **SQL Editor**, then **New query**.
2. Paste everything in `supabase/migrations/20261101000000_businesses.sql` and click **Run**.
3. You should see "Success. No rows returned."

## 2. Work the license check queue

Until checkers take this over, you check licenses by hand in the SQL Editor.

See who's waiting:

```sql
select b.id, b.name, b.kind, b.town, b.license, u.email, b.created_at
from public.businesses b join auth.users u on u.id = b.owner_id
where b.status = 'pending' order by b.created_at;
```

Look the license up (for contractors, the CSLB license lookup; for others, the city or county business license office). Then either list it:

```sql
update public.businesses set status = 'listed', checked_at = now() where id = 'PASTE-ID-HERE';
```

or hold it back and email the owner:

```sql
update public.businesses set status = 'not_listed', checked_at = now() where id = 'PASTE-ID-HERE';
```

If an owner changes their license later, the business goes back to waiting on its own.

## What members see

- **Your profile** (`/app/`): a "Your business" form, its check status, and a monthly "How booked are you" report once the business is added.
- **Directory** (`/directory.html`): listed businesses only, with name, kind, town, what they do and any offer. Licenses, points limits and busy reports are never shown.
