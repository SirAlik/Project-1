
import { CaseStatus } from "./student-affairs"; // Reusing status for now to match DB enum

export type { CaseStatus };

export type TabKey = "بلاغات" | "المعاملات" | "الجلسات" | "quality";

export type ParentReportRow = {
    id: string;
    created_at: string;
    title: string | null;
    details: string | null;
    status: string | null;
    student_id: string | null;
    class_id: string | null;
    case_id: string | null;
};

// Intentionally matching the existing shape but kept separate if fields diverge
export type CaseRow = {
    id: string;
    created_at: string;
    title: string | null;
    details: string | null;
    category: string | null;
    status: CaseStatus;
    student_id: string | null;
    class_id: string | null;
    opened_by_name: string | null;
    opened_by_role: string | null;
    assigned_to_role: string | null;
    closed_at: string | null;
};

export type SessionRow = {
    id: string;
    created_at: string;
    case_id: string | null;
    student_id: string | null;
    class_id: string | null;

    session_date: string | null;
    session_type: string | null;
    topic: string | null;
    notes: string | null;
    actions_taken: string | null;
    follow_up_required: boolean | null;
    follow_up_date: string | null;

    counselor_nar: string | null;
    counselor_rol: string | null;
};

export type CounselorSessionType = 'individual' | 'group' | 'parent' | 'follow_up';

export interface CounselorSession {
    id:                   string;
    school_id:            string;
    student_id:           string;
    case_id:              string | null;
    counselor_persona_id: string | null;
    session_date:         string;
    duration_minutes:     number | null;
    session_type:         CounselorSessionType;
    notes:                string | null;
    outcome:              string | null;
    next_session_date:    string | null;
    created_at:           string;
}
