/**
 * Policy-Based Access Control (PBAC) Registry
 * ===========================================
 * Centralized source of truth for:
 * 1. Permissions (Granular capabilities)
 * 2. Policies (Mapping Roles -> Permissions)
 * 3. Scopes (Tenancy & Hierarchy context)
 *
 * This replaces rigid DB Enums with a dynamic, code-first policy engine.
 */

import { UserRole } from './roles';

// ============================================================================
// 1. CORE TYPES & SCOPES
// ============================================================================

export type SchoolId = string; // UUID
export type UserId = string;   // UUID

/**
 * Access Scope defines "Where" a permission applies.
 * - Global: System-wide (System Owner)
 * - School: Specific School
 */
export type AccessScope =
    | { type: 'global' }
    | { type: 'school'; schoolId: SchoolId };

/**
 * Auth Context - The Hardened Identity Object
 * Retrieved strictly from Supabase app_metadata
 */
export interface AuthContext {
    userId: UserId;
    role: UserRole;
    schoolId?: SchoolId;
    isSystemOwner: boolean;
}


// ============================================================================
// 2. PERMISSION REGISTRY (Granular Capabilities)
// ============================================================================

export type Permission =
    // --- System Level ---
    | 'system.manage_tenants'
    | 'system.view_audit_logs'

    // --- School Administration ---
    | 'school.update_settings'
    | 'school.manage_staff'
    | 'school.view_analytics'

    // --- Student Affairs ---
    | 'students.create'
    | 'students.view_sensitive'
    | 'students.manage_attendance'

    // --- Finance / Ledger ---
    | 'ledger.manage_wallets'
    | 'ledger.transact'
    | 'ledger.view_balance'

    // --- Operations ---
    | 'school.bulk_upload';    // رفع بيانات جماعية (طلاب، موظفون، إلخ)

// ============================================================================
// 3. POLICY ASSIGNMENT (Role -> Permissions)
// ============================================================================

/**
 * Maps Canonical Roles to their exact Permissions.
 * This is the SINGLE SOURCE OF TRUTH for "Who can do What".
 */
const ROLE_POLICIES: Record<UserRole, Permission[]> = {
    // === GLOBAL ===
    'system_owner': [
        'system.manage_tenants',
        'system.view_audit_logs',
        'school.update_settings',
        'school.manage_staff',
        'school.view_analytics',
        'school.bulk_upload',
        'students.create',
        'students.view_sensitive',
        'students.manage_attendance',
        'ledger.manage_wallets',
        'ledger.transact',
        'ledger.view_balance'
    ],

    // === SCHOOL LEADERSHIP ===
    'school_admin': [
        'school.update_settings',
        'school.manage_staff',
        'school.view_analytics',
        'school.bulk_upload',
        'students.create',
        'students.view_sensitive',
        'students.manage_attendance',
        'ledger.manage_wallets',
        'ledger.transact',
        'ledger.view_balance'
    ],
    'school_principal': [
        'school.update_settings',
        'school.view_analytics',
        'school.bulk_upload',
        'students.view_sensitive',
        'students.manage_attendance',
        'ledger.view_balance'
    ],

    // === SCHOOL VPS ===
    'school_affairs_vp': [
        'school.view_analytics',
        'students.manage_attendance'
    ],
    'academic_vp': [
        'school.view_analytics',
        'students.view_sensitive'
    ],
    'student_affairs_vp': [
        'students.create',
        'students.view_sensitive',
        'students.manage_attendance',
        'ledger.view_balance'
    ],

    // === SPECIALISTS ===
    'school_librarian': [],
    'school_secretary': ['students.view_sensitive', 'school.bulk_upload'],
    'student_counselor': ['students.view_sensitive'],
    'health_coordinator': ['students.view_sensitive'],
    'lab_technician': [],
    'activity_leader': [],
    'quality_coordinator': ['school.view_analytics'],

    // === BASE USERS ===
    'teacher': ['students.manage_attendance'],
    'student': ['ledger.view_balance'],
    'parent': ['ledger.view_balance'],
};


// ============================================================================
// 4. POLICY ENGINE (Runtime Checks)
// ============================================================================

/**
 * Checks if a user has a specific permission.
 * AUTOMATICALLY enforces scope checks (System Owner allows all scopes).
 */
export function hasPermission(
    ctx: AuthContext,
    requiredPermission: Permission,
    targetScope?: AccessScope
): boolean {
    // 1. Role must have the permission
    const allowedPermissions = ROLE_POLICIES[ctx.role] || [];
    if (!allowedPermissions.includes(requiredPermission)) {
        return false;
    }

    // 2. Scope Check
    // If user is System Owner, they bypass school scope checks
    if (ctx.isSystemOwner) {
        return true;
    }

    // If target scope is a school, User must belong to that school
    if (targetScope && targetScope.type === 'school') {
        if (!ctx.schoolId) return false;
        if (ctx.schoolId !== targetScope.schoolId) return false;
    }

    return true;
}

/**
 * Helper to get all permissions for a role (mostly for UI/Frontend)
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
    return ROLE_POLICIES[role] || [];
}
