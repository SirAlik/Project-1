export type WorkflowStatus = 'in_progress' | 'completed' | 'cancelled' | 'escalated';
export type ApprovalGateStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface WorkflowTransitionDef {
  from: string;
  to: string;
  action: string;
  actor: string;
}

export interface WorkflowStates {
  initial: string;
  final: string[];
  transitions: WorkflowTransitionDef[];
}

export interface WorkflowDefinition {
  id: string;
  workflow_code: string;
  display_name_ar: string;
  qms_form_codes: string[];
  states: WorkflowStates;
  required_roles: string[];
  iso_clause: string | null;
  is_active: boolean;
  created_at: string;
}

export interface WorkflowSubjectRef {
  table: string;
  id: string;
  type: string;
  display: string;
  school_id: string;
}

export interface WorkflowInstance {
  id: string;
  school_id: string;
  workflow_code: string;
  current_state: string;
  initiator_persona_id: string;
  initiator_role_snapshot: string;
  initiator_name_snapshot: string;
  subject_ref: WorkflowSubjectRef;
  context_data: Record<string, unknown> | null;
  due_date: string | null;
  status: WorkflowStatus;
  completed_at: string | null;
  created_at: string;
}

export interface WorkflowTransition {
  id: string;
  workflow_instance_id: string;
  school_id: string;
  from_state: string;
  to_state: string;
  action: string;
  is_system_action: boolean;
  actor_persona_id: string | null;
  actor_user_id: string | null;
  actor_role_snapshot: string | null;
  actor_name_snapshot: string | null;
  decision_notes: string | null;
  attachments: string[];
  signature_hash: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface ApprovalGate {
  id: string;
  workflow_instance_id: string;
  school_id: string;
  gate_name: string;
  required_role: string;
  assigned_to_persona_id: string | null;
  assigned_role: string;
  status: ApprovalGateStatus;
  is_delegated: boolean;
  decision_options: Record<string, unknown> | null;
  selected_option: string | null;
  justification: string | null;
  decided_by_persona_id: string | null;
  decided_by_user_id: string | null;
  decided_by_role_snapshot: string | null;
  decided_by_name_snapshot: string | null;
  decided_at: string | null;
  signature_hash: string | null;
  due_date: string | null;
  escalation_role: string | null;
  created_at: string;
}
