-- =============================================
-- Migration: RBAC & Multi-Tenancy (School Scoping)
-- Description: Adds school_id, enables RLS, and sets up Principal vs Admin policies.
-- =============================================
-- 1. Create Schools Table (Optional but strict for foreign keys)
create table if not exists schools (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    created_at timestamptz default now()
);
-- Insert a default school if none exists (for migration safety)
insert into schools (id, name)
select '00000000-0000-0000-0000-000000000000',
    'Default School'
where not exists (
        select 1
        from schools
    );
-- 2. Update Profiles Table
alter table profiles
add column if not exists school_id uuid references schools(id) default '00000000-0000-0000-0000-000000000000';
-- 3. Update Classes Table
alter table classes
add column if not exists school_id uuid references schools(id) default '00000000-0000-0000-0000-000000000000';
-- 4. Enable RLS
alter table profiles enable row level security;
alter table classes enable row level security;
alter table student_profiles enable row level security;
alter table events enable row level security;
-- =============================================
-- 5. RLS POLICIES
-- =============================================
-- Helper Function: Check if user is System Owner
create or replace function public.is_admin() returns boolean as $$
select exists (
        select 1
        from profiles
        where id = auth.uid()
            and role = 'admin'
    );
$$ language sql security definer;
-- PROFILES Policies
-- Admin can view all profiles
create policy "Admin View All Profiles" on profiles for
select to authenticated using (is_admin());
-- Principals can view profiles in their school
create policy "Principal View School Profiles" on profiles for
select to authenticated using (
        school_id = (
            select school_id
            from profiles
            where id = auth.uid()
        )
    );
-- Users can view their own profile
create policy "View Own Profile" on profiles for
select to authenticated using (id = auth.uid());
-- CLASSES Policies
-- Admin view all
create policy "Admin View All Classes" on classes for
select to authenticated using (is_admin());
-- Principal view own school classes
create policy "Principal View School Classes" on classes for
select to authenticated using (
        school_id = (
            select school_id
            from profiles
            where id = auth.uid()
        )
    );
-- Teacher view own school classes (Assuming teachers are also scoped by school)
create policy "Teacher View School Classes" on classes for
select to authenticated using (
        school_id = (
            select school_id
            from profiles
            where id = auth.uid()
        )
    );
-- STUDENT PROFILES Policies (Updated to filter by Class -> School)
-- We need to ensure student_profiles joins properly with classes to check school_id, 
-- OR strictly rely on the fact that the USER (Principal) is querying.
create policy "Admin View All Students" on student_profiles for
select to authenticated using (is_admin());
create policy "Principal View School Students" on student_profiles for
select to authenticated using (
        exists (
            select 1
            from classes c
            where c.id = student_profiles.class_id
                and c.school_id = (
                    select school_id
                    from profiles
                    where id = auth.uid()
                )
        )
    );
-- =============================================
-- 6. Cleanup & Permissions
-- =============================================
grant all on schools to authenticated;
grant all on schools to service_role;