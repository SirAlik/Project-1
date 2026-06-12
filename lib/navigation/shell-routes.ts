/**
 * كشف مسارات الأصداف (Shell route detection) — مصدر واحد لتحديد المسارات التي تملك
 * صدفة سِدرة الخاصة (شريط جانبي + شريط علوي)، فتُخفى عليها الترويسة العامة GlobalHeader
 * لتجنّب ازدواج الترويسات.
 *
 * ملاحظة: هذا لا يشمل المسارات العامة/الدخول/البوابة (/ · /login · /portal) — تلك تُخفى لأسباب
 * أخرى داخل GlobalHeader. ولا يشمل /student و/parent (لا صدفة لهما — تبقى ترويستهما العامة).
 */

// بادئات تُخفى مع كامل شجرتها الفرعية: الصدفة مُركّبة على layout الدور فترثها كل الأبناء.
const SHELL_PREFIXES = [
    '/platform',
    '/principal',
    '/secretary',
    '/qa',
    '/educational',
    '/student-affairs',
    '/counselor',
    '/health',
    '/science',
    '/staff-evaluation',
];

// مسارات تُخفى بمطابقة دقيقة فقط: الصدفة مُركّبة على الصفحة نفسها (لا على الـ layout)، لاستثناء
// أبناء عامّين/مركّزين — /activity/consent (نموذج موافقة عام) · /classroom/[grade] (مساحة المعلم المركّزة).
const SHELL_EXACT = ['/lrc', '/activity', '/classroom'];

// شجرة /school/[id] المُغلَّفة بـ SchoolDashboardShell (صفحات محدّدة فقط).
const SCHOOL_SHELL_RE = /^\/school\/[^/]+\/(dashboard|staff|staff\/new)$/;

/** هل يملك هذا المسار صدفة سِدرة الخاصة (فتُخفى الترويسة العامة)؟ */
export function isShellRoute(pathname: string): boolean {
    if (SHELL_EXACT.includes(pathname)) return true;
    if (SCHOOL_SHELL_RE.test(pathname)) return true;
    return SHELL_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}
