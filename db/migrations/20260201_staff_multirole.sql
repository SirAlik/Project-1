-- =============================================
-- Migration: Staff Multi-Role Support
-- Description: Adds user_roles table for supporting multiple roles per user.
-- =============================================
-- 1. Create user_roles table
create table if not exists user_roles (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references profiles(id) on delete cascade,
    role text not null,
    -- Storing as text to allow flexibility, or use user_role enum cast
    school_id uuid references schools(id) on delete cascade,
    created_at timestamptz default now(),
    unique(user_id, role, school_id) -- Prevent duplicate roles for same user in same school
);
-- 2. Enable RLS
alter table user_roles enable row level security;
-- 3. RLS Policies
-- Admin View All
create policy "Admin View All User Roles" on user_roles for
select to authenticated using (
        exists (
            select 1
            from profiles
            where id = auth.uid()
                and role = 'admin'
        )
    );
-- Principal/System Coordinator View School Roles
create policy "Principal View School User Roles" on user_roles for
select to authenticated using (
        school_id = (
            select school_id
            from profiles
            where id = auth.uid()
        )
    );
-- 4. Index for performance
create index if not exists idx_user_roles_user_id on user_roles(user_id);
create index if not exists idx_user_roles_school_id on user_roles(school_id);