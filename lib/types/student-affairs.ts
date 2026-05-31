// Types for Student Affairs Module

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused_exit';
export type ReferralStatus = 'draft' | 'pending_counselor' | 'in_progress' | 'resolved' | 'escalated';
export type ReferralType = 'lateness' | 'absence' | 'behavior' | 'academic';
export type CaseStatus = 'open' | 'in_progress' | 'closed' | 'escalated' | 'مفتوحة' | 'مغلقة' | 'مفتوح' | 'approved' | 'new' | 'pending';

// Event row for events table
export interface EventRow {
  id: string;
  student_id: string;
  class_id?: string;
  type: string;
  event_date: string;
  note?: string;
  created_at: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  student_id: string;
  grade_level: string;
  section: string;
  national_id?: string;
  passport_number?: string;
  birth_date?: string;
  birth_place?: string;
  nationality?: string;
  religion?: string;
  blood_type?: string;
  address_city?: string;
  address_district?: string;
  address_street?: string;
  previous_school?: string;
  enrollment_date?: string;
  guardian_name?: string;
  guardian_relation?: string;
  guardian_phone?: string;
  guardian_work?: string;
  emergency_contact?: string;
  medical_notes?: string;
  guardian_user_id?: string;
}

// Alias for student row used across components
export type StudentRow = StudentProfile;

export interface StudentAttendance {
  id: string;
  student_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  time_in?: string;
  time_out?: string;
  is_excused: boolean;
  excuse_reason?: string;
  exit_guardian_name?: string;
  exit_guardian_relation?: string;
  exit_reason?: string;
  recorded_by: string;
  created_at: string;
  student?: {
    name: string;
    student_id: string;
  };
}

export interface BehavioralReferral {
  id: string;
  student_id: string;
  referral_type: ReferralType;
  trigger_count?: number;
  trigger_period?: string;
  vp_id?: string;
  vp_reason: string;
  vp_notes?: string;
  vp_sent_at?: string;
  counselor_id?: string;
  counselor_action?: string;
  counselor_notes?: string;
  counselor_resolved_at?: string;
  parent_notified: boolean;
  parent_signature_date?: string;
  status: ReferralStatus;
  created_at: string;
  updated_at: string;
  student?: {
    name: string;
    student_id: string;
  };
}

export type AssetType   = 'book' | 'device' | 'equipment' | 'other';
export type AssetStatus = 'assigned' | 'returned' | 'lost' | 'damaged';

export interface StudentAsset {
  id:                     string;
  school_id:              string;
  student_id:             string;
  asset_type:             AssetType;
  asset_name:             string;
  asset_identifier:       string | null;
  handover_date:          string;
  return_date:            string | null;
  status:                 AssetStatus;
  recorded_by_persona_id: string | null;
  notes:                  string | null;
  created_at:             string;
  updated_at:             string;
  // حقل join اختياري — يظهر عند .select('*, student:student_profiles(name)')
  student?:               { name: string } | null;
}

export interface BehavioralContract {
  id:               string;
  school_id:        string;
  student_id:       string;
  referral_id:      string | null;
  academic_year_id: string;
  terms:            string;
  is_active:        boolean;
  student_signed_at: string | null;
  parent_signed_at:  string | null;
  vp_signed_at:      string | null;
  vp_persona_id:     string | null;
  created_at:        string;
  updated_at:        string;
}
