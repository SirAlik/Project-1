/**
 * Rate Limiter & Idempotency Utilities
 * =====================================
 * Server-side utilities for preventing abuse and duplicate submissions.
 */

'use server';

import { supabaseAdmin } from './db/supabase-admin';
import { getActivePersona } from './auth/context-service';

// ============================================================
// TYPES
// ============================================================

export interface RateLimitConfig {
    /** Maximum attempts allowed in the time window */
    maxAttempts: number;
    /** Time window in minutes */
    windowMinutes: number;
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: Date;
}

// ============================================================
// DEFAULT RATE LIMITS
// ============================================================

const RATE_LIMITS: Record<string, RateLimitConfig> = {
    'bulk_import': { maxAttempts: 5, windowMinutes: 60 },
    'create_user': { maxAttempts: 20, windowMinutes: 60 },
    'send_notification': { maxAttempts: 100, windowMinutes: 60 },
    'generate_certificate': { maxAttempts: 50, windowMinutes: 60 },
    'export_report': { maxAttempts: 10, windowMinutes: 60 },
    'default': { maxAttempts: 100, windowMinutes: 60 },
};

// ============================================================
// RATE LIMITER
// ============================================================

/**
 * Checks if an action is rate limited for the current user.
 * 
 * @param actionType - The type of action being performed
 * @param config - Optional custom rate limit configuration
 * @returns Whether the action is allowed and remaining attempts
 */
export async function checkRateLimit(
    actionType: string,
    config?: RateLimitConfig
): Promise<RateLimitResult> {
    const persona = await getActivePersona();

    if (!persona) {
        return { allowed: false, remaining: 0, resetAt: new Date() };
    }

    const userId = persona.userId;
    const { maxAttempts, windowMinutes } = config || RATE_LIMITS[actionType] || RATE_LIMITS['default'];

    // Calculate window boundaries
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);
    const resetAt = new Date(now.getTime() + windowMinutes * 60 * 1000);

    try {
        // Count attempts in the current window
        const { data, error } = await supabaseAdmin
            .from('rate_limit_tracker')
            .select('attempt_count')
            .eq('user_id', userId)
            .eq('action_type', actionType)
            .gte('window_start', windowStart.toISOString())
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            console.error('[checkRateLimit] Error:', error);
            // Fail open - allow the action if rate limiting fails
            return { allowed: true, remaining: maxAttempts, resetAt };
        }

        const currentCount = data?.attempt_count || 0;
        const allowed = currentCount < maxAttempts;
        const remaining = Math.max(0, maxAttempts - currentCount - 1);

        if (allowed) {
            // Increment the attempt count
            await incrementRateLimit(userId, actionType, now);
        }

        return { allowed, remaining, resetAt };
    } catch (error) {
        console.error('[checkRateLimit] Unexpected error:', error);
        // Fail open
        return { allowed: true, remaining: maxAttempts, resetAt };
    }
}

/**
 * Increments the rate limit counter for a user/action.
 */
async function incrementRateLimit(
    userId: string,
    actionType: string,
    windowStart: Date
): Promise<void> {
    try {
        // Upsert the rate limit entry
        await supabaseAdmin
            .from('rate_limit_tracker')
            .upsert(
                {
                    user_id: userId,
                    action_type: actionType,
                    window_start: windowStart.toISOString(),
                    attempt_count: 1,
                },
                {
                    onConflict: 'user_id,action_type,window_start',
                }
            );

        // Also update the count if the entry exists
        await supabaseAdmin
            .rpc('increment_rate_limit', {
                p_user_id: userId,
                p_action_type: actionType,
            });
    } catch (error) {
        // Non-critical - log and continue
        console.error('[incrementRateLimit] Error:', error);
    }
}

// ============================================================
// IDEMPOTENCY
// ============================================================

/**
 * Checks if an idempotency key has been used.
 * 
 * @param key - The idempotency key
 * @returns Whether a result exists for this key, and the result if so
 */
export async function checkIdempotencyKey(
    key: string
): Promise<{ exists: boolean; result?: unknown }> {
    const persona = await getActivePersona();

    if (!persona) {
        return { exists: false };
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('action_audit_log')
            .select('input_data, result')
            .eq('idempotency_key', key)
            .eq('user_id', persona.userId)
            .eq('result', 'success')
            .single();

        if (error || !data) {
            return { exists: false };
        }

        return { exists: true, result: data.input_data };
    } catch (error) {
        console.error('[checkIdempotencyKey] Error:', error);
        return { exists: false };
    }
}

/**
 * Generates a unique idempotency key from action parameters.
 * 
 * @param action - The action name
 * @param input - The input data
 * @returns A deterministic key based on the input
 */
export async function generateIdempotencyKey(
    action: string,
    input: Record<string, unknown>
): Promise<string> {
    const sortedInput = JSON.stringify(input, Object.keys(input).sort());
    // Simple hash - for production, use a proper hashing algorithm
    let hash = 0;
    for (let i = 0; i < sortedInput.length; i++) {
        const char = sortedInput.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `${action}_${Math.abs(hash).toString(36)}`;
}

// ============================================================
// UTILITY FUNCTION FOR SAFE ACTION INTEGRATION
// ============================================================

/**
 * Wraps an action with rate limiting.
 * Used as a helper for createSafeAction.
 */
export async function withRateLimit<T>(
    actionType: string,
    fn: () => Promise<T>
): Promise<T | { error: string; retryAfter: Date }> {
    const { allowed, resetAt } = await checkRateLimit(actionType);

    if (!allowed) {
        return {
            error: `تم تجاوز الحد المسموح. يرجى المحاولة بعد ${resetAt.toLocaleTimeString('ar-SA')}`,
            retryAfter: resetAt,
        };
    }

    return fn();
}
