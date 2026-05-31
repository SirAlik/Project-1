export type RubricCriterion = {
    code:      string;
    label:     string;
    max_score: number;
};

export type RubricDomain = {
    code:     string;
    name:     string;
    weight:   number;
    criteria: RubricCriterion[];
};

export type QARubric = {
    id:                    string;
    school_id:             string;
    title:                 string;
    description:           string | null;
    is_active:             boolean;
    domains:               RubricDomain[];
    created_by_persona_id: string | null;
    created_at:            string;
    updated_at:            string;
};

export type QAObservation = {
    id:            string;
    school_id:     string;
    teacher_id:    string;
    observer_id:   string;
    class_id:      string;
    date:          string;
    overall_score: number;
    domain_scores: Record<string, number>;
    notes:         string;
    // حقول join اختيارية
    teacher_name?: string;
    observer_name?: string;
    class_name?:   string;
};

export type RiskLevel = 'high' | 'medium' | 'low';

export type StudentRiskFlag = {
    id:                      string;
    school_id:               string;
    student_id:              string;
    risk_level:              RiskLevel;
    risk_factors:            string[];
    detected_at:             string;
    resolved_at:             string | null;
    resolved_by_persona_id:  string | null;
    notes:                   string | null;
    // حقل join اختياري
    student_name?:           string;
};

export type InterventionType =
    | 'academic'
    | 'behavioral'
    | 'social'
    | 'psychological'
    | 'attendance'
    | 'other';

export type InterventionStatus = 'active' | 'completed' | 'cancelled';

export type Intervention = {
    id:                      string;
    school_id:               string;
    student_id:              string;
    assigned_to_persona_id:  string | null;
    type:                    InterventionType;
    description:             string | null;
    start_date:              string;
    end_date:                string | null;
    status:                  InterventionStatus;
    outcome:                 string | null;
    created_at:              string;
    updated_at:              string;
    // حقل join اختياري
    student_name?:           string;
};

export type DailyKPI = {
    id:          string;
    school_id:   string;
    date:        string;
    role:        string;
    metrics:     Record<string, unknown>;
    computed_at: string;
};

export type ClassWeeklySummary = {
    id:                 string;
    school_id:          string;
    class_id:           string;
    academic_year_id:   string | null;
    week_start:         string;
    total_absences:     number;
    total_lates:        number;
    total_exits:        number;
    avg_participation:  number | null;
    behavior_incidents: number;
    referrals_count:    number;
    lrc_visits:         number;
    health_cases:       number;
    computed_at:        string;
    // حقول join اختيارية
    class_name?:        string;
};

export type StudentAnalyticsCache = {
    student_id:               string;
    school_id:                string;
    academic_year_id:         string | null;
    total_absences_ytd:       number;
    total_lates_ytd:          number;
    total_exits_ytd:          number;
    attendance_rate:          number | null;
    most_missed_subject_id:   string | null;
    behavior_incidents_ytd:   number;
    referrals_ytd:            number;
    behavior_score:           number | null;
    lrc_loans_ytd:            number;
    lrc_visits_attended_ytd:  number;
    risk_score:               number | null;
    risk_level:               'low' | 'medium' | 'high' | null;
    updated_at:               string;
    // حقول join اختيارية
    student_name?:            string;
    most_missed_subject_name?: string;
};
