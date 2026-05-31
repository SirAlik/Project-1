export type Subject = "عام" | "إسلامية";

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
