// Layer 6 + 6b domain types — كيانات الـ workflows + HR State Machine
// الأسماء تتجنب التعارض مع secretary.ts: (Meeting → MeetingSession, MeetingAttendee → MeetingSessionAttendee, HRInquiry → HRAccountabilityTicket)

// ============================================================
// Nonconformance Reports — CORRECTIVE_ACTION workflow
// ============================================================

export type NCRStatus =
  | 'open'
  | 'in_progress'
  | 'awaiting_verification'
  | 'closed_effective'
  | 'closed_ineffective'
  | 'cancelled';

export type NCRSource =
  | 'internal_audit'
  | 'external_audit'
  | 'management_review'
  | 'complaint'
  | 'observation'
  | 'other';

export type VerificationResult = 'effective' | 'ineffective';

export interface NonconformanceReport {
  id: string;
  school_id: string;
  workflow_instance_id: string | null;
  report_number: string;
  iso_clause: string | null;
  source: NCRSource;
  description: string;
  detected_by_persona_id: string | null;
  detected_by_name_snapshot: string | null;
  detected_at: string;
  root_cause: string | null;
  corrective_action_plan: string | null;
  evidence_attachments: string[];
  verification_result: VerificationResult | null;
  verified_by_persona_id: string | null;
  verified_by_name_snapshot: string | null;
  verified_at: string | null;
  status: NCRStatus;
  created_at: string;
}

// ============================================================
// HR Accountability Tickets — HR_ATTENDANCE workflow
// ============================================================

export type HATViolationType = 'late' | 'absence' | 'early_departure' | 'other';

export type HATStatus =
  | 'open'
  | 'awaiting_response'
  | 'awaiting_decision'
  | 'decided'
  | 'archived'
  | 'cancelled';

export type HATDecision =
  | 'justified'
  | 'not_justified'
  | 'deduction'
  | 'warning'
  | 'dismissed';

export interface HRAccountabilityTicket {
  id: string;
  school_id: string;
  workflow_instance_id: string | null;
  ticket_number: string;
  violation_type: HATViolationType;
  violation_date: string;
  violation_details: string | null;
  supporting_evidence: string[];
  employee_persona_id: string | null;
  employee_name_snapshot: string;
  employee_role_snapshot: string;
  employee_response: string | null;
  employee_responded_at: string | null;
  principal_decision: HATDecision | null;
  principal_notes: string | null;
  decided_by_persona_id: string | null;
  decided_by_name_snapshot: string | null;
  decided_at: string | null;
  status: HATStatus;
  created_by_persona_id: string;
  created_by_name_snapshot: string;
  created_at: string;
}

// ============================================================
// Staff Evaluations — STAFF_EVAL workflow
// ============================================================

export type EvalStatus = 'draft' | 'completed' | 'acknowledged' | 'filed' | 'cancelled';

export type PerformanceLevel =
  | 'excellent'
  | 'very_good'
  | 'good'
  | 'satisfactory'
  | 'needs_improvement';

export interface StaffEvaluation {
  id: string;
  school_id: string;
  workflow_instance_id: string | null;
  evaluation_number: string;
  academic_year: string;
  evaluatee_persona_id: string;
  evaluatee_name_snapshot: string;
  evaluatee_role_snapshot: string;
  evaluator_persona_id: string | null;
  evaluator_name_snapshot: string | null;
  evaluation_period_start: string | null;
  evaluation_period_end: string | null;
  scores: Record<string, unknown> | null;
  total_score: number | null;
  max_score: number | null;
  percentage: number | null;
  performance_level: PerformanceLevel | null;
  evaluator_notes: string | null;
  development_plan: string | null;
  evaluatee_acknowledgment_notes: string | null;
  acknowledged_by_persona_id: string | null;
  acknowledged_at: string | null;
  filed_by_persona_id: string | null;
  filed_at: string | null;
  status: EvalStatus;
  created_at: string;
}

// ============================================================
// Meeting Sessions — MEETING workflow
// ============================================================

export type MeetingSessionStatus =
  | 'scheduled'
  | 'in_progress'
  | 'ended'
  | 'awaiting_signatures'
  | 'minutes_signed'
  | 'cancelled';

export type MeetingType =
  | 'regular'
  | 'emergency'
  | 'specialized'
  | 'management_review'
  | 'other';

export interface MeetingSession {
  id: string;
  school_id: string;
  workflow_instance_id: string | null;
  session_number: string;
  title: string;
  meeting_type: MeetingType;
  scheduled_date: string;
  start_time: string;
  end_time: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  location: string | null;
  organizer_persona_id: string;
  organizer_name_snapshot: string;
  agenda_items: unknown[];
  minutes: string | null;
  decisions: unknown[];
  recommendations: unknown[];
  attachments: string[];
  status: MeetingSessionStatus;
  created_at: string;
}

export interface MeetingSessionAttendee {
  id: string;
  meeting_session_id: string;
  school_id: string;
  persona_id: string | null;
  name_snapshot: string;
  role_snapshot: string | null;
  is_invited: boolean;
  attended: boolean;
  apology_reason: string | null;
  rsvp_status: 'pending' | 'accepted' | 'declined';
  joined_at: string | null;
  signature_time: string | null;
  signature_hash: string | null;
  created_at: string;
}

// ============================================================
// Meeting Live Notes — M52
// ============================================================

export type MeetingNoteType = 'discussion' | 'decision' | 'action_item' | 'attachment';

export interface MeetingLiveNote {
  id: string;
  meeting_session_id: string;
  school_id: string;
  author_persona_id: string;
  author_name_snapshot: string;
  note_type: MeetingNoteType;
  content: string;
  agenda_topic_idx: number | null;
  created_at: string;
}

// ============================================================
// Meeting Action Items — M53
// ============================================================

export type MeetingActionItemPriority = 'low' | 'medium' | 'high' | 'critical';
export type MeetingActionItemStatus   = 'pending' | 'in_progress' | 'done' | 'cancelled';

export interface MeetingActionItem {
  id: string;
  meeting_session_id: string;
  school_id: string;
  task: string;
  assigned_to_persona_id: string;
  assigned_to_name_snapshot: string;
  due_date: string | null;
  priority: MeetingActionItemPriority;
  status: MeetingActionItemStatus;
  created_at: string;
  completed_at: string | null;
}

// ============================================================
// Layer 6b — HR State Machine
// ============================================================

export type AttendanceSource = 'biometric' | 'manual' | 'system';
export type AttendanceAbsenceType = 'excused' | 'unexcused' | 'medical' | 'emergency';

export interface StaffAttendanceLog {
  id:                    string;
  school_id:             string;
  persona_id:            string;
  persona_name_snapshot: string;
  persona_role_snapshot: string;
  log_date:              string;
  arrival_time:          string | null;
  departure_time:        string | null;
  is_late:               boolean;
  is_absent:             boolean;
  late_minutes:          number | null;
  absence_type:          AttendanceAbsenceType | null;
  source:                AttendanceSource;
  biometric_log_id:      string | null;
  ticket_id:             string | null;
  notes:                 string | null;
  created_by_persona_id: string | null;
  created_at:            string;
  updated_at:            string;
}

export type BiometricPunchType = 'in' | 'out' | 'unknown';

export interface BiometricLog {
  id:                string;
  school_id:         string;
  device_id:         string;
  raw_employee_id:   string;
  persona_id:        string | null;
  punch_time:        string;
  punch_type:        BiometricPunchType;
  raw_payload:       Record<string, unknown> | null;
  processed:         boolean;
  processed_at:      string | null;
  attendance_log_id: string | null;
  processing_error:  string | null;
  created_at:        string;
}
