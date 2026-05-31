import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Singleton — يُنشأ مرة واحدة فقط في المتصفح
let client: SupabaseClient | undefined;

export function getSupabaseBrowserClient(): SupabaseClient {
    if (typeof window === "undefined") {
        throw new Error(
            "getSupabaseBrowserClient() مخصص للمتصفح فقط. لا تستدعِه على الخادم."
        );
    }

    if (!client) {
        client = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL    ?? 'https://placeholder.supabase.co',
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key',
        );
    }

    return client;
}
