Configuring Supabase for Contas ARS

1) Create a table

Open Supabase SQL editor and run the contents of `SUPABASE_SCHEMA.sql`.

2) Add environment variables

Create a file `.env.local` in the project root with:

VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_public_key

3) Run locally

npm run dev

The app will attempt to use Supabase if `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set.

Notes:
- This setup uses the public (anon) key from Supabase client SDK. For secure server-side operations use service role keys on a backend.
- Records are upserted by `id` on save, and the app keeps a localStorage fallback for offline use.
