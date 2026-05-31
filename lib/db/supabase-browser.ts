import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createMockClient, DEMO_DATA } from "@/lib/mock-data";

let client: SupabaseClient | undefined;

export function getSupabaseBrowserClient(): SupabaseClient {
    if (typeof window === "undefined") {
        throw new Error(
            "getSupabaseBrowserClient() is strictly for browser usage. Do not call this on the server."
        );
    }

    if (!client) {
        client = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
            ? (createMockClient(DEMO_DATA) as unknown as SupabaseClient)
            : createBrowserClient(
                  process.env.NEXT_PUBLIC_SUPABASE_URL    ?? 'https://placeholder.supabase.co',
                  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key',
              );
    }

    return client;
}
