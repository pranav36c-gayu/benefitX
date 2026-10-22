# Benefit X React + Supabase

This is a Vite + React front end. It uses Supabase Auth (email/password), remembers sessions through the Supabase client, separates student and citizen dashboards, and reads/writes scheme tracker records.

## 1. Add your Supabase settings

1. Copy `.env.example` to `.env.local`.
2. Add your Supabase project URL and **publishable/anon key**:
   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
   ```
3. Never put a Supabase `service_role` or secret key in a browser app.
4. Restart the dev server after changing `.env.local`.

## 2. Install and run

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Create production assets using `npm run build`; Vite writes them to `dist/`.

## 3. Database schema expected by this front end

The project expects `schemes` with these columns:
- `id` (text or UUID primary key)
- `title`, `description`, `category`, `eligibility`, `benefits`, `official_url`, `created_at`
- optional `provider` and `tag` columns used for display

`category` must use `scholarship` for student items and `government_scheme` for citizen items. If your existing `schemes` table does not have `provider` or `tag`, add them or remove those references from the UI.

The tracker expects:
- `applications.id`
- `applications.user_id` referencing `auth.users.id`
- `applications.scheme_id` referencing `schemes.id`
- `applications.status`, `applications.notes`, `applications.created_at`
- a unique constraint on `(user_id, scheme_id)` is recommended.

The profile table used to choose a role:
```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('student','citizen')),
  full_name text,
  state text default 'Maharashtra',
  education_level text default 'Undergraduate',
  category text,
  annual_income text,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
on public.profiles for select to authenticated
using (auth.uid() = id);

create policy "Users can insert their own profile"
on public.profiles for insert to authenticated
with check (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
```

**Role security note:** this demo expects a trusted administrator to assign `profiles.role`. The signup screen's Student/Citizen choice is a UI preference, not trusted authorization. Do not let public users self-assign privileged roles. For this app both roles are ordinary user experiences; if you later add admin-only features, implement admin authorization using a protected database role/claim and RLS policies.

### Applications RLS

If your current table uses these columns, these policies let each signed-in user manage only their own tracker rows:

```sql
alter table public.applications enable row level security;

create policy "Users read own applications"
on public.applications for select to authenticated
using (auth.uid() = user_id);

create policy "Users add own applications"
on public.applications for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users update own applications"
on public.applications for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users delete own applications"
on public.applications for delete to authenticated
using (auth.uid() = user_id);
```

Before running policy SQL, check existing policy names in Supabase to avoid duplicate-policy errors. Do not disable RLS for convenience.

## 4. Assigning a role

A profile row should be created for each auth user. For a simple project, a trusted admin can set role in Supabase SQL Editor by using the actual user's UUID:

```sql
insert into public.profiles (id, role)
values ('REPLACE_WITH_AUTH_USER_UUID', 'student')
on conflict (id) do update set role = excluded.role;
```

Use `citizen` for the citizen role. Do not ask a user to type their role into a privileged admin control. In production, create profiles with a secure trigger or a trusted server-side process, and define who is allowed to change a role.

## 5. Auth settings and deploy

- In Supabase Authentication settings, enable Email/Password as desired.
- If email confirmation is enabled, users must confirm their email before signing in.
- Add your local URL (for example `http://localhost:5173`) and deployed URL (for example `https://benefitx.vercel.app`) to Supabase Auth URL Configuration / allowed redirect URLs.
- Push this folder to GitHub. In Vercel, import the repository, set framework preset to **Vite**, set the build command to `npm run build`, output directory `dist`, and add both environment variables from `.env.local` in Project Settings → Environment Variables. Redeploy after setting them.

## 6. Important data notes

- The built-in demo opportunities are display-only fallbacks when no matching rows are returned. They use official discovery portals and do not guarantee current eligibility or award amounts.
- To track a database scheme, that scheme must exist in `public.schemes`; demo fallback IDs are not database records and cannot be inserted into `applications` if `scheme_id` has a foreign key. Insert real scheme records first, then track them.
- This UI assumes the `applications` relation to `schemes` can be selected as `schemes(...)`. If your foreign key relationship or column names differ, adjust the query in `src/main.jsx`.
- The app does not use Clerk. All sign-in, session refresh, and sign-out are handled by Supabase Auth.
