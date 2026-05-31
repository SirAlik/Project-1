export type AIContextType =
    | 'school_overview'
    | 'class_report'
    | 'student_profile'
    | 'attendance_analysis'
    | 'behavior_pattern'
    | 'health_trend'
    | 'lrc_usage'
    | 'quality_summary';

export type AIRoleTarget =
    | 'school_principal'
    | 'student_affairs_vp'
    | 'academic_vp'
    | 'student_counselor'
    | 'health_coordinator'
    | 'quality_coordinator'
    | 'school_librarian'
    | 'teacher';

export type AIScope = 'school' | 'class' | 'student';

export type AIPromptTemplate = {
    id:              string;
    role_target:     AIRoleTarget;
    context_type:    AIContextType;
    template_text:   string;
    required_fields: string[];
    max_tokens:      number;
    is_active:       boolean;
    created_at:      string;
    updated_at:      string;
};

export type AIInsight = {
    id:               string;
    school_id:        string;
    scope:            AIScope;
    scope_id:         string;
    role_target:      AIRoleTarget;
    context_type:     AIContextType;
    summary_ar:       string;
    recommendations:  AIRecommendation[];
    data_snapshot:    Record<string, unknown>;
    generated_at:     string;
    generated_date:   string; // YYYY-MM-DD — يُستخدم في UNIQUE index بدلاً من expression
    expires_at:       string;
    academic_year_id: string | null;
    model_version:    string;
};

export type AIRecommendation = {
    title:    string;
    action:   string;
    priority?: 'high' | 'medium' | 'low';
};

export type AIInsightRequest = {
    school_id:       string;
    scope:           AIScope;
    scope_id:        string;
    role_target:     AIRoleTarget;
    context_type:    AIContextType;
    payload:         Record<string, unknown>;
};
