export type TriageLevel = 'minor' | 'moderate' | 'emergency';
export type VisitStatus = 'completed' | 'referred';

export type HealthVisit = {
    id:                        string;
    school_id:                 string;
    student_id:                string | null;
    class_id:                  string | null;
    date:                      string;
    complaint:                 string;
    visit_reason:              string | null;
    action_taken:              string;
    status:                    VisitStatus;
    triage_level:              TriageLevel | null;
    needs_parent_notification: boolean;
    parent_notified_at:        string | null;
    needs_followup:            boolean;
    followup_date:             string | null;
    needs_referral:            boolean;
    referred_to:               string | null;
    created_by_persona_id:     string | null;
    created_at:                string;
    // حقل join اختياري
    student_name?:             string | null;
};

export type ReferralDestination = 'hospital' | 'clinic' | 'home' | 'parent' | 'other';

export type HealthReferral = {
    id:                      string;
    school_id:               string;
    visit_id:                string;
    student_id:              string;
    destination:             ReferralDestination;
    reason:                  string;
    parent_notified:         boolean;
    notified_at:             string | null;
    notes:                   string | null;
    recorded_by_persona_id:  string | null;
    created_at:              string;
    // حقل join اختياري
    student_name?:           string | null;
};

export type HealthAwareness = {
    id:              string;
    school_id:       string;
    title:           string;
    target_audience: string;
    date:            string;
    description:     string | null;
    created_at:      string;
};

export type SupplyCategory = 'first_aid' | 'hygiene' | 'equipment' | 'medication' | 'other';
export type SupplyCondition = 'good' | 'damaged' | 'expired';

export type HealthSupply = {
    id:         string;
    school_id:  string;
    item_name:  string;
    category:   SupplyCategory;
    quantity:   number;
    unit:       string;
    condition:  SupplyCondition;
    notes:      string | null;
    created_at: string;
    updated_at: string;
};

export type CanteenCheck = {
    id:                   string;
    school_id:            string;
    check_date:           string;
    hygiene_score:        number;
    food_score:           number;
    notes:                string | null;
    inspector_persona_id: string | null;
    created_at:           string;
};

export type HygieneLog = {
    id:                      string;
    school_id:               string;
    student_id:              string;
    class_id:                string;
    check_date:              string;
    hair_clean:              boolean;
    nails_trimmed:           boolean;
    uniform_clean:           boolean;
    notes:                   string | null;
    checked_by_persona_id:   string | null;
    created_at:              string;
};
