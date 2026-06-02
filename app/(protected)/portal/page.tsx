import { PortalClientGate } from "./_components/PortalClientGate";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";

/**
 * PortalPage - Server Component Shell
 *
 * Zero-auth pattern:
 * - Does NOT call getUser() or redirect to /login
 * - Auth gating happens client-side in PortalClientGate
 * - This eliminates the race condition between login and portal
 *
 * The Server Component only pre-fetches non-sensitive data (user name)
 * to improve UX when auth is already established.
 */
export default async function PortalPage() {
    // Optional: Pre-fetch display name for authenticated users
    // This is non-blocking and fails gracefully
    let serverUserName: string | undefined;

    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            const { data: profile } = await supabase
                .from("profiles")
                .select("full_name, name_ar")
                .eq("id", user.id)
                .single();

            serverUserName =
                profile?.name_ar ||
                profile?.full_name ||
                user.email?.split("@")[0];
        }
    } catch {
        // Silent fail - client will handle auth
    }

    return <PortalClientGate serverUserName={serverUserName} />;
}