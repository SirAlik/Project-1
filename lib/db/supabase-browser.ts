import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// الوصول الساكن المباشر — مطلوب لكي يُدرج Next.js bundler القيم وقت البناء
// process.env[name] الديناميكي لا يعمل في client bundles
function requirePublicEnv(name: string, value: string | undefined): string {
    if (!value) throw new Error(`Missing required environment variable: ${name}`);
    return value;
}

const SUPABASE_URL = requirePublicEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
);
const SUPABASE_ANON_KEY = requirePublicEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

// Singleton — يُنشأ مرة واحدة فقط في المتصفح
let client: SupabaseClient | undefined;

export function getSupabaseBrowserClient(): SupabaseClient {
    if (typeof window === "undefined") {
        throw new Error(
            "getSupabaseBrowserClient() مخصص للمتصفح فقط. لا تستدعِه على الخادم."
        );
    }

    if (!client) {
        client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    return client;
}
