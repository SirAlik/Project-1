export type BookRow = {
    id:               string;
    school_id:        string;
    title:            string;
    author:           string | null;
    isbn:             string | null;
    category:         string | null;
    total_copies:     number;
    available_copies: number;
    location:         string | null;
};

export type LoanStatus = 'active' | 'returned' | 'overdue' | 'lost';
export type BorrowerType = 'student' | 'teacher';

export type LoanRow = {
    id:                      string;
    school_id:               string;
    book_id:                 string;
    borrower_id:             string;
    borrower_type:           BorrowerType;
    loan_date:               string;
    due_date:                string;
    return_date:             string | null;
    status:                  LoanStatus;
    notes:                   string | null;
    recorded_by_persona_id:  string | null;
    created_at:              string;
    updated_at:              string;
    // حقول join اختيارية
    book?:                   { title: string } | null;
    borrower_name?:          string;
};

export type VisitStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled';

export type VisitRow = {
    id:                      string;
    school_id:               string;
    class_id:                string;
    teacher_persona_id:      string | null;
    timetable_slot_id:       string | null;
    period_id:               string | null;
    visit_date:              string;
    topic:                   string | null;
    status:                  VisitStatus;
    approved_by_persona_id:  string | null;
    approved_at:             string | null;
    notes:                   string | null;
    created_by_persona_id:   string | null;
    created_at:              string;
    // حقول join اختيارية
    class_name?:             string;
    teacher_name?:           string;
    period_number?:          number | null;
};

export type VisitAttendanceRow = {
    id:               string;
    school_id:        string;
    visit_id:         string;
    student_id:       string;
    is_present:       boolean;
    is_excluded:      boolean;
    exclusion_reason: 'absent' | 'dismissed' | 'other' | null;
    // حقل join اختياري
    student_name?:    string;
};

export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'rescheduled';

export type BookingRow = {
    id:                      string;
    school_id:               string;
    teacher_persona_id:      string | null;
    class_id:                string;
    period_id:               string | null;
    booking_date:            string;
    subject:                 string | null;
    status:                  BookingStatus;
    librarian_notes:         string | null;
    approved_by_persona_id:  string | null;
    approved_at:             string | null;
    created_at:              string;
    // حقول join اختيارية
    class_name?:             string;
    teacher_name?:           string;
    period_number?:          number | null;
};
