export type Subject = "عام" | "إسلامية";

// مفردات الواجهة (display vocabulary) — أوسع من enum قاعدة البيانات؛ تُحوَّل خادمياً عبر mapToDbEventType.
export type EventType =
    | "غياب"
    | "تأخر عن دخول الحصة"
    | "دورة المياه - خرج"
    | "دورة المياه - عاد"
    | "شارك اليوم"
    | "حديث جانبي"
    | "مقاطعة"
    | "عدم إحضار واجب"
    | "لم يسمّع القرآن"
    | "عدم إحضار الأدوات"
    | "استئذان"
    | "تحويل إلى وكيل شؤون الطلاب"
    | "نجم الحصة 1"
    | "نجم الحصة 2"
    | "نجم الحصة 3"
    | "تفكير إبداعي"
    | "مبادرة/قيادة"
    | "التزام وانضباط"
    | "تميز ملحوظ"
    | "نوم في الحصة"
    | "عرقلة سير الحصة";

// ── مصدر الحقيقة الوحيد لأنواع الأحداث المدعومة في قاعدة البيانات ──
// enum public.event_type يقبل هذه القيم السبع *فقط* (تحقّق حيّ 2026). أي قيمة أخرى يرفضها Postgres
// بـ "invalid input value for enum event_type"، فيجب التحويل إليها خادمياً قبل أي إدراج في events.
export const CLASSROOM_DB_EVENT_TYPES = [
    "غياب",
    "استئذان",
    "تحويل إلى وكيل شؤون الطلاب",
    "مخالفة",
    "تأخر",
    "زيارة عيادة",
    "زيارة مصادر تعلم",
] as const;

export type DbEventType = (typeof CLASSROOM_DB_EVENT_TYPES)[number];

const DB_EVENT_TYPE_SET: ReadonlySet<string> = new Set(CLASSROOM_DB_EVENT_TYPES);

// مرادفات مفردات الواجهة → قيمة enum صحيحة (لا تخمين: كل سطر تطابق دلالي مباشر).
const EVENT_TYPE_ALIASES: Record<string, DbEventType> = {
    "غائب": "غياب",
    "متأخر": "تأخر",
    "تأخر عن دخول الحصة": "تأخر",
    "عيادة": "زيارة عيادة",
    "مصادر التعلم": "زيارة مصادر تعلم",
    "زيارة المكتبة": "زيارة مصادر تعلم",
};

// مخالفات صفّية متعددة تُمثَّل جميعها بقيمة enum واحدة "مخالفة"؛ التفصيل الأصلي يُحفظ في note/metadata.
const DISCIPLINE_VIOLATIONS: ReadonlySet<string> = new Set([
    "حديث جانبي",
    "مقاطعة",
    "عدم إحضار واجب",
    "لم يسمّع القرآن",
    "عدم إحضار الأدوات",
    "نوم في الحصة",
    "عرقلة سير الحصة",
]);

/**
 * يحوّل نوع حدث من مفردات الواجهة إلى قيمة enum صالحة في قاعدة البيانات،
 * أو يُعيد null إذا كان النوع غير قابل للتمثيل (المكافآت/النجوم/الأوسمة/الأحداث الإيجابية
 * وخروج دورة المياه والعودة) — في هذه الحالة يجب رفض الكتابة بصدق لا اختلاق قيمة خاطئة.
 */
export function mapToDbEventType(appType: string): DbEventType | null {
    const t = (appType ?? "").trim();
    if (DB_EVENT_TYPE_SET.has(t)) return t as DbEventType;
    if (EVENT_TYPE_ALIASES[t]) return EVENT_TYPE_ALIASES[t];
    if (DISCIPLINE_VIOLATIONS.has(t)) return "مخالفة";
    return null;
}

export type EventRow = {
    id: string;
    created_at: string;
    student?: string; // Legacy / Fallback
    student_name_cached?: string; // Correct schema
    student_id?: string | null;
    type: string;
    note?: string | null;
    actor_role?: string | null;
    points_delta?: number;
    action_category?: 'reward' | 'penalty' | 'attendance' | 'utility' | 'academic' | 'discipline' | 'exit';
};

export type StudentOption = {
    id: string;
    name: string;
};

// --- Phase 2 Types ---

export interface GradebookItem {
    id: string;
    title: string;
    maxPoints: number;
    linkedToEvent?: EventType;
}

export interface StudentBadge {
    id: string;
    studentId: string;
    type: string;
    label: string;
    icon: string;
    awardedAt: string;
}

export interface ClassRole {
    studentId: string;
    role: string; // Monitor, Vice Monitor, etc.
}

export interface SeatingPoint {
    studentId: string;
    x: number;
    y: number;
}

export interface ExitLog {
    id: string;
    studentId: string;
    studentName: string;
    type: "دورة مياه" | "عيادة" | "أخرى";
    startTime: string;
    endTime?: string;
    durationMinutes?: number;
}

export type ExitType = 'restroom' | 'clinic' | 'admin' | 'other';

export interface ClassroomExit {
    id:                  string;
    school_id:           string;
    student_id:          string;
    class_id:            string;
    timetable_slot_id:   string | null;
    teacher_persona_id:  string | null;
    exit_date:           string;
    exit_type:           ExitType;
    exit_time:           string;
    return_time:         string | null;
    duration_minutes:    number | null;
    note:                string | null;
    created_at:          string;
}

export interface ParentNote {
    id: string;
    studentId: string;
    content: string;
    urgency: "low" | "medium" | "high";
    createdAt: string;
}
