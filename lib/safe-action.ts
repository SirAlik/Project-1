/**
 * Safe Action - The Immunity Layer (Hardened)
 * ===========================================
 * Centralized wrapper for all Server Actions providing:
 * - Zero-Trust Identity Verification (Supabase app_metadata)
 * - PBAC (Policy-Based Access Control)
 * - Idempotency (Transaction Reference)
 * - Audit Logging (Unified & Masked)
 * - Rate Limiting
 */

import { ZodType, ZodError } from 'zod';
import { headers } from 'next/headers';

import { getActivePersona } from './auth/context-service';
import { supabaseAdmin } from './db/supabase-admin';
import { checkRateLimit } from './rate-limiter';
import {
    hasPermission,
    Permission,
    AuthContext,
} from './auth/pbac';
import { UserRole } from './auth/roles';

export type { UserRole };

// ============================================================
// TYPES
// ============================================================

export interface ActionResult<T> {
    data?: T;
    serverError?: string;
    validationErrors?: Record<string, string[]>;
    /** Stable Transaction Reference (UUID) for tracking */
    transactionReference?: string;
    /** If true, result was returned from idempotency store */
    isReplay?: boolean;
}

export interface ActionContext {
    user: AuthContext;
    ipAddress: string | null;
    requestId: string;
}

interface AuditConfig {
    action: string;
    resource: string;
    maskFields?: string[];
}

export interface SafeActionConfig<TInput, TOutput> {
    /** Zod schema for input validation */
    schema: ZodType<TInput>;

    /** 
     * PBAC Permission requirements.
     * Use 'public' to bypass auth (Use with caution!)
     */
    requiredPermission?: Permission;

    /** Legacy Role Check (Prefer requiredPermission) */
    allowedRoles?: UserRole[] | 'all';

    /** Whether this action requires a school context */
    requiresSchoolContext?: boolean;

    /** The action handler function */
    handler: (input: TInput, ctx: ActionContext) => Promise<TOutput>;

    /** Optional audit log configuration */
    audit?: AuditConfig;

    /** Enable idempotency caching (TTL in seconds) */
    idempotencyTTL?: number;

    /** Rate Limiting Config */
    rateLimit?: {
        maxAttempts: number;
        windowMinutes: number;
        key?: string; // Custom key suffix
    };
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

async function getClientIP(): Promise<string | null> {
    try {
        const headersList = await headers();
        return (
            headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            headersList.get('x-real-ip') ||
            null
        );
    } catch {
        return null;
    }
}

function maskPII(data: Record<string, unknown>, fieldsToMask: string[]): Record<string, unknown> {
    const masked = { ...data };
    delete masked.password;
    delete masked.new_password;

    for (const field of fieldsToMask) {
        if (typeof masked[field] === 'string') {
            const value = masked[field] as string;
            if (value.length > 4) {
                masked[field] = `${value.slice(0, 2)}***${value.slice(-2)}`;
            }
        }
    }
    return masked;
}

function formatZodErrors(error: ZodError): Record<string, string[]> {
    const errors: Record<string, string[]> = {};

    for (const issue of error.issues) {
        const path = issue.path.join('.') || 'root';
        if (!errors[path]) {
            errors[path] = [];
        }
        errors[path].push(issue.message);
    }

    return errors;
}

// ============================================================
// IDEMPOTENCY ENGINE
// ============================================================

async function checkIdempotency<T>(
    key: string,
    userId: string
): Promise<{ exists: true; result: T; ref: string } | { exists: false }> {
    try {
        const { data } = await supabaseAdmin
            .from('action_idempotency')
            .select('result, transaction_ref') // Ensure table has transaction_ref
            .eq('idempotency_key', key)
            .eq('user_id', userId)
            .gt('expires_at', new Date().toISOString())
            .maybeSingle();

        if (data?.result) {
            return { exists: true, result: data.result as T, ref: data.transaction_ref };
        }
    } catch (e) {
        console.error('[safe-action] Idempotency check failed:', e);
    }
    return { exists: false };
}

// ============================================================
// SAFE ACTION FACTORY
// ============================================================

export function createSafeAction<TInput, TOutput>(
    config: SafeActionConfig<TInput, TOutput>
): (input: TInput, idempotencyKey?: string) => Promise<ActionResult<TOutput>> {

    return async (input: TInput, idempotencyKey?: string): Promise<ActionResult<TOutput>> => {
        const requestId = crypto.randomUUID();
        const ipAddress = await getClientIP();

        try {
            // 1. INPUT VALIDATION
            const parseResult = config.schema.safeParse(input);
            if (!parseResult.success) {
                return {
                    validationErrors: formatZodErrors(parseResult.error),
                    serverError: 'بيانات المدخلات غير صحيحة',
                };
            }
            const validatedInput = parseResult.data;

            // 2. AUTHENTICATION (Strict Context)
            const persona = await getActivePersona();

            // Allow public ONLY if explicitly configured
            // (Note: We default to SECURE by default)
            if (!persona) {
                return { serverError: 'يرجى تسجيل الدخول للمتابعة.' };
            }

            // Hydrate Strong AuthContext (Verified by context-service)
            const authContext: AuthContext = {
                userId: persona.userId,
                role: persona.role,
                schoolId: persona.schoolId,
                isSystemOwner: persona.isSystemOwner ?? false,
            };

            // 3. AUTHORIZATION (PBAC)
            if (config.requiredPermission) {
                // Determine scope based on School Context requirement
                const targetScope = config.requiresSchoolContext && persona.schoolId
                    ? { type: 'school', schoolId: persona.schoolId } as const
                    : undefined;

                if (!hasPermission(authContext, config.requiredPermission, targetScope)) {
                    console.warn(`[SafeAction] Access Denied: ${persona.userId} missing ${config.requiredPermission}`);
                    return { serverError: 'ليس لديك الصلاحيات الكافية لتنفيذ هذا الإجراء.' };
                }
            } else if (config.allowedRoles && config.allowedRoles !== 'all') {
                // Legacy Fallback
                if (!config.allowedRoles.includes(persona.role)) {
                    return { serverError: 'دورك الحالي لا يسمح بهذا الإجراء.' };
                }
            }

            // 4. TENANCY ENFORCEMENT
            if (config.requiresSchoolContext) {
                if (!persona.isSystemOwner && !persona.schoolId) {
                    return { serverError: 'يتطلب هذا الإجراء سياق مدرسة محدد.' };
                }

                // Input Injection Check (defense-in-depth)
                // If the input carries a school identifier — camelCase `schoolId` OR
                // snake_case `school_id` — a non-owner's value MUST match their
                // authenticated school context. (Catches snake_case fields that earlier
                // only inspected camelCase and could slip a cross-tenant value through.)
                const inputObj = validatedInput as Record<string, unknown>;
                const claimedSchoolId =
                    (typeof inputObj.schoolId === 'string' ? inputObj.schoolId : undefined) ??
                    (typeof inputObj.school_id === 'string' ? inputObj.school_id : undefined);
                if (claimedSchoolId && !persona.isSystemOwner && claimedSchoolId !== persona.schoolId) {
                    return { serverError: 'محاولة اختراق السياق المدرسي.' };
                }
            }

            // 5. RATE LIMITING
            if (config.rateLimit) {
                const limitKey = config.rateLimit.key || config.audit?.action || 'default';
                const limitResult = await checkRateLimit(limitKey, {
                    maxAttempts: config.rateLimit.maxAttempts,
                    windowMinutes: config.rateLimit.windowMinutes
                });

                if (!limitResult.allowed) {
                    return {
                        serverError: `تجاوزت الحد المسموح من المحاولات. حاول بعد ${Math.ceil((limitResult.resetAt.getTime() - Date.now()) / 60000)} دقيقة.`
                    };
                }
            }

            // 6. IDEMPOTENCY CHECK
            if (idempotencyKey && config.idempotencyTTL) {
                const cache = await checkIdempotency<TOutput>(idempotencyKey, persona.userId);
                if (cache.exists) {
                    return {
                        data: cache.result,
                        isReplay: true,
                        transactionReference: cache.ref
                    };
                }
            }

            // 7. EXECUTION
            const ctx: ActionContext = {
                user: authContext,
                ipAddress,
                requestId,
            };

            const result = await config.handler(validatedInput, ctx);

            // 8. AUDIT LOGGING & IDEMPOTENCY STORE
            const transactionRef = crypto.randomUUID();

            if (config.audit) {
                // Fire and forget audit (or await if critical)
                const auditPayload = config.audit.maskFields
                    ? maskPII(validatedInput as Record<string, unknown>, config.audit.maskFields)
                    : {};

                // Using supabaseAdmin here is SAFE because it's the wrapper, not user logic
                await supabaseAdmin.from('action_audit_log').insert({
                    action_name: `${config.audit.action}:${config.audit.resource}`,
                    user_id: persona.userId,
                    role: persona.role,
                    school_id: persona.schoolId,
                    status: 'success',
                    correlation_id: requestId,
                    transaction_ref: transactionRef, // Link audit to result
                    metadata: auditPayload
                });
            }

            if (idempotencyKey && config.idempotencyTTL) {
                await supabaseAdmin.from('action_idempotency').upsert({
                    idempotency_key: idempotencyKey,
                    user_id: persona.userId,
                    result: result,
                    transaction_ref: transactionRef,
                    expires_at: new Date(Date.now() + config.idempotencyTTL * 1000).toISOString()
                });
            }

            return {
                data: result,
                transactionReference: transactionRef,
                isReplay: false
            };

        } catch (error) {
            console.error('[SafeAction] Error:', error);
            const msg = error instanceof Error ? error.message : 'حدث خطأ في النظام';

            // Audit Failure
            if (config.audit) {
                const persona = await getActivePersona(); // Re-fetch safe?
                if (persona) {
                    await supabaseAdmin.from('action_audit_log').insert({
                        action_name: `${config.audit.action}:${config.audit.resource}`,
                        user_id: persona.userId,
                        role: persona.role,
                        school_id: persona.schoolId,
                        status: 'error',
                        correlation_id: requestId,
                        error_message: msg
                    });
                }
            }

            return { serverError: msg };
        }
    };
}


