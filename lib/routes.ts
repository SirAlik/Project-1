/**
 * Route Registry - The Navigation Backbone
 * =========================================
 * Type-safe, centralized route definitions for the entire application.
 * 
 * BENEFITS:
 * - Compile-time route validation
 * - Refactoring safety (change once, update everywhere)
 * - IDE autocomplete for all routes
 * - Self-documenting navigation structure
 * 
 * USAGE:
 * import { routes } from '@/lib/routes';
 * <Link href={routes.admin.dashboard()}>Dashboard</Link>
 * <Link href={routes.admin.schoolStaff(schoolId)}>Staff</Link>
 */

// ============================================================
// ROUTE BUILDER TYPES
// ============================================================

export interface RouteConfig {
    path: string;
    label: string;
    labelAr: string;
    icon?: string;
    roles?: string[];
    requiresSchoolContext?: boolean;
}

// ============================================================
// ROUTE DEFINITIONS
// ============================================================

export const routes = {
    // ============================================================
    // PUBLIC ROUTES
    // ============================================================
    home: () => '/',
    login: () => '/login',
    portal: () => '/portal',
    unauthorized: () => '/403',

    // ============================================================
    // ADMIN (System Owner) ROUTES
    // ============================================================
    admin: {
        dashboard: () => '/admin/dashboard',
        setup: () => '/admin/setup',
        timetable: () => '/admin/timetable',
        audit: () => '/admin/audit',
        settings: () => '/admin/settings',

        // School Management
        addSchool: () => '/admin/schools/new',
        schoolStaff: (schoolId: string) => `/admin/schools/${schoolId}/staff`,
        schoolOnboarding: (schoolId: string) => `/admin/schools/${schoolId}/onboarding`,
        schoolSettings: (schoolId: string) => `/admin/schools/${schoolId}/settings`,
    },

    // ============================================================
    // SCHOOL (SCHOOL IT COORDINATOR) ROUTES
    // ============================================================
    school: {
        dashboard: (schoolId: string) => `/school/${schoolId}/dashboard`,
        affairs: (schoolId: string) => `/school/${schoolId}/school-affairs`,
        settings: (schoolId: string) => `/school/${schoolId}/settings`,
        /** Bulk import page for school coordinators */
        setup: (schoolId: string) => `/school/${schoolId}/setup`,
    },

    // ============================================================
    // PRINCIPAL ROUTES
    // ============================================================
    principal: {
        dashboard: () => '/principal',
        analytics: () => '/principal/analytics',
        staff: () => '/principal/staff',
        alerts: () => '/principal/alerts',
    },

    // ============================================================
    // STUDENT AFFAIRS ROUTES
    // ============================================================
    studentAffairs: {
        dashboard: () => '/student-affairs',
        attendance: () => '/student-affairs/attendance',
        discipline: () => '/student-affairs/discipline',
    },

    // ============================================================
    // COUNSELOR ROUTES
    // ============================================================
    counselor: {
        dashboard: () => '/counselor',
        sessions: () => '/counselor/sessions',
        students: () => '/counselor/students',
    },

    // ============================================================
    // CLASSROOM (TEACHER) ROUTES
    // ============================================================
    classroom: {
        dashboard: () => '/classroom',
        gradebook: () => '/classroom/gradebook',
        attendance: () => '/classroom/attendance',
    },

    // ============================================================
    // SECRETARY ROUTES
    // ============================================================
    secretary: {
        dashboard: () => '/secretary',
        correspondence: () => '/secretary/correspondence',
    },

    // ============================================================
    // HEALTH GUIDE ROUTES
    // ============================================================
    health: {
        dashboard: () => '/health',
        records: () => '/health/records',
    },

    // ============================================================
    // SCIENCE LAB ROUTES
    // ============================================================
    science: {
        dashboard: () => '/science',
        inventory: () => '/science/inventory',
    },

    // ============================================================
    // LRC (LIBRARY) ROUTES
    // ============================================================
    lrc: {
        dashboard: () => '/lrc',
        catalog: () => '/lrc/catalog',
        borrowing: () => '/lrc/borrowing',
    },

    // ============================================================
    // STUDENT ROUTES
    // ============================================================
    student: {
        dashboard: () => '/student',
        metaverse: () => '/student/metaverse',
        schedule: () => '/student/schedule',
    },

    // ============================================================
    // QA ROUTES
    // ============================================================
    qa: {
        dashboard: () => '/qa',
        audits: () => '/qa/audits',
    },
} as const;

// ============================================================
// ROUTE METADATA (For Command Palette & Navigation)
// ============================================================

export interface RouteMetadata {
    path: string;
    label: string;
    labelAr: string;
    icon: string;
    roles: string[];
    keywords: string[];
}

export const routeMetadata: RouteMetadata[] = [
    // Admin Routes
    { path: '/admin/dashboard', label: 'Admin Dashboard', labelAr: 'ظ„ظˆط­ط© ط§ظ„طھط­ظƒظ…', icon: 'Shield', roles: ['system_owner'], keywords: ['admin', 'dashboard', 'super', 'ظ„ظˆط­ط©', 'طھط­ظƒظ…'] },
    { path: '/admin/setup', label: 'Setup Wizard', labelAr: 'ظ…ط¹ط§ظ„ط¬ ط§ظ„ط¥ط¹ط¯ط§ط¯', icon: 'Settings', roles: ['system_owner'], keywords: ['setup', 'wizard', 'ط¥ط¹ط¯ط§ط¯', 'ظ…ط¹ط§ظ„ط¬'] },
    { path: '/admin/schools/new', label: 'Add School', labelAr: 'ط¥ط¶ط§ظپط© ظ…ط¯ط±ط³ط©', icon: 'Plus', roles: ['system_owner'], keywords: ['add', 'school', 'new', 'ط¥ط¶ط§ظپط©', 'ظ…ط¯ط±ط³ط©', 'ط¬ط¯ظٹط¯'] },
    { path: '/admin/timetable', label: 'Timetable Builder', labelAr: 'ط¨ظ†ط§ط، ط§ظ„ط¬ط¯ظˆظ„', icon: 'Calendar', roles: ['system_owner'], keywords: ['timetable', 'schedule', 'ط¬ط¯ظˆظ„', 'ط­طµطµ'] },

    // Principal Routes
    { path: '/principal', label: 'Principal Dashboard', labelAr: 'ظ„ظˆط­ط© ط§ظ„ظ…ط¯ظٹط±', icon: 'User', roles: ['school_principal'], keywords: ['principal', 'dashboard', 'ظ…ط¯ظٹط±', 'ظ„ظˆط­ط©'] },

    // School Coordinator Routes
    { path: '/school/:id/setup', label: 'Bulk Import', labelAr: 'ط§ط³طھظٹط±ط§ط¯ ط§ظ„ط¨ظٹط§ظ†ط§طھ', icon: 'Upload', roles: ['school_admin'], keywords: ['import', 'bulk', 'excel', 'ط§ط³طھظٹط±ط§ط¯', 'ط±ظپط¹', 'ط·ظ„ط§ط¨'] },

    // Student Affairs Routes
    { path: '/student-affairs', label: 'Student Affairs', labelAr: 'ط´ط¤ظˆظ† ط§ظ„ط·ظ„ط§ط¨', icon: 'Users', roles: ['student_affairs_vp'], keywords: ['student', 'affairs', 'ط´ط¤ظˆظ†', 'ط·ظ„ط§ط¨'] },

    // Counselor Routes
    { path: '/counselor', label: 'Counselor', labelAr: 'ط§ظ„ظ…ط±ط´ط¯ ط§ظ„ط·ظ„ط§ط¨ظٹ', icon: 'Heart', roles: ['student_counselor'], keywords: ['counselor', 'ظ…ط±ط´ط¯', 'ط·ظ„ط§ط¨ظٹ'] },

    // Classroom Routes
    { path: '/classroom', label: 'Classroom', labelAr: 'ط§ظ„ظپطµظ„ ط§ظ„ط¯ط±ط§ط³ظٹ', icon: 'BookOpen', roles: ['teacher'], keywords: ['classroom', 'teacher', 'ظپطµظ„', 'ظ…ط¹ظ„ظ…'] },

    // Secretary Routes
    { path: '/secretary', label: 'Secretary', labelAr: 'ط§ظ„ط³ظƒط±طھط§ط±ظٹط©', icon: 'FileText', roles: ['school_secretary'], keywords: ['secretary', 'ط³ظƒط±طھط§ط±ظٹط©', 'correspondence'] },

    // Health Routes
    { path: '/health', label: 'Health Guide', labelAr: 'ط§ظ„ظ…ط±ط´ط¯ ط§ظ„طµط­ظٹ', icon: 'Heart', roles: ['health_coordinator'], keywords: ['health', 'طµط­ط©', 'ظ…ط±ط´ط¯'] },

    // Science Lab Routes
    { path: '/science', label: 'Science Lab', labelAr: 'ظ…ط¹ظ…ظ„ ط§ظ„ط¹ظ„ظˆظ…', icon: 'Flask', roles: ['lab_technician'], keywords: ['science', 'lab', 'ظ…ط¹ظ…ظ„', 'ط¹ظ„ظˆظ…'] },

    // LRC Routes
    { path: '/lrc', label: 'Library (LRC)', labelAr: 'ظ…ط±ظƒط² ظ…طµط§ط¯ط± ط§ظ„طھط¹ظ„ظ…', icon: 'Book', roles: ['school_librarian'], keywords: ['library', 'lrc', 'ظ…ظƒطھط¨ط©', 'ظ…طµط§ط¯ط±'] },

    // Student Routes
    { path: '/student', label: 'Student Portal', labelAr: 'ط¨ظˆط§ط¨ط© ط§ظ„ط·ط§ظ„ط¨', icon: 'GraduationCap', roles: ['student'], keywords: ['student', 'portal', 'ط·ط§ظ„ط¨', 'ط¨ظˆط§ط¨ط©'] },
    { path: '/student/metaverse', label: 'Metaverse', labelAr: 'ط§ظ„ط¹ط§ظ„ظ… ط§ظ„ط§ظپطھط±ط§ط¶ظٹ', icon: 'Globe', roles: ['student'], keywords: ['metaverse', 'virtual', 'ط§ظپطھط±ط§ط¶ظٹ'] },

    // QA Routes
    { path: '/qa', label: 'Quality Assurance', labelAr: 'ط¶ظ…ط§ظ† ط§ظ„ط¬ظˆط¯ط©', icon: 'CheckCircle', roles: ['quality_coordinator'], keywords: ['qa', 'quality', 'ط¬ظˆط¯ط©'] },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Gets all routes accessible by a given role.
 */
export function getRoutesForRole(role: string): RouteMetadata[] {
    return routeMetadata.filter(route =>
        route.roles.includes(role) || role === 'system_owner'
    );
}

/**
 * Searches routes by keyword (for Command Palette).
 */
export function searchRoutes(query: string, userRole: string): RouteMetadata[] {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return getRoutesForRole(userRole).slice(0, 10);

    return routeMetadata
        .filter(route =>
            (route.roles.includes(userRole) || userRole === 'system_owner') &&
            (
                route.label.toLowerCase().includes(normalizedQuery) ||
                route.labelAr.includes(normalizedQuery) ||
                route.keywords.some(k => k.includes(normalizedQuery))
            )
        )
        .slice(0, 10);
}

/**
 * Validates if a path exists in the route registry.
 */
export function isRegisteredRoute(path: string): boolean {
    return routeMetadata.some(route => route.path === path);
}


