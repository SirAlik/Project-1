export type CorrespondenceType = "incoming" | "outgoing";

export interface Employee {
    id: string;
    employee_id: string;
    name: string;
    position: string | null;
    department: string | null;
    phone: string | null;
    email: string | null;
    hire_date: string | null;
    status: 'active' | 'on_leave' | 'terminated';
    created_at: string;
}

export interface CorrespondenceRow {
    id: string;
    type: CorrespondenceType;
    subject: string;
    sender: string | null;
    receiver: string | null;
    date: string;
    status: "received" | "processed" | "archived" | "sent" | "draft" | "pending";
    attachment_url: string | null;
    reference_number?: string;
    priority?: 'urgent' | 'normal' | 'low';
    source_destination?: string;
    tracking_status?: string;
    assigned_to?: string;
    response_deadline?: string;
    created_at: string;
}

export interface LeaveRow {
    id: string;
    employee_id?: string;
    employee_name: string;
    start_date: string;
    end_date: string;
    type: string; // sick, annual, emergency, compassionate
    is_emergency: boolean;
    reason: string | null;
    substitute_name?: string;
    substitute_id?: string;
    status: "pending" | "approved" | "rejected";
    deputy_approval?: string;
    principal_approval?: string;
    created_at: string;
}

export interface AttendanceLog {
    id: string;
    employee_id: string;
    employee?: { name: string };
    log_date: string;
    arrival_time: string | null;
    departure_time: string | null;
    is_late: boolean;
    is_absent: boolean;
    absence_type?: 'excused' | 'unexcused';
    exit_reason?: string;
    exit_time?: string;
    return_time?: string;
    notes?: string;
    created_at: string;
}

export interface HRInquiry {
    id: string;
    attendance_log_id: string | null;
    employee_id: string;
    employee?: { name: string };
    type: 'late' | 'absence' | 'deduction';
    inquiry_date: string;
    incident_date: string | null;
    justification: string | null;
    justification_date: string | null;
    principal_decision: string | null;
    deduction_days: number;
    deduction_amount: number | null;
    status: 'pending_justification' | 'justified' | 'not_justified' | 'deducted' | 'closed';
    created_at: string;
}

export interface ClearanceItem {
    name: string;
    status: 'cleared' | 'pending';
    responsible?: string;
}

export interface AssignmentLetter {
    id: string;
    employee_id: string;
    letter_type: 'assignment' | 'commencement' | 'clearance';
    letter_number: string | null;
    issue_date: string;
    position_title?: string;
    department?: string;
    destination?: string;
    start_date?: string;
    end_date?: string;
    purpose?: string;
    clearance_items?: ClearanceItem[];
    last_working_day?: string;
    status: string;
    created_at: string;
}

export interface AgendaItem {
    text: string;
    duration?: number;
    presenter?: string;
}

export interface DecisionItem {
    text: string;
    responsible?: string;
    deadline?: string;
}

export interface Meeting {
    id: string;
    title: string;
    meeting_number: string | null;
    meeting_date: string;
    meeting_time: string | null;
    end_time: string | null;
    location: string | null;
    called_by: string | null;
    called_by_name?: string;
    meeting_type: string;
    agenda_items: AgendaItem[];
    minutes: string | null;
    decisions: DecisionItem[];
    recommendations?: DecisionItem[];
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    attendees?: MeetingAttendee[];
    created_at: string;
}

export interface MeetingAttendee {
    id: string;
    meeting_id: string;
    employee_id: string;
    employee_name: string | null;
    role: string;
    invited: boolean;
    attended: boolean | null;
    apology_reason: string | null;
    signature_time: string | null;
    created_at: string;
}

export interface ProcurementItem {
    name: string;
    qty: number;
    specs: string;
    unit_price?: number;
}

export interface ProcurementRequest {
    id: string;
    request_number: string;
    requested_by: string;
    requested_by_name: string | null;
    department: string | null;
    request_date: string;
    urgency: 'urgent' | 'normal';
    items: ProcurementItem[];
    total_estimated: number | null;
    justification: string | null;
    status: string;
    approval_notes: string | null;
    approved_by?: string;
    approval_date?: string;
    created_at: string;
}
