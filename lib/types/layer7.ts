// Layer 7 — Bulk Upload types

export type BulkJobType   = 'student_enrollment';
export type BulkJobStatus =
  | 'uploaded'
  | 'validated'
  | 'validation_failed'
  | 'awaiting_approval'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'rejected';

export interface BulkValidationError {
  row:     number;
  column:  string;
  message: string;
}

export interface BulkValidationSummary {
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  errors:     BulkValidationError[];
  preview:    Record<string, string>[];
}

export interface BulkUploadJob {
  id:                        string;
  school_id:                 string;
  workflow_instance_id:      string | null;
  job_type:                  BulkJobType;
  job_number:                string;
  file_name:                 string;
  validation_summary:        BulkValidationSummary | null;
  parsed_rows:               Record<string, string>[] | null;
  total_rows:                number;
  processed_rows:            number;
  error_log:                 Record<string, unknown>[];
  uploaded_by_persona_id:    string;
  uploaded_by_name_snapshot: string;
  approved_by_persona_id:    string | null;
  approved_by_name_snapshot: string | null;
  approved_at:               string | null;
  status:                    BulkJobStatus;
  notes:                     string | null;
  created_at:                string;
  completed_at:              string | null;
}

// ── الأعمدة المتوقعة لكل نوع رفع
export const JOB_TYPE_SCHEMA: Record<BulkJobType, {
  label:    string;
  required: string[];
  optional: string[];
  example:  string;
}> = {
  student_enrollment: {
    label:    'تسجيل طلاب',
    required: ['name', 'national_id'],
    optional: ['class_name', 'parent_phone', 'grade_level'],
    example:  'name,national_id,class_name,parent_phone,grade_level\nمحمد أحمد,1234567890,1A,0501234567,1',
  },
};
