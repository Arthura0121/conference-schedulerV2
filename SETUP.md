# Setup and deployment

Use a separate Supabase test project for setup and verification. Review the database’s applied migrations before upgrading. The initial schema is for a new, empty project.

## Database and teacher access

1. Enable [anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous) for student sessions.
2. Apply the pending files in [`supabase/migrations/`](supabase/migrations/) in order. For a new project, start with `001_schema.sql`, then `002_fix_unqualified_updates.sql` and `003_v240_realtime_bulk_roster.sql`. Apply both `004` files, then `005` through `007`, followed by `20261108033755_reservation_hold_20_seconds.sql`. The final migration sets the window for new holds to 20 seconds.
3. Create a confirmed email/password account for the teacher. Set its email in a local copy of [`supabase/make_admin.sql`](supabase/make_admin.sql) and run that copy in the same project. Keep the checked-in placeholder.
4. For a disposable test project, optionally load [`supabase/seed.sql`](supabase/seed.sql) and verify it with [`seed_check.sql`](supabase/tests/seed_check.sql). The seed preserves paper sign-ups as unavailable slots without importing student names.

Use [`verify_functions.sql`](supabase/tests/verify_functions.sql) to check the functions repaired by migration 002 and [`verify_v240_READONLY.sql`](supabase/tests/verify_v240_READONLY.sql) to inspect the Realtime and roster installation. That verification file contains one read-only statement. For server-enforced read-only operation, follow its optional transaction instructions. The legacy [`db_tests.sql`](supabase/tests/db_tests.sql) suite has 108 assertions and is intended for an empty, disposable database at its documented schema version. See [Testing](TESTING.md) for test scopes.

## Local configuration

Copy `.env.example` to `.env`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the test project's URL and browser-safe key. Use a [publishable key or legacy anon key](https://supabase.com/docs/guides/getting-started/api-keys) for that variable. Keep database credentials and elevated keys out of the client and repository.

Run the commands in [Local development](README.md#local-development). Use the teacher dashboard to create a disposable appointment and verify booking, cancellation, theme changes, and locking in a second browser. Confirm that reservation expiry follows the database’s 20-second window.

## GitHub Pages

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the repository’s Actions variables for the deployment project. Configure Pages to use GitHub Actions. The [deploy workflow](.github/workflows/deploy.yml) checks, builds, and publishes pushes to `main`.

Apply pending database migrations to the deployment project through its separate database release process before publishing a frontend that requires them.
