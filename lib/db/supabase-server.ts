import { createServerClient as createSSRClient } from '@supabase/ssr';
import { type SupabaseClient, type User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// عناوين بديلة تمنع التعطل عند غياب بيانات البيئة
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL    ?? 'https://placeholder.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key';

/**
 * Creates a Standard User Client (Subject to RLS).
 * Use this for 99% of data fetching and mutations.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
    const cookieStore = await cookies();

    return createSSRClient(
        SUPABASE_URL,
        SUPABASE_KEY,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options);
                        });
                    } catch {
                        // Silent no-op in read-only contexts (Server Components during render).
                    }
                },
            },
        }
    );
}

/**
 * STRICT Identity Verification Helper
 * Enforces presence of `app_metadata` before returning user.
 */
export async function getPrivateUser(supabase: SupabaseClient): Promise<User | null> {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return null;
    }

    // Security Check: Ensure app_metadata exists
    if (!user.app_metadata) {
        console.error('[Identity] Critical: User missing app_metadata', user.id);
        return null;
    }

    return user;
}

/**
 * ⛔ UNSAFE SERVICE ROLE CLIENT
 * ----------------------------
 * Only use in Background Jobs, Cron, or Webhooks.
 * NEVER use in User Request Path (Page/Layout/Action).
 */
export function getServiceRoleClient_UNSAFE(): never {
    throw new Error('Service Role is BANNED in user-request paths. Use strict user client via createSupabaseServerClient().');
}
