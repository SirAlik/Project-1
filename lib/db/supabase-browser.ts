import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Singleton — يُنشأ مرة واحدة فقط في المتصفح
let client: SupabaseClient | undefined;

function requireEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

export function getSupabaseBrowserClient(): SupabaseClient {
    if (typeof window === "undefined") {
        throw new Error(
            "getSupabaseBrowserClient() مخصص للمتصفح فقط. لا تستدعِه على الخادم."
        );
    }

    if (!client) {
        client = createBrowserClient(
            requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
            requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
        );
    }

    return client;
}
