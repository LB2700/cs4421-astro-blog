# Wind Ups profiles and posts schema

**Status:** Initial proposal for review  
**Database:** Supabase Postgres  
**Scope:** `profiles` and public `posts` only. Votes, uploads, moderation, and profile privacy are not included.

This document is intended as a reference while configuring the database in the Supabase Dashboard.

## Design decisions

- Supabase Auth owns credentials, email addresses, and authentication sessions. `public.profiles` stores only Wind Ups application profile data.
- A profile has the same UUID as its Auth user. A database trigger creates an initially minimal profile when an Auth user is created.
- Profiles are publicly readable, but users can update only their own profile fields.
- Posts are public. Signed-in users can create posts as themselves and edit or delete only their own posts.
- Deleting an Auth user deletes their profile and preserves their posts with `author_id` set to `NULL`.
- Unique usernames are required on sign up
- Email, password, and private authentication data must not be copied into the public profiles table.

## Entity relationship

```text
auth.users (Supabase-managed)
    1
    |
    | id -> profiles.id (ON DELETE CASCADE)
    1
public.profiles
    1
    |
    | profiles.id <- posts.author_id (ON DELETE SET NULL)
    many
public.posts
```

## Table: `public.profiles`

One application profile per Supabase Auth user. `id` is the Auth user's UUID; the table does not duplicate authentication credentials.

| Column | Type | Required | Default / constraint | Purpose |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | Yes | Primary key; references `auth.users(id)` with `ON DELETE CASCADE` | Identity link to the Supabase Auth user |
| `username` | `text` | Yes | 3–24 lowercase letters, digits, or underscores; unique without case sensitivity | Public handle |
| `display_name` | `text` | No | If set, 1–50 characters | Name shown in the UI |
| `bio` | `text` | No | If set, at most 280 characters | Short public biography |
| `avatar_path` | `text` | No | No default | Object path/key for a future avatar in Storage |
| `created_at` | `timestamptz` | Yes | `now()` | Profile creation time |
| `updated_at` | `timestamptz` | Yes | `now()` | Last profile update time |

`updated_at` is maintained by a database trigger. The public-read policy means every column in this table is public; keep private data such as email out of it.

## Table: `public.posts`

One user-authored public discussion post.

| Column | Type | Required | Default / constraint | Purpose |
| --- | --- | --- | --- | --- |
| `id` | `bigint` identity | Yes | Generated primary key | Stable post identifier |
| `author_id` | `uuid` | No | Defaults to `auth.uid()`; references `profiles(id)` with `ON DELETE SET NULL` | Post owner; becomes `NULL` if the Auth user/profile is deleted |
| `title` | `text` | Yes | 1–200 characters | Public post title |
| `body` | `text` | Yes | Non-empty | Public post content |
| `created_at` | `timestamptz` | Yes | `now()` | Post creation time |
| `updated_at` | `timestamptz` | Yes | `now()`; refreshed by a database trigger on update | Last post update time |

## SQL for Supabase SQL Editor

Run these sections in order in a development Supabase project. Review the script before executing it. The `CREATE TABLE` statements intentionally fail if these tables already exist; compare any existing schema and create a deliberate migration rather than assuming this setup script reconciles drift.

### 1. Create the profiles table and update timestamp trigger

```sql
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  display_name text,
  bio text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (
    username is null or username ~ '^[a-z0-9_]{3,24}$'
  ),
  constraint profiles_display_name_length check (
    display_name is null or char_length(btrim(display_name)) between 1 and 50
  ),
  constraint profiles_bio_length check (
    bio is null or char_length(bio) <= 280
  )
);

create unique index profiles_username_unique
  on public.profiles (lower(username))
  where username is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();
```

The username check requires lowercase input. The unique index is case-insensitive as an additional safeguard. The application should normalize usernames to lowercase and report uniqueness conflicts clearly.

### 2. Create the posts table and its author index

```sql
create table public.posts (
  id bigint generated always as identity primary key,
  author_id uuid default auth.uid()
    references public.profiles (id) on delete set null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_title_length check (
    char_length(btrim(title)) between 1 and 200
  ),
  constraint posts_body_not_empty check (
    char_length(btrim(body)) > 0
  )
);

create index posts_author_created_at_idx
  on public.posts (author_id, created_at desc);

create trigger posts_set_updated_at
before update on public.posts
for each row execute function public.set_updated_at();
```

The `author_id` default lets an authenticated insert identify its author from the request JWT. The insert policy below still checks that the resulting value belongs to the signed-in user. Posts inserted without an authenticated Supabase user have a null author and are rejected by that policy. The timestamp trigger uses the `public.set_updated_at()` function created in step 1, and updates `updated_at` automatically without allowing clients to set it directly.

### 3. Enable RLS and set table privileges

Privileges and RLS policies are separate controls: a policy does not grant a role permission to access a table. These grants intentionally permit public reads, authenticated profile edits, and authenticated post creation/editing/deletion. They do not grant anonymous write access.

```sql
alter table public.profiles enable row level security;
alter table public.posts enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.posts from anon, authenticated;

grant select on table public.profiles to anon, authenticated;
grant update (username, display_name, bio, avatar_path)
  on table public.profiles to authenticated;

grant select on table public.posts to anon, authenticated;
grant insert (title, body) on table public.posts to authenticated;
grant update (title, body) on table public.posts to authenticated;
grant delete on table public.posts to authenticated;
```

The grants deliberately do not allow clients to insert or delete profiles, change a profile ID, assign a post to another author, or edit a post's author and creation time. Supabase's `service_role` is privileged and bypasses RLS; use it only in trusted server-side code and never expose it to browsers.

### 4. Add RLS policies

```sql
create policy "Profiles are publicly readable"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Posts are publicly readable"
  on public.posts
  for select
  to anon, authenticated
  using (true);

create policy "Users can create posts as themselves"
  on public.posts
  for insert
  to authenticated
  with check ((select auth.uid()) = author_id);

create policy "Users can update their own posts"
  on public.posts
  for update
  to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

create policy "Users can delete their own posts"
  on public.posts
  for delete
  to authenticated
  using ((select auth.uid()) = author_id);
```

The profile update policy only allows the row owner, and the column-level grant restricts which profile columns may be changed. The post update policy checks ownership both before and after the update; column-level grants additionally prevent changing `author_id` or `created_at`.

### 5. Create a profile when Supabase Auth creates a user

This trigger inserts only the Auth user's UUID. A new user can complete their public profile later. Keeping this trigger minimal reduces signup failure risk and avoids trusting signup metadata for public profile fields.

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

insert into public.profiles (id)
select id
from auth.users
on conflict (id) do nothing;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

The function is `SECURITY DEFINER` so it can create a profile even though application roles have no profile-insert privilege. Its empty `search_path` and fully qualified table name avoid resolving objects from an untrusted schema. The backfill inserts profiles for Auth users that already existed before this trigger was installed. Test the trigger thoroughly: a failing Auth-user trigger can cause signups to fail.

If a trigger named `on_auth_user_created` already exists, inspect it before creating another. Do not drop an existing trigger without confirming its purpose. For a fresh project, this name is expected to be unused.

## Supabase Dashboard checklist

1. Use a development project first. Open **SQL Editor**, run the sections in order, and review any errors before proceeding.
2. Under **Authentication → URL Configuration**, set the site URL and allow-list the signup confirmation and password recovery redirect URLs used by the application.
3. Under **Authentication → Providers**, configure the sign-in methods and email confirmation behavior required by the app. These Auth settings are project configuration; they are not created by the table SQL above.
4. Do not add secrets, user credentials, or production data to the schema document or Git.
5. Before applying to production, capture the reviewed SQL as a migration in version control and apply the same schema through the migration workflow.

## Verification checklist

Test with real anonymous and authenticated sessions through the Supabase client/API, not only as the SQL Editor's privileged database role.

- Anonymous user can read public profile fields and posts.
- Anonymous user cannot insert, update, or delete profiles or posts.
- New Auth signup creates exactly one profile with matching `id`.
- Authenticated user can update their own profile, but cannot update another user's profile.
- A username outside the allowed format or a case-insensitive duplicate username is rejected.
- Authenticated user can insert a post and the default `author_id` is their own Auth UUID.
- Authenticated user can edit and delete their own posts, but not another user's posts.
- A post update cannot change its `author_id` or `created_at`.
- Deleting a test Auth user deletes that user's profile and leaves their posts with `author_id = NULL`.

## Later changes

Votes, tags, moderation, profile visibility controls, avatar bucket policies, post edit timestamps/history, and data-retention behavior are intentionally deferred. Add each as a reviewed schema change with its own constraints and RLS policies. Once this proposal is accepted, record changes in ordered SQL migrations; do not edit already-applied migrations to change schema history.

## References

- [Supabase user management and profile tables](https://supabase.com/docs/guides/auth/managing-user-data)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase password-based authentication](https://supabase.com/docs/guides/auth/passwords)
- [Supabase database migrations](https://supabase.com/docs/guides/local-development/database-migrations)
