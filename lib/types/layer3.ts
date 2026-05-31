// Layer 3: QMS Workflows — Generated Forms + Notifications

export interface GeneratedForm {
  id: string;
  school_id: string;
  form_code: string;
  source_table: string;
  source_record_id: string;
  workflow_instance_id: string | null;
  pdf_url: string | null;
  storage_path: string | null;
  is_ready: boolean;
  generated_at: string | null;
  form_data: Record<string, unknown> | null;
  created_at: string;
}

export type NotificationType =
  | 'gate_assigned'
  | 'gate_decided'
  | 'workflow_completed'
  | 'workflow_cancelled'
  | 'hr_ticket_created'
  | 'hr_response_required'
  | 'hr_decision_ready'
  | 'hr_archived'
  | 'wizard_submitted'
  | 'form_ready'
  | 'meeting_invited'
  | 'meeting_started'
  | 'minutes_ready';

export interface Notification {
  id: string;
  school_id: string;
  recipient_persona_id: string | null;
  recipient_role: string | null;
  notification_type: NotificationType | string;
  title: string;
  body: string | null;
  source_table: string | null;
  source_record_id: string | null;
  workflow_instance_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}
