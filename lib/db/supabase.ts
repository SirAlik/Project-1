'use client';

import { createBrowserClient } from '@supabase/ssr';

// الوصول الساكن المباشر — مطلوب لكي يُدرج Next.js bundler القيم وقت البناء
// process.env[name] الديناميكي لا يعمل في client bundles
function requirePublicEnv(name: string, value: string | undefined): string {
    if (!value) throw new Error(`Missing required environment variable: ${name}`);
    return value;
}

const SUPABASE_URL = requirePublicEnv(
    'NEXT_PUBLIC_SUPABASE_URL',
    process.env.NEXT_PUBLIC_SUPABASE_URL,
);
const SUPABASE_ANON_KEY = requirePublicEnv(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

// عميل Supabase الموحّد للمتصفح — يُستخدم في Client Components
export const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
