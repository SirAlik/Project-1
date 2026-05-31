/**
 * Switch Persona Contract
 * ========================
 * Shared types between client and server for role switching.
 * Changes here will cause TypeScript build failures if either side is out of sync.
 * 
 * @module lib/contracts/switch-persona-contract
 */

import { z } from 'zod';

// ============================================================
// VALID ROLES (Single Source of Truth)
// ============================================================

export const VALID_ROLES = [
    'system_owner',
    'school_admin',
    'school_principal',
    'school_affairs_vp',
    'academic_vp',
    'student_affairs_vp',
    'teacher',
    'student',
    'parent',
    'school_secretary',
    'student_counselor',
    'health_coordinator',
    'lab_technician',
    'school_librarian',
    'activity_leader',
    'quality_coordinator',
] as const;

export type ValidRole = typeof VALID_ROLES[number];

// ============================================================
// PREPROCESSING HELPERS
// ============================================================

/**
 * Normalizes schoolId: converts null/""/false/"null"/"undefined" to undefined
 */
function normalizeSchoolId(val: unknown): string | undefined {
    if (val === null || val === undefined) return undefined;
    if (typeof val !== 'string') return undefined;
    const trimmed = val.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
        return undefined;
    }
    return trimmed;
}

/**
 * UUID v4 regex pattern
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ============================================================
// SCHEMA (Single Source of Truth with Preprocessing)
// ============================================================

export const switchPersonaSchema = z.object({
    /** Role must be a valid role from the whitelist */
    role: z.preprocess(
        (val) => typeof val === 'string' ? val.trim() : val,
        z.string().min(1, 'Role is required').refine(
            (val) => VALID_ROLES.includes(val as ValidRole),
            { message: 'Invalid role' }
        )
    ),

    /** SchoolId: preprocessed to convert toxic values to undefined, then validated as UUID if present */
    schoolId: z.preprocess(
        normalizeSchoolId,
        z.string().regex(UUID_REGEX, 'Invalid school ID format').optional()
    ),

    /** DEV-ONLY: Correlation ID for request tracing */
    correlationId: z.string().optional(),
});

// ============================================================
// TYPES (Inferred from Schema)
// ============================================================

export type SwitchPersonaInput = z.infer<typeof switchPersonaSchema>;

/**
 * Direct server action result (NOT wrapped by safe-action library).
 * The switchPersonaAction returns this type directly.
 */
export interface SwitchPersonaResult {
    success: boolean;
    redirectPath?: string;
    error?: string;
    /** Field-level validation errors (dev diagnostics) */
    validationErrors?: Record<string, string[]>;
    /** DEV-ONLY: Echo back correlation ID for request matching */
    correlationId?: string;
}
