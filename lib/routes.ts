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
        dashboard: () => '/platform/dashboard',
        setup: () => '/platform/setup',
        timetable: () => '/platform/timetable',
        audit: () => '/platform/audit',
        settings: () => '/platform/settings',

        // School Management
        addSchool: () => '/platform/schools/new',
        schoolStaff: (schoolId: string) => `/platform/schools/${schoolId}/staff`,
        schoolOnboarding: (schoolId: string) => `/platform/schools/${schoolId}/onboarding`,
        schoolSettings: (schoolId: string) => `/platform/schools/${schoolId}/settings`,
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

// ملاحظة توحيد المسارات (Phase 2C): مصدر الحقيقة لربط الدور↔لوحة التحكم والوصول هو
// lib/auth/roles.ts (ROLE_DASHBOARD_MAP / ROLE_ACCESS_MAP). يجب أن تبقى مسارات routeMetadata
// أدناه مطابقةً لشجرة app/ الفعلية وخاليةً من placeholders (مثل :id) لتفادي 404 في Command Palette.
// التوحيد الكامل في سجل واحد مؤجَّل (refactor أوسع — موثّق لـ Phase 2D).
export const routeMetadata: RouteMetadata[] = [
    // Admin Routes
    { path: '/platform/dashboard', label: 'Admin Dashboard', labelAr: 'لوحة التحكم', icon: 'Shield', roles: ['system_owner'], keywords: ['admin', 'dashboard', 'super', 'لوحة', 'تحكم'] },
    { path: '/platform/setup', label: 'Setup Wizard', labelAr: 'معالج الإعداد', icon: 'Settings', roles: ['system_owner'], keywords: ['setup', 'wizard', 'إعداد', 'معالج'] },
    { path: '/platform/schools/new', label: 'Add School', labelAr: 'إضافة مدرسة', icon: 'Plus', roles: ['system_owner'], keywords: ['add', 'school', 'new', 'إضافة', 'مدرسة', 'جديد'] },
    { path: '/platform/timetable', label: 'Timetable Builder', labelAr: 'بناء الجدول', icon: 'Calendar', roles: ['system_owner'], keywords: ['timetable', 'schedule', 'جدول', 'حصص'] },

    // Principal Routes
    { path: '/principal', label: 'Principal Dashboard', labelAr: 'لوحة المدير', icon: 'User', roles: ['school_principal'], keywords: ['principal', 'dashboard', 'مدير', 'لوحة'] },

    // School Coordinator Routes
    // ملاحظة: أُزيل إدخال '/school/:id/setup' لأنه يحوي placeholder غير قابل للحل في
    // Command Palette (يُنتج 404). الوصول إلى الاستيراد المجمّع يتم عبر روابط لوحة
    // المدرسة التي تبني المسار ديناميكياً بـ schoolId (routes.school.setup(schoolId)).

    // Student Affairs Routes
    { path: '/student-affairs', label: 'Student Affairs', labelAr: 'شؤون الطلاب', icon: 'Users', roles: ['student_affairs_vp'], keywords: ['student', 'affairs', 'شؤون', 'طلاب'] },

    // Counselor Routes
    { path: '/counselor', label: 'Counselor', labelAr: 'المرشد الطلابي', icon: 'Heart', roles: ['student_counselor'], keywords: ['counselor', 'مرشد', 'طلابي'] },

    // Classroom Routes
    { path: '/classroom', label: 'Classroom', labelAr: 'الفصل الدراسي', icon: 'BookOpen', roles: ['teacher'], keywords: ['classroom', 'teacher', 'فصل', 'معلم'] },

    // Secretary Routes
    { path: '/secretary', label: 'Secretary', labelAr: 'السكرتارية', icon: 'FileText', roles: ['school_secretary'], keywords: ['secretary', 'سكرتارية', 'correspondence'] },

    // Health Routes
    { path: '/health', label: 'Health Guide', labelAr: 'المرشد الصحي', icon: 'Heart', roles: ['health_coordinator'], keywords: ['health', 'صحة', 'مرشد'] },

    // Science Lab Routes
    { path: '/science', label: 'Science Lab', labelAr: 'معمل العلوم', icon: 'Flask', roles: ['lab_technician'], keywords: ['science', 'lab', 'معمل', 'علوم'] },

    // LRC Routes
    { path: '/lrc', label: 'Library (LRC)', labelAr: 'مركز مصادر التعلم', icon: 'Book', roles: ['school_librarian'], keywords: ['library', 'lrc', 'مكتبة', 'مصادر'] },

    // Student Routes
    { path: '/student', label: 'Student Portal', labelAr: 'بوابة الطالب', icon: 'GraduationCap', roles: ['student'], keywords: ['student', 'portal', 'طالب', 'بوابة'] },
    // (Phase 2E) أُعيد إدخال '/student/metaverse' بعد إنشاء صفحة فهرس تُوجّه إلى /student/metaverse/home
    // — ميزة مقصودة (فضاء الطالب التفاعلي)، لم تعد تولّد 404.
    { path: '/student/metaverse', label: 'Metaverse', labelAr: 'العالم الافتراضي', icon: 'Globe', roles: ['student'], keywords: ['metaverse', 'virtual', 'افتراضي', 'الطالب'] },

    // QA Routes
    { path: '/qa', label: 'Quality Assurance', labelAr: 'ضمان الجودة', icon: 'CheckCircle', roles: ['quality_coordinator'], keywords: ['qa', 'quality', 'جودة'] },
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


