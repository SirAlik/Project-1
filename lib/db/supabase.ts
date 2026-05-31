'use client';

import { createBrowserClient } from '@supabase/ssr';

// عميل Supabase الموحّد للمتصفح — يُستخدم في Client Components
export const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL    ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key',
);
