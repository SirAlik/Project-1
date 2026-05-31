-- Ensure the user_id in user_roles correctly references the profiles table
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
-- Notify PostgREST to reload the schema cache
NOTIFY pgrst,
'reload schema';