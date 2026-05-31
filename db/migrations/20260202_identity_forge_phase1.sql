begin;
-- 1) Extend Profiles Table
alter table profiles
add column if not exists mobile_number text unique,
    add column if not exists is_onboarded boolean default false,
    add column if not exists job_title text;
create index if not exists idx_profiles_mobile on profiles(mobile_number);
-- 2) Create Invites Table
create table if not exists invites (
    id uuid default uuid_generate_v4() primary key,
    token text unique not null,
    mobile_number text not null,
    email text,
    full_name text not null,
    target_role user_role not null,
    target_school_id uuid references schools(id),
    created_at timestamptz default now(),
    expires_at timestamptz not null,
    used_at timestamptz,
    created_by uuid references profiles(id)
);
-- ✅ Active invite uniqueness WITHOUT now() (IMMUTABLE-safe)
create unique index if not exists uq_active_invite_mobile_school on invites (mobile_number, target_school_id)
where used_at is null;
create index if not exists idx_invites_token on invites(token);
create index if not exists idx_invites_mobile on invites(mobile_number);
-- 3) RLS
alter table invites enable row level security;
drop policy if exists "Admins View School Invites" on invites;
drop policy if exists "Admins Create Invites" on invites;
create policy "Admins View School Invites" on invites for
select to authenticated using (
        target_school_id in (
            select school_id
            from profiles
            where id = auth.uid()
        )
        or (
            select role
            from profiles
            where id = auth.uid()
        ) = 'admin'
    );
create policy "Admins Create Invites" on invites for
insert to authenticated with check (
        target_school_id in (
            select school_id
            from profiles
            where id = auth.uid()
        )
        or (
            select role
            from profiles
            where id = auth.uid()
        ) = 'admin'
    );
commit;