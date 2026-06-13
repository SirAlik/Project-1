import type { UserRole } from '@/lib/auth/roles';
import { LRC_QUALITY_FORMS } from '@/lib/quality/quality-forms';

/**
 * ============================================================================
 * Tenant Quality Template Registry  (سجلّ قوالب الجودة لكل مستأجر) — Phase 3D
 * ============================================================================
 *
 * المبدأ الدستوري (TENANT_QUALITY_TEMPLATES.md · SIDRA_SYSTEM_DOCTRINE §2):
 *   - «طبقة نماذج الجودة وتوليد الوثائق» **قدرة عالمية** في سِدرة.
 *   - لكن **القوالب · أكواد QF · الترويسات · الإتاحة (متى يظهر النموذج لمن)** كلها **لكل مستأجر**.
 *   - أكواد «الفلاح» (QF-*) الموجودة في الكود هي **قالب خاص بمستأجر الفلاح** — لا افتراض سِدرة عالمي.
 *
 * هذا الملف **app-code فقط** — لا قاعدة بيانات ولا migrations ولا RLS. لا يُولّد PDF (المولّدات في
 * مكوّنات كل وحدة). دوره: مصدر الحقيقة لـ«أيّ مدرسة تملك أيّ قوالب/أكواد جودة»، وبوّابة إتاحة فشل-مغلق.
 *
 * قواعد الإتاحة:
 *   - fail-closed: مدرسة غير مُسجَّلة (أو schoolId غائب) → لا قوالب (TenantQualityConfig معطّل، قائمة فارغة).
 *   - **ممنوع** عرض قوالب الفلاح لمستأجر مجهول، **وممنوع** السقوط الصامت إلى قوالب الفلاح عالمياً.
 *   - schoolId يجب أن يأتي من سياق المستأجر المصادَق server-side؛ لا يُوثَق بأي اسم/معرّف من العميل.
 *
 * حالة المشروع: PRE-LAUNCH — لا مدارس حقيقية بعد، فسجلّ المستأجرين (TENANT_QUALITY_REGISTRY) **فارغ**
 * افتراضياً (fail-closed). عند إنشاء مدرسة تُشغّل برنامج جودة الفلاح، يُسجَّل `school_id` الخاص بها هنا
 * (أو عبر طبقة تفعيل لكل مدرسة في مرحلة لاحقة — Phase 3F/DB). لا تُسجَّل قوالب الفلاح لمعرّف مجهول.
 *
 * الوحدات والمكوّنات المُولِّدة المقابلة (مرآة الأكواد — المصدر المعتمد للأكواد هو هذا السجلّ):
 *   health           → app/health/_components/HealthReports.tsx
 *   secretary        → app/secretary/_components/SecretaryReports.tsx
 *   student_affairs  → app/student-affairs/_components/reports/StudentAffairsReports.tsx
 *   counseling       → app/counselor/_components/{QualityForms,Form22,Form42,Form43,Form82}.tsx
 *   activity         → app/activity/_components/ActivityReports.tsx
 *   lrc              → lib/quality/quality-forms.ts (LRC_QUALITY_FORMS) + app/lrc/_components/*
 *   qa               → app/qa/corrective-action/* (QF03-1 عدم المطابقة/إجراء تصحيحي — متوفّر)
 *   science          → app/science (لوحة مخطّطة — lab_technician، قوالب قيد الاعتماد)
 *   principal        → app/principal (لوحة مخطّطة — school_principal، قوالب قيد الاعتماد)
 *   school_admin     → app/school/[id]/dashboard (لوحة مخطّطة — قوالب قيد الاعتماد)
 *   academic         → app/educational (لوحة مخطّطة — academic_vp، قوالب قيد الاعتماد)
 *   operations       → components/operations/DisciplineKnightsModal.tsx (شهادة عامة، لا رمز QF)
 *
 * الأدوار الأربعة (principal · school_admin · academic_vp · lab_technician) تملك نماذج جودة لكن
 * قوالبها تُعتمد لاحقاً (planned: implemented:false، بلا رمز QF). school_affairs_vp مُستثنى (لا يُربَط).
 *
 * ملاحظة wiring (Phase 3D): الأكواد مُمرآة هنا (مصدر حقيقة)، لكن المكوّنات لم تُحوَّل بعد لقراءة الإتاحة
 * المدرسية من هذا السجلّ، لأن السجلّ فارغ في PRE-LAUNCH وتحويلها الآن يُخفي كل النماذج لكل المدارس
 * (تغيير سلوك). التحويل لبوّابة `getQualityTemplates(schoolId, ...)` على مستوى المُستدعي = خطوة لاحقة
 * (بعد تسجيل برنامج مدرسة). انظر تعليقات TODO في المكوّنات.
 */

// ── الوحدات (modules) لطبقة الجودة ──
export type QualityModule =
    | 'health'
    | 'secretary'
    | 'student_affairs'
    | 'counseling'
    | 'activity'
    | 'lrc'
    | 'qa'
    | 'science'
    | 'principal'
    | 'school_admin'
    | 'academic'
    | 'operations';

/** الدور المالك — يجب أن يكون ضمن QUALITY_FORM_OWNER_ROLES في quality-forms.ts (المصدر المعتمد). */
export type QualityOwnerRole = UserRole;

export interface QualityTemplate {
    /** مفتاح داخلي ثابت (module:slug) */
    key: string;
    /** رمز QF — **خاص بالمستأجر**. غائب للنماذج بلا رمز رسمي (LRC/شهادات). */
    code?: string;
    /** العنوان العربي المرئي */
    title: string;
    /** الدور المالك لتصدير النموذج الرسمي */
    ownerRole: QualityOwnerRole;
    /** الوحدة */
    module: QualityModule;
    /** متاح لهذا المستأجر */
    enabled: boolean;
    /** يوجد كود توليد فعلي الآن (لا تزوير — planned يُعرض «قريباً» بصدق) */
    implemented: boolean;
    /** true = خاص ببرنامج مستأجر (الفلاح)؛ false = قدرة/كتالوج عالمي (مثل LRC) */
    tenantSpecific: boolean;
    /** ملاحظة صادقة (اختياري) */
    note?: string;
}

export interface TenantQualityConfig {
    /** هل طبقة الجودة مفعّلة لهذه المدرسة */
    qualityEnabled: boolean;
    /** اسم البرنامج (مثل 'al-falah') أو null */
    program: string | null;
    /** قوالب هذه المدرسة (بعد الإتاحة) */
    templates: QualityTemplate[];
}

const DISABLED_CONFIG: TenantQualityConfig = Object.freeze({
    qualityEnabled: false,
    program: null,
    templates: [],
});

// ============================================================================
// برنامج جودة «الفلاح» — قوالب خاصة بمستأجر (tenantSpecific = true)
// أكواد QF-* أدناه هي أكواد الفلاح، **ليست** افتراضات سِدرة عالمية.
// ============================================================================

const AL_FALAH_HEALTH: QualityTemplate[] = [
    { key: 'health:visit_log',     code: 'QF-70-j-4-1', title: 'سجل الزيارات اليومي',         ownerRole: 'health_coordinator', module: 'health', enabled: true, implemented: true, tenantSpecific: true },
    { key: 'health:supply_log',    code: 'QF-70-j-3-1', title: 'سجل عهدة العيادة المدرسية',   ownerRole: 'health_coordinator', module: 'health', enabled: true, implemented: true, tenantSpecific: true },
    { key: 'health:hygiene_log',   code: 'QF-70-j-6-1', title: 'سجل فحص النظافة الشخصية',     ownerRole: 'health_coordinator', module: 'health', enabled: true, implemented: true, tenantSpecific: true },
    { key: 'health:canteen_check', code: 'QF-70-j-8-1', title: 'سجل متابعة المقصف المدرسي',   ownerRole: 'health_coordinator', module: 'health', enabled: true, implemented: true, tenantSpecific: true },
];

const AL_FALAH_SECRETARY: QualityTemplate[] = [
    { key: 'secretary:late_inquiry',        code: 'QF71-A-3-1', title: 'استفسار عن تأخر موظف',      ownerRole: 'school_secretary', module: 'secretary', enabled: true, implemented: true, tenantSpecific: true },
    { key: 'secretary:absence_inquiry',     code: 'QF71-A-3-2', title: 'استفسار عن غياب موظف',      ownerRole: 'school_secretary', module: 'secretary', enabled: true, implemented: true, tenantSpecific: true },
    { key: 'secretary:deduction_decision',  code: 'QF71-A-3-3', title: 'قرار حسم من الراتب',        ownerRole: 'school_secretary', module: 'secretary', enabled: true, implemented: true, tenantSpecific: true },
    { key: 'secretary:exit_log',            code: 'QF71-A-3-4', title: 'سجل الاستئذان اليومي',      ownerRole: 'school_secretary', module: 'secretary', enabled: true, implemented: true, tenantSpecific: true },
    { key: 'secretary:emergency_leave',     code: 'QF71-A-3-5', title: 'طلب إجازة اضطرارية',        ownerRole: 'school_secretary', module: 'secretary', enabled: true, implemented: true, tenantSpecific: true },
    { key: 'secretary:incoming_log',        code: 'QF71-A-2-1', title: 'سجل الوارد العام',          ownerRole: 'school_secretary', module: 'secretary', enabled: true, implemented: true, tenantSpecific: true },
    { key: 'secretary:outgoing_log',        code: 'QF71-A-2-2', title: 'سجل الصادر العام',          ownerRole: 'school_secretary', module: 'secretary', enabled: true, implemented: true, tenantSpecific: true },
    { key: 'secretary:assignment_letter',   code: 'QF71-A-2-3', title: 'قرار تكليف بمهمة',          ownerRole: 'school_secretary', module: 'secretary', enabled: true, implemented: true, tenantSpecific: true },
    { key: 'secretary:official_letter',     code: 'QF71-A-2-4', title: 'خطاب رسمي',                 ownerRole: 'school_secretary', module: 'secretary', enabled: true, implemented: true, tenantSpecific: true },
    { key: 'secretary:commencement_letter', code: 'QF71-A-2-5', title: 'خطاب مباشرة عمل',           ownerRole: 'school_secretary', module: 'secretary', enabled: true, implemented: true, tenantSpecific: true },
    { key: 'secretary:clearance_form',      code: 'QF71-A-2-6', title: 'نموذج إخلاء طرف',           ownerRole: 'school_secretary', module: 'secretary', enabled: true, implemented: true, tenantSpecific: true },
    { key: 'secretary:procurement_request', code: 'QF71-A-4-1', title: 'نموذج طلب احتياج / شراء',    ownerRole: 'school_secretary', module: 'secretary', enabled: true, implemented: true, tenantSpecific: true },
    { key: 'secretary:meeting_invitation',  code: 'QF19-1',     title: 'دعوة لحضور اجتماع',         ownerRole: 'school_secretary', module: 'secretary', enabled: true, implemented: true, tenantSpecific: true },
    { key: 'secretary:meeting_minutes',     code: 'QF19-2',     title: 'محضر اجتماع رسمي',          ownerRole: 'school_secretary', module: 'secretary', enabled: true, implemented: true, tenantSpecific: true },
];

const STUDENT_AFFAIRS_NOTE = 'مولّد React-PDF متوفّر؛ غير مربوط بصفحة بعد (يُربط في مرحلة لاحقة).';
const AL_FALAH_STUDENT_AFFAIRS: QualityTemplate[] = [
    { key: 'student_affairs:personal_data',        code: 'QF71-C-2-2', title: 'بيانات الطالب الشخصية',       ownerRole: 'student_affairs_vp', module: 'student_affairs', enabled: true, implemented: true, tenantSpecific: true, note: STUDENT_AFFAIRS_NOTE },
    { key: 'student_affairs:morning_tardy',        code: 'QF71-C-5-1', title: 'سجل التأخر الصباحي',          ownerRole: 'student_affairs_vp', module: 'student_affairs', enabled: true, implemented: true, tenantSpecific: true, note: STUDENT_AFFAIRS_NOTE },
    { key: 'student_affairs:exit_log',             code: 'QF71-C-4-1', title: 'سجل استئذان الطلاب',          ownerRole: 'student_affairs_vp', module: 'student_affairs', enabled: true, implemented: true, tenantSpecific: true, note: STUDENT_AFFAIRS_NOTE },
    { key: 'student_affairs:counselor_referral',   code: 'QF71-C-5-3', title: 'إحالة طالب للمرشد الطلابي',   ownerRole: 'student_affairs_vp', module: 'student_affairs', enabled: true, implemented: true, tenantSpecific: true, note: STUDENT_AFFAIRS_NOTE },
    { key: 'student_affairs:absence_log',          code: 'QF71-C-5-2', title: 'سجل الغياب اليومي',           ownerRole: 'student_affairs_vp', module: 'student_affairs', enabled: true, implemented: true, tenantSpecific: true, note: STUDENT_AFFAIRS_NOTE },
    { key: 'student_affairs:asset_handover',       code: 'QF71-C-3-1', title: 'سجل استلام وتسليم العهد',     ownerRole: 'student_affairs_vp', module: 'student_affairs', enabled: true, implemented: true, tenantSpecific: true, note: STUDENT_AFFAIRS_NOTE },
    { key: 'student_affairs:student_roster',       code: 'QF71-C-2-3', title: 'كشف بأسماء الطلاب',           ownerRole: 'student_affairs_vp', module: 'student_affairs', enabled: true, implemented: true, tenantSpecific: true, note: STUDENT_AFFAIRS_NOTE },
    { key: 'student_affairs:behavioral_contract',  code: 'QF71-C-6-1', title: 'نموذج التعهد السلوكي',        ownerRole: 'student_affairs_vp', module: 'student_affairs', enabled: true, implemented: true, tenantSpecific: true, note: STUDENT_AFFAIRS_NOTE },
];

const AL_FALAH_COUNSELING: QualityTemplate[] = [
    { key: 'counseling:comprehensive_profile', code: 'QF-71-C-2-2', title: 'دراسة حالة (بيانات شاملة)', ownerRole: 'student_counselor', module: 'counseling', enabled: true, implemented: true, tenantSpecific: true },
    { key: 'counseling:individual_session',    code: 'QF-71-F-4-2', title: 'مقابلة فردية',             ownerRole: 'student_counselor', module: 'counseling', enabled: true, implemented: true, tenantSpecific: true },
    { key: 'counseling:case_followup',         code: 'QF-71-F-4-3', title: 'متابعة حالة',              ownerRole: 'student_counselor', module: 'counseling', enabled: true, implemented: true, tenantSpecific: true },
    { key: 'counseling:absence_followup',      code: 'QF-71-F-8-2', title: 'متابعة غياب',              ownerRole: 'student_counselor', module: 'counseling', enabled: true, implemented: true, tenantSpecific: true },
];

const AL_FALAH_ACTIVITY: QualityTemplate[] = [
    { key: 'activity:supervisors',      code: 'QF71-G-1-1', title: 'توزيع المشرفين على الأندية', ownerRole: 'activity_leader', module: 'activity', enabled: true, implemented: true, tenantSpecific: true },
    { key: 'activity:budget',           code: 'QF71-G-1-2', title: 'خطة ميزانية النشاط الطلابي', ownerRole: 'activity_leader', module: 'activity', enabled: true, implemented: true, tenantSpecific: true },
    { key: 'activity:student_wishes',   code: 'QF71-G-3-1', title: 'رغبات الطلاب في النشاط',     ownerRole: 'activity_leader', module: 'activity', enabled: true, implemented: true, tenantSpecific: true },
    { key: 'activity:events_log',       code: 'QF71-G-4-1', title: 'سجل تنفيذ الفعاليات والبرامج', ownerRole: 'activity_leader', module: 'activity', enabled: true, implemented: true, tenantSpecific: true },
    { key: 'activity:competitions_log', code: 'QF71-G-5-1', title: 'سجل المسابقات',              ownerRole: 'activity_leader', module: 'activity', enabled: true, implemented: true, tenantSpecific: true },
    { key: 'activity:honors',           code: 'QF71-G-5-3', title: 'تكريم الطلاب المتميزين',      ownerRole: 'activity_leader', module: 'activity', enabled: true, implemented: true, tenantSpecific: true },
    { key: 'activity:expenses',         code: 'QF71-G-7-1', title: 'سجل الصرف المالي الفعلي',     ownerRole: 'activity_leader', module: 'activity', enabled: true, implemented: true, tenantSpecific: true },
    { key: 'activity:full_record',      code: 'QF71-G-3-2', title: 'السجل التراكمي الشامل للنشاط', ownerRole: 'activity_leader', module: 'activity', enabled: true, implemented: true, tenantSpecific: true },
];

const AL_FALAH_QA: QualityTemplate[] = [
    { key: 'qa:corrective_action', code: 'QF03-1', title: 'تقرير عدم المطابقة والإجراء التصحيحي', ownerRole: 'quality_coordinator', module: 'qa', enabled: true, implemented: true, tenantSpecific: true },
];

// قوالب مخطّطة (placeholder) لأدوار مالكة تُعتمد قوالبها الرسمية لاحقاً من مالك المنتج.
// implemented:false · بلا رمز QF مُختلَق · enabled للفلاح فقط (عبر التسجيل) · تُعرض «قيد الاعتماد» بصدق.
const AL_FALAH_PLANNED: QualityTemplate[] = [
    { key: 'principal:leadership_reports', title: 'نماذج الجودة القيادية (قيد الاعتماد)',   ownerRole: 'school_principal', module: 'principal',    enabled: true, implemented: false, tenantSpecific: true, note: 'بانتظار اعتماد القوالب الرسمية من مالك المنتج.' },
    { key: 'school_admin:coordination',    title: 'نماذج التنسيق المدرسي (قيد الاعتماد)',   ownerRole: 'school_admin',    module: 'school_admin', enabled: true, implemented: false, tenantSpecific: true, note: 'بانتظار اعتماد القوالب الرسمية من مالك المنتج.' },
    { key: 'academic:academic_forms',      title: 'نماذج الشؤون التعليمية (قيد الاعتماد)',  ownerRole: 'academic_vp',     module: 'academic',     enabled: true, implemented: false, tenantSpecific: true, note: 'بانتظار اعتماد القوالب الرسمية من مالك المنتج.' },
    { key: 'science:lab_forms',            title: 'نماذج/سجلات المختبر (قيد الاعتماد)',     ownerRole: 'lab_technician',  module: 'science',      enabled: true, implemented: false, tenantSpecific: true, note: 'بانتظار اعتماد القوالب الرسمية من مالك المنتج.' },
];

/**
 * مجموعة قوالب الفلاح الخاصة بالمستأجر (أكواد QF). مُصدَّرة كمصدر حقيقة لأكواد الفلاح.
 * **ليست** قوالب عالمية: لا تُربَط إلا بمدرسة مُسجَّلة صراحةً ببرنامج الفلاح.
 */
export const AL_FALAH_QUALITY_TEMPLATES: QualityTemplate[] = [
    ...AL_FALAH_HEALTH,
    ...AL_FALAH_SECRETARY,
    ...AL_FALAH_STUDENT_AFFAIRS,
    ...AL_FALAH_COUNSELING,
    ...AL_FALAH_ACTIVITY,
    ...AL_FALAH_QA,
    ...AL_FALAH_PLANNED,
];

// ============================================================================
// قوالب عالمية (tenantSpecific = false) — كتالوج/قدرة سِدرة، إتاحتها لكل مدرسة عبر التسجيل
// ============================================================================

/** نماذج LRC من الكتالوج العالمي (quality-forms.ts) — لا أكواد QF خاصة بمستأجر. */
const LRC_TEMPLATES: QualityTemplate[] = LRC_QUALITY_FORMS.map((f) => ({
    key: `lrc:${f.key}`,
    title: f.title,
    ownerRole: 'school_librarian' as QualityOwnerRole,
    module: 'lrc' as QualityModule,
    enabled: true,
    implemented: f.status === 'available',
    tenantSpecific: false,
    note: f.note,
}));

/** شهادة الانضباط (عامة) — ليست نموذج QF خاص بمستأجر؛ نصّها محايد. */
const OPERATIONS_TEMPLATES: QualityTemplate[] = [
    {
        key: 'operations:discipline_certificate',
        title: 'شهادة شكر وتقدير (فرسان الانضباط)',
        ownerRole: 'school_principal',
        module: 'operations',
        enabled: true,
        implemented: true,
        tenantSpecific: false,
        note: 'شهادة عامة بنصّ محايد — لا رمز QF ولا هوية مستأجر مُثبَّتة.',
    },
];

/** القوالب العالمية المتاحة لأي مدرسة بعد تفعيل وحداتها. */
export const GLOBAL_QUALITY_TEMPLATES: QualityTemplate[] = [
    ...LRC_TEMPLATES,
    ...OPERATIONS_TEMPLATES,
];

// ============================================================================
// سجلّ المستأجرين  (school_id → TenantQualityConfig)
// ============================================================================

/**
 * **فارغ افتراضياً (fail-closed).** PRE-LAUNCH: لا مدارس حقيقية بعد.
 *
 * لتفعيل برنامج جودة الفلاح لمدرسة (عند توفّر معرّفها الحقيقي)، أضِف إدخالاً:
 *
 *   const TENANT_QUALITY_REGISTRY: Record<string, TenantQualityConfig> = {
 *     '<alfalah-school-uuid>': {
 *       qualityEnabled: true,
 *       program: 'al-falah',
 *       templates: [...AL_FALAH_QUALITY_TEMPLATES, ...GLOBAL_QUALITY_TEMPLATES],
 *     },
 *   };
 *
 * لا تُسجّل قوالب الفلاح لمعرّف مجهول. طبقة تفعيل/تعطيل لكل مدرسة مدعومة بقاعدة البيانات = Phase 3F.
 */
/**
 * معرّف مدرسة الفلاح من سجلّ المدارس الحقيقي في Supabase (المشروع الحيّ · `schools.name` =
 * «مدارس الفلاح الأهلية» · أُنشئ 2026-01-24). معرّف ثابت موثوق server-side — ليس مُختلَقاً.
 */
const AL_FALAH_SCHOOL_ID = 'bfe99c43-fa5c-46f4-8ad0-05e12184b55e';

const TENANT_QUALITY_REGISTRY: Record<string, TenantQualityConfig> = {
    [AL_FALAH_SCHOOL_ID]: {
        qualityEnabled: true,
        program: 'al-falah',
        templates: [...AL_FALAH_QUALITY_TEMPLATES, ...GLOBAL_QUALITY_TEMPLATES],
    },
};

// ============================================================================
// الوصول الآمن (fail-closed)
// ============================================================================

/** إعداد جودة المدرسة. schoolId غائب أو غير مُسجَّل → معطّل (قائمة فارغة). */
export function getTenantQualityConfig(schoolId: string | null | undefined): TenantQualityConfig {
    if (!schoolId) return DISABLED_CONFIG;
    return TENANT_QUALITY_REGISTRY[schoolId] ?? DISABLED_CONFIG;
}

/** هل طبقة الجودة مفعّلة لهذه المدرسة. */
export function isQualityEnabled(schoolId: string | null | undefined): boolean {
    return getTenantQualityConfig(schoolId).qualityEnabled;
}

/** قوالب المدرسة المتاحة (اختيارياً مُرشَّحة بالوحدة). فارغة لمدرسة غير مُسجَّلة (fail-closed). */
export function getQualityTemplates(
    schoolId: string | null | undefined,
    module?: QualityModule,
): QualityTemplate[] {
    const enabledTemplates = getTenantQualityConfig(schoolId).templates.filter((t) => t.enabled);
    return module ? enabledTemplates.filter((t) => t.module === module) : enabledTemplates;
}

/** هل وحدة جودة محدّدة مفعّلة لهذه المدرسة (تملك قالباً متاحاً واحداً على الأقل). */
export function isQualityModuleEnabled(schoolId: string | null | undefined, module: QualityModule): boolean {
    return getQualityTemplates(schoolId, module).length > 0;
}

/** قالب بعينه عبر رمز QF لمدرسة (fail-closed: null لمدرسة غير مُسجَّلة أو رمز غير متاح). */
export function getTemplateByCode(schoolId: string | null | undefined, code: string): QualityTemplate | null {
    return getQualityTemplates(schoolId).find((t) => t.code === code) ?? null;
}
