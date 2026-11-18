# Weekly database backup

The Supabase Free plan keeps no backups. The **Database backup** workflow (`.github/workflows/db-backup.yml`) runs every Sunday morning. It copies the database (all tables, the sign-in records in `auth`, and the file records in `storage`), locks the copy with a passphrase, and keeps it in the Actions tab for 90 days.

What it does not copy: the photo files themselves in Supabase Storage. Only the records about them. Members can upload photos again if they're ever lost.

## Set up (once)

1. **Database connection.** In Supabase, open the project, click **Connect** at the top, choose **Session pooler**, and copy the URI. It looks like `postgresql://postgres.utduohtyjbbcnzxfmutp:[YOUR-PASSWORD]@aws-0-us-....pooler.supabase.com:5432/postgres`. Put the database password in place of `[YOUR-PASSWORD]`. If you don't know it, reset it under **Project Settings > Database**. That doesn't affect the site, which uses API keys, not this password.
2. **Passphrase.** Make up a long passphrase (at least 20 characters, for example five random words). Write it down offline with your recovery codes. Without it, a backup can't be opened by anyone, including you.
3. In GitHub, go to **Settings > Secrets and variables > Actions > New repository secret** and add two secrets:

| Name | Value |
|---|---|
| SUPABASE_DB_URL | the URI from step 1 |
| BACKUP_PASSPHRASE | the passphrase from step 2 |

4. Go to **Actions > Database backup > Run workflow** to test it. A green check and a file under **Artifacts** at the bottom of the run means it worked.

The repo is public, so anyone signed in to GitHub can download the locked file. That's why it's locked. Never put the passphrase anywhere online.

## Restore

1. Download the newest `dandelions-YYYY-MM-DD.dump.gpg` from the Actions tab and unzip it.
2. Unlock it: `gpg --decrypt dandelions-YYYY-MM-DD.dump.gpg > dandelions.dump` (it asks for the passphrase).
3. Look before you restore: `pg_restore --list dandelions.dump` shows what's inside.
4. To restore one table into the live project: `pg_restore --dbname "<SUPABASE_DB_URL>" --data-only --table=<table> dandelions.dump`. For a full restore into a new, empty project, run the migrations in `supabase/migrations` first, then `pg_restore --dbname "<new project URL>" --data-only --disable-triggers dandelions.dump`.

Restoring writes over live data. Ask for help before step 4.
