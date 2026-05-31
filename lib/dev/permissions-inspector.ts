/**
 * Permissions Inspector - DEV ONLY
 * =================================
 * Captures and explains authorization decisions for debugging.
 * 
 * SECURITY: This module is DEV-ONLY and tree-shaken in production.
 * No PII is logged - only role/action metadata.
 */

import type { RouteMetadata } from '@/lib/routes';

// ============================================================
// TYPES
// ============================================================

export interface AuthDecision {
    traceId: string;
    timestamp: number;
    actionName: string;
    decision: 'allowed' | 'denied';
    required: {
        roles: string[];
        schoolContext: boolean;
    };
    effective: {
        role: string;
        schoolId: string | null;
    };
    evidence: {
        roleMatched: boolean;
        scopeMatched: boolean;
        grantingRole: string | null;
        scopeType: 'global' | 'school' | 'none';
        missing: string[];
    };
    durationMs?: number;
}

export interface DbOperation {
    traceId: string;
    timestamp: number;
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    resource: string;
    filters: Record<string, string>;
    selectFields: string[];
    payloadSize: number;
    payloadKeys: string[];
    responseStatus: number;
    latencyMs: number;
    sqlLike: string;
}

export interface TraceEntry {
    traceId: string;
    type: 'auth' | 'db' | 'roleSwitch';
    timestamp: number;
    data: AuthDecision | DbOperation | RoleSwitchTrace;
}

export interface RoleSwitchTrace {
    traceId: string;
    timestamp: number;
    fromRole: string;
    toRole: string;
    toSchoolId: string | null;
    result: 'success' | 'failed';
    error?: string;
    validationErrors?: Record<string, string[]>;
    redirectPath?: string;
    durationMs: number;
}

export interface RouteVisibilityExplanation {
    path: string;
    visible: boolean;
    grantedBy: string | null;
    reason: string;
    requiredRoles: string[];
    userRole: string;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Generates a unique trace ID for correlation.
 */
export function generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Captures an authorization decision (dev-only).
 */
export function captureAuthDecision(decision: Omit<AuthDecision, 'traceId' | 'timestamp'>): AuthDecision {
    const entry: AuthDecision = {
        ...decision,
        traceId: generateTraceId(),
        timestamp: Date.now(),
    };

    // Store in inspector (imported dynamically to avoid circular deps)
    if (typeof window !== 'undefined') {
        import('./inspector-store').then(({ addTrace }) => {
            addTrace({ traceId: entry.traceId, type: 'auth', timestamp: entry.timestamp, data: entry });
        });
    }

    return entry;
}

/**
 * Captures a database operation trace (dev-only).
 */
export function captureDbOperation(operation: Omit<DbOperation, 'traceId' | 'timestamp'>): DbOperation {
    const entry: DbOperation = {
        ...operation,
        traceId: generateTraceId(),
        timestamp: Date.now(),
    };

    if (typeof window !== 'undefined') {
        import('./inspector-store').then(({ addTrace }) => {
            addTrace({ traceId: entry.traceId, type: 'db', timestamp: entry.timestamp, data: entry });
        });
    }

    return entry;
}

/**
 * Captures a role switch trace (dev-only).
 */
export function captureRoleSwitchTrace(trace: Omit<RoleSwitchTrace, 'traceId' | 'timestamp'>): RoleSwitchTrace {
    const entry: RoleSwitchTrace = {
        ...trace,
        traceId: generateTraceId(),
        timestamp: Date.now(),
    };

    if (typeof window !== 'undefined') {
        import('./inspector-store').then(({ addTrace }) => {
            addTrace({ traceId: entry.traceId, type: 'roleSwitch', timestamp: entry.timestamp, data: entry });
        });
    }

    return entry;
}

/**
 * Explains why a route is visible or hidden for a user role.
 */
export function explainRouteVisibility(
    route: RouteMetadata,
    userRole: string
): RouteVisibilityExplanation {
    const isSystemOwner = userRole === 'system_owner';
    const roleMatched = route.roles.includes(userRole);
    const visible = isSystemOwner || roleMatched;

    let grantedBy: string | null = null;
    let reason: string;

    if (visible) {
        if (isSystemOwner && !roleMatched) {
            grantedBy = 'system_owner';
            reason = 'System Owner has access to all routes';
        } else {
            grantedBy = userRole;
            reason = `Role "${userRole}" is in allowed roles list`;
        }
    } else {
        reason = `Role "${userRole}" not in [${route.roles.join(', ')}]`;
    }

    return {
        path: route.path,
        visible,
        grantedBy,
        reason,
        requiredRoles: route.roles,
        userRole,
    };
}

/**
 * Generates a SQL-like summary from a DB operation (approximation).
 */
export function generateSqlLikeSummary(
    method: string,
    resource: string,
    filters: Record<string, string>,
    selectFields: string[]
): string {
    const select = selectFields.length > 0 ? selectFields.join(', ') : '*';
    const where = Object.entries(filters)
        .map(([k, v]) => `${k} = '${v}'`)
        .join(' AND ');

    switch (method) {
        case 'GET':
            return `SELECT ${select} FROM ${resource}${where ? ` WHERE ${where}` : ''}`;
        case 'POST':
            return `INSERT INTO ${resource} (...)`;
        case 'PATCH':
            return `UPDATE ${resource} SET (...)${where ? ` WHERE ${where}` : ''}`;
        case 'DELETE':
            return `DELETE FROM ${resource}${where ? ` WHERE ${where}` : ''}`;
        default:
            return `${method} ${resource}`;
    }
}

/**
 * Redacts sensitive values from an object (keys only, values masked).
 */
export function redactPayload(payload: Record<string, unknown>): string[] {
    const sensitiveKeys = ['password', 'token', 'secret', 'otp', 'code', 'phone', 'email'];
    return Object.keys(payload).map(key => {
        if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
            return `${key}: [REDACTED]`;
        }
        return key;
    });
}
