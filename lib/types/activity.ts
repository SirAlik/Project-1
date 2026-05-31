export type ActivityFinancial = {
    id: string;
    item_name: string;
    category: string;
    type: 'budget' | 'expense';
    amount: number;
    invoice_number: string | null;
    date: string;
    school_year: string;
    notes: string | null;
    created_by: string;
    created_at: string;
};

export type ActivityClub = {
    id: string;
    name: string;
    category: 'sports' | 'cultural' | 'scientific' | 'social';
    description: string | null;
    location: string | null;
    capacity: number | null;
    active: boolean;
    created_at: string;
};

export type ClubAssignment = {
    id: string;
    club_id: string;
    teacher_id: string;
    role: 'supervisor' | 'assistant';
    periods_per_week: number;
    start_date: string;
    end_date: string | null;
    created_at: string;
    // Joined data
    teacher_name?: string;
    club_name?: string;
};

export type ClubEvaluation = {
    id: string;
    assignment_id: string;
    evaluation_date: string;
    performance_score: number;
    engagement_score: number;
    notes: string | null;
    created_at: string;
};

export type StudentWish = {
    id: string;
    student_id: string;
    school_year: string;
    first_choice: string | null;
    second_choice: string | null;
    third_choice: string | null;
    submitted_at: string;
    // Joined data
    student_name?: string;
};

export type StudentHonor = {
    id: string;
    student_id: string;
    reason: string;
    prize: string | null;
    awarded_date: string;
    awarded_by: string;
    notes: string | null;
    created_at: string;
    // Joined data
    student_name?: string;
};

export type ActivityTrip = {
    id: string;
    title: string;
    destination: string;
    trip_date: string;
    cost: number | null;
    target_classes: string[];
    consent_deadline: string | null;
    created_at: string;
};

export type TripConsent = {
    id: string;
    trip_id: string;
    student_id: string;
    parent_consent: boolean;
    consent_date: string | null;
    unique_link: string;
    // Joined data
    student_name?: string;
    trip_title?: string;
};

export type ActivityEvent = {
    id: string;
    title: string;
    type: 'event' | 'competition' | 'meeting';
    date: string;
    location: string | null;
    target_audience: string | null;
    outcome: string | null;
    participants_count: number | null;
    notes: string | null;
    created_at: string;
};
