# Stage 2 setup: businesses and the directory

## 1. Run the database change

1. Open Supabase, project **dandelions**, then **SQL Editor**, then **New query**.
2. Paste everything in `supabase/migrations/20261101000000_businesses.sql` and click **Run**.
3. You should see "Success. No rows returned."

## 2. Run the license checkbox change

Paste everything in `supabase/migrations/20261101010000_business_attest.sql` and click **Run**.

After this, there is no hand check queue. A business shows in the directory as soon as the owner saves it with the box ticked ("I confirm this business holds a valid license"). The time they ticked it is saved in `attested_at`. Businesses that were waiting are listed, and their owners are asked to tick the box on their next save.

## 3. Taking a business down

If there's a problem with a business, take it out of the directory and email the owner:

```sql
select b.id, b.name, b.town, b.license, u.email, b.attested_at
from public.businesses b join auth.users u on u.id = b.owner_id
order by b.created_at desc;

update public.businesses set status = 'not_listed', checked_at = now() where id = 'PASTE-ID-HERE';
```

To put it back, run the same update with `'listed'`. Owners can't change the status themselves.

## What members see

- **Your profile** (`/app/profile.html`): a "Your business" form with the license checkbox, and a monthly "How booked are you" report once the business is added.
- **Directory** (`/directory.html`): listed businesses only, with name, kind, town, what they do and any offer. Licenses, points limits and busy reports are never shown.
