"use server";

import { setActivePersona } from "@/lib/auth/context-service";
import { logPersonaSwitch } from "@/lib/services/audit-service";
import { Persona } from "@/components/portal/RoleCard";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";

/**
 * Minimal persona identifier for activation.
 * Server will verify ownership before setting cookie.
 */
interface PersonaIdentifier {
    role: string;
    schoolId?: string;
}

interface ActionResult {
    success: boolean;
    error?: string;
}

/**
 * UUID v4 regex pattern
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Normalizes school_id for consistent comparison.
 * Converts empty strings to null to match database normalization.
 * Validates UUID format; returns null for invalid values.
 */
function normalizeSchoolId(schoolId: string | undefined | null): string | null {
    if (!schoolId || schoolId.trim() === '') {
        return null;
    }
    const trimmed = schoolId.trim();
    if (!UUID_REGEX.test(trimmed)) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn('[activatePersonaAction] Invalid schoolId format:', trimmed);
        }
        return null;
    }
    return trimmed;
}

/**
 * Activates a persona for the current user.
 * 
 * Security:
 * - Verifies the user owns a persona with the given role + schoolId.
 * - Only sets cookie after verification.
 * - Returns structured result for client error handling.
 * 
 * Data Consistency:
 * - Normalizes school_id (empty string → null) to prevent false mismatches.
 */
export async function activatePersonaAction(persona: PersonaIdentifier): Promise<ActionResult> {
    const supabase = await createSupabaseServerClient();

    // 1. Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: "Unauthorized. Please sign in again." };
    }

    // 2. Normalize school_id for consistent comparison
    const normalizedSchoolId = normalizeSchoolId(persona.schoolId);

    // 3. Verify user owns this persona
    let query = supabase
        .from('user_personas')
        .select('role, school_id')
        .eq('user_id', user.id)
        .eq('role', persona.role);

    // Handle school_id: match exact value or null
    if (normalizedSchoolId) {
        query = query.eq('school_id', normalizedSchoolId);
    } else {
        query = query.is('school_id', null);
    }

    const { data: matchingPersonas, error: verifyError } = await query;

    if (verifyError) {
        // Server-only logging for debugging
        if (process.env.NODE_ENV !== 'production') {
            console.error("[activatePersonaAction] Verification query failed:", verifyError);
        }
        return { success: false, error: "Failed to verify persona." };
    }

    if (!matchingPersonas || matchingPersonas.length === 0) {
        // Server-only logging for debugging
        if (process.env.NODE_ENV !== 'production') {
            console.warn("[activatePersonaAction] Persona not found:", { userId: user.id, role: persona.role, schoolId: normalizedSchoolId });
        }
        return { success: false, error: "Persona not found. Access denied." };
    }

    // 4. Set the persona cookie (verified ownership)
    try {
        await setActivePersona({
            userId: user.id,
            role: persona.role,
            schoolId: normalizedSchoolId ?? undefined,
            timestamp: Date.now()
        });
    } catch (cookieError) {
        if (process.env.NODE_ENV !== 'production') {
            console.error("[activatePersonaAction] Failed to set cookie:", cookieError);
        }
        return { success: false, error: "Failed to activate session." };
    }

    // 5. Audit log (fire-and-forget, silent failures)
    // Do not await, do not produce noise in production
    Promise.resolve().then(async () => {
        try {
            await logPersonaSwitch(user.id, persona.role, normalizedSchoolId ?? undefined);
        } catch {
            // Silent failure - audit log is non-critical
            // Server-only debug logging if needed
            if (process.env.NODE_ENV === 'development') {
                console.debug("[activatePersonaAction] Audit log skipped");
            }
        }
    });

    return { success: true };
}

/**
 * Legacy action for multi-persona selection (PortalClient).
 * Accepts full Persona object for backward compatibility.
 */
export async function selectPersonaAction(persona: Persona): Promise<ActionResult> {
    return activatePersonaAction({
        role: persona.role,
        schoolId: persona.schoolId
    });
}
