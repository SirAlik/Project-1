import { createSupabaseServerClient } from '../db/supabase-server';
import { getActivePersona }           from '../auth/context-service';
import { startWorkflow }              from '../workflow-service';
import type { WorkflowResult }        from '../workflow-service';
import { toSafeError }                from '../safe-error';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const WORK_START_HOUR   = 7;
const WORK_START_MINUTE = 30;
const GRACE_MINUTES     = 5;   // دقائق تسامح قبل احتساب التأخر

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function computeLateMinutes(arrivalTime: string): number {
  const [h, m] = arrivalTime.split(':').map(Number);
  const arrival = h * 60 + m;
  const start   = WORK_START_HOUR * 60 + WORK_START_MINUTE;
  return Math.max(0, arrival - start - GRACE_MINUTES);
}

// رقم تذكرة فريد داخل الجلسة — التفرد الفعلي يُضمن بـ UNIQUE(school_id, ticket_number) في DB
function makeTicketNumber(logDate: string): string {
  const datePart = logDate.replace(/-/g, '');
  const seq      = Date.now().toString().slice(-5);
  return `HAT-${datePart}-${seq}`;
}

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function resolveCreatorPersona(
  supabase: SupabaseClient,
  userId: string,
  schoolId: string,
  role: string,
): Promise<{ id: string; full_name: string } | null> {
  const { data: personaRow } = await supabase
    .from('user_personas')
    .select('id')
    .eq('user_id', userId)
    .eq('school_id', schoolId)
    .eq('role', role)
    .limit(1)
    .single();

  if (!personaRow) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single();

  return { id: personaRow.id, full_name: profile?.full_name ?? 'غير معروف' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RecordAttendanceInput {
  persona_id:      string;
  log_date:        string;          // YYYY-MM-DD
  arrival_time?:   string;          // HH:MM أو HH:MM:SS
  departure_time?: string;
  is_absent?:      boolean;
  absence_type?:   'excused' | 'unexcused' | 'medical' | 'emergency';
  notes?:          string;
}

export interface RecordAttendanceOutput {
  log_id:       string;
  is_late:      boolean;
  is_absent:    boolean;
  late_minutes: number;
}

export interface CreateTicketInput {
  attendance_log_id: string;
}

export interface CreateTicketOutput {
  ticket_id:     string;
  ticket_number: string;
}

export interface StartHRWorkflowOutput {
  instance_id:   string;
  current_state: string;
}

export interface AttendanceLogRow {
  id:                    string;
  persona_id:            string;
  persona_name_snapshot: string;
  persona_role_snapshot: string;
  log_date:              string;
  arrival_time:          string | null;
  departure_time:        string | null;
  is_late:               boolean;
  is_absent:             boolean;
  late_minutes:          number | null;
  absence_type:          string | null;
  source:                string;
  ticket_id:             string | null;
  notes:                 string | null;
  created_at:            string;
}

export interface AttendanceSummary {
  total:   number;
  present: number;
  late:    number;
  absent:  number;
  logs:    AttendanceLogRow[];
}

export interface HRTicketRow {
  id:                      string;
  ticket_number:           string;
  violation_type:          string;
  violation_date:          string;
  violation_details:       string | null;
  employee_name_snapshot:  string;
  employee_role_snapshot:  string;
  employee_response:       string | null;
  principal_decision:      string | null;
  status:                  string;
  workflow_instance_id:    string | null;
  created_by_name_snapshot: string;
  created_at:              string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. recordAttendance — تسجيل حضور موظف ليوم (UPSERT)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يُسجّل أو يُحدِّث سجل حضور موظف ليوم محدد.
 * يحسب التأخر تلقائياً من arrival_time مقارنةً بساعة 7:30 + هامش 5 دقائق.
 * يُستدعى من لوحة السكرتارية.
 */
export async function recordAttendance(
  input: RecordAttendanceInput,
): Promise<WorkflowResult<RecordAttendanceOutput>> {
  const persona = await getActivePersona();
  if (!persona || !persona.schoolId) {
    return { ok: false, error: 'يرجى تسجيل الدخول بسياق مدرسة' };
  }

  const supabase = await createSupabaseServerClient();

  // جلب بيانات الموظف
  const { data: targetPersona } = await supabase
    .from('user_personas')
    .select('id, role, user_id')
    .eq('id', input.persona_id)
    .eq('school_id', persona.schoolId)
    .single();

  if (!targetPersona) {
    return { ok: false, error: 'الموظف غير موجود في هذه المدرسة' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', targetPersona.user_id)
    .single();

  const creator = await resolveCreatorPersona(
    supabase, persona.userId, persona.schoolId, persona.role,
  );

  // حساب التأخر
  const isAbsent     = input.is_absent ?? false;
  const lateMinutes  = input.arrival_time && !isAbsent
    ? computeLateMinutes(input.arrival_time)
    : 0;
  const isLate = lateMinutes > 0;

  const { data: log, error } = await supabase
    .from('staff_attendance_logs')
    .upsert(
      {
        school_id:             persona.schoolId,
        persona_id:            input.persona_id,
        persona_name_snapshot: profile?.full_name ?? 'غير معروف',
        persona_role_snapshot: targetPersona.role,
        log_date:              input.log_date,
        arrival_time:          input.arrival_time   ?? null,
        departure_time:        input.departure_time ?? null,
        is_late:               isLate,
        is_absent:             isAbsent,
        late_minutes:          lateMinutes > 0 ? lateMinutes : null,
        absence_type:          input.absence_type   ?? null,
        source:                'manual',
        notes:                 input.notes          ?? null,
        created_by_persona_id: creator?.id          ?? null,
      },
      { onConflict: 'persona_id,log_date', ignoreDuplicates: false },
    )
    .select('id')
    .single();

  if (error || !log) {
    return { ok: false, error: toSafeError('[hr-attendance] record', error, 'تعذّر تسجيل الحضور، يرجى المحاولة لاحقاً') };
  }

  return {
    ok: true,
    data: { log_id: log.id, is_late: isLate, is_absent: isAbsent, late_minutes: lateMinutes },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. createViolationTicket — إنشاء تذكرة مساءلة من سجل مخالفة
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يُنشئ تذكرة hr_accountability_ticket لسجل حضور يحمل مخالفة (تأخر أو غياب).
 * يُحدِّث staff_attendance_logs.ticket_id بعد الإنشاء.
 * يُستدعى من السكرتير بعد مراجعة السجلات اليومية.
 */
export async function createViolationTicket(
  input: CreateTicketInput,
): Promise<WorkflowResult<CreateTicketOutput>> {
  const persona = await getActivePersona();
  if (!persona || !persona.schoolId) {
    return { ok: false, error: 'يرجى تسجيل الدخول بسياق مدرسة' };
  }

  const supabase = await createSupabaseServerClient();

  const { data: log } = await supabase
    .from('staff_attendance_logs')
    .select('id, school_id, persona_id, persona_name_snapshot, persona_role_snapshot, log_date, is_late, is_absent, late_minutes, absence_type, ticket_id')
    .eq('id', input.attendance_log_id)
    .single();

  if (!log)              return { ok: false, error: 'سجل الحضور غير موجود' };
  if (!log.is_late && !log.is_absent) return { ok: false, error: 'لا توجد مخالفة في هذا السجل' };
  if (log.ticket_id)     return { ok: false, error: 'سبق إنشاء تذكرة لهذا السجل' };

  const creator = await resolveCreatorPersona(
    supabase, persona.userId, persona.schoolId, persona.role,
  );
  if (!creator) return { ok: false, error: 'تعذّر التحقق من هوية السكرتير' };

  const violationType = log.is_absent ? 'absence' : 'late';
  const details       = log.is_late
    ? `تأخر ${log.late_minutes} دقيقة عن موعد الدوام`
    : `غياب${log.absence_type ? ` (${log.absence_type})` : ' بدون مبرر'}`;

  const { data: ticket, error: ticketErr } = await supabase
    .from('hr_accountability_tickets')
    .insert({
      school_id:                log.school_id,
      ticket_number:            makeTicketNumber(log.log_date),
      violation_type:           violationType,
      violation_date:           log.log_date,
      violation_details:        details,
      employee_persona_id:      log.persona_id,
      employee_name_snapshot:   log.persona_name_snapshot,
      employee_role_snapshot:   log.persona_role_snapshot,
      status:                   'open',
      created_by_persona_id:    creator.id,
      created_by_name_snapshot: creator.full_name,
    })
    .select('id, ticket_number')
    .single();

  if (ticketErr || !ticket) {
    return { ok: false, error: toSafeError('[hr-attendance] ticket', ticketErr, 'تعذّر إنشاء التذكرة، يرجى المحاولة لاحقاً') };
  }

  // ربط التذكرة بسجل الحضور
  await supabase
    .from('staff_attendance_logs')
    .update({ ticket_id: ticket.id })
    .eq('id', input.attendance_log_id);

  return { ok: true, data: { ticket_id: ticket.id, ticket_number: ticket.ticket_number } };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. startHRWorkflow — إطلاق HR_ATTENDANCE workflow لتذكرة موجودة
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يُطلق HR_ATTENDANCE workflow لتذكرة مساءلة بحالة 'open'.
 * يُحدِّث التذكرة بـ workflow_instance_id وينقلها لـ 'awaiting_response'.
 * يُستدعى من السكرتير بعد مراجعة التذكرة.
 */
export async function startHRWorkflow(
  ticketId: string,
): Promise<WorkflowResult<StartHRWorkflowOutput>> {
  const persona = await getActivePersona();
  if (!persona || !persona.schoolId) {
    return { ok: false, error: 'يرجى تسجيل الدخول بسياق مدرسة' };
  }

  const supabase = await createSupabaseServerClient();

  const { data: ticket } = await supabase
    .from('hr_accountability_tickets')
    .select('id, school_id, ticket_number, employee_name_snapshot, violation_date, violation_type, workflow_instance_id, status')
    .eq('id', ticketId)
    .single();

  if (!ticket)                   return { ok: false, error: 'التذكرة غير موجودة' };
  if (ticket.workflow_instance_id) return { ok: false, error: 'سبق إطلاق workflow لهذه التذكرة' };
  if (ticket.status !== 'open')  return { ok: false, error: `لا يمكن إطلاق workflow لتذكرة بحالة "${ticket.status}"` };

  const wfResult = await startWorkflow({
    workflow_code: 'HR_ATTENDANCE',
    subject_ref: {
      table:     'hr_accountability_tickets',
      id:        ticket.id,
      type:      'مساءلة حضور',
      display:   `${ticket.employee_name_snapshot} — ${ticket.violation_date}`,
      school_id: ticket.school_id,
    },
    context_data: {
      ticket_number:  ticket.ticket_number,
      violation_type: ticket.violation_type,
      violation_date: ticket.violation_date,
    },
  });

  if (!wfResult.ok) return wfResult;

  // ربط الـ workflow بالتذكرة + تحديث الحالة
  await supabase
    .from('hr_accountability_tickets')
    .update({
      workflow_instance_id: wfResult.data.instance_id,
      status:               'awaiting_response',
    })
    .eq('id', ticketId);

  return {
    ok: true,
    data: { instance_id: wfResult.data.instance_id, current_state: wfResult.data.current_state },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. getAttendanceSummary — ملخص حضور يوم لمدرسة المستخدم
// ─────────────────────────────────────────────────────────────────────────────

export async function getAttendanceSummary(
  logDate: string,
): Promise<WorkflowResult<AttendanceSummary>> {
  const persona = await getActivePersona();
  if (!persona || !persona.schoolId) {
    return { ok: false, error: 'يرجى تسجيل الدخول' };
  }

  const supabase = await createSupabaseServerClient();

  const { data: logs, error } = await supabase
    .from('staff_attendance_logs')
    .select('id, persona_id, persona_name_snapshot, persona_role_snapshot, log_date, arrival_time, departure_time, is_late, is_absent, late_minutes, absence_type, source, ticket_id, notes, created_at')
    .eq('school_id', persona.schoolId)
    .eq('log_date', logDate)
    .order('persona_name_snapshot', { ascending: true });

  if (error) return { ok: false, error: toSafeError('[hr-attendance] list', error) };

  const rows = (logs ?? []) as AttendanceLogRow[];
  return {
    ok: true,
    data: {
      total:   rows.length,
      present: rows.filter(r => !r.is_absent).length,
      late:    rows.filter(r => r.is_late).length,
      absent:  rows.filter(r => r.is_absent).length,
      logs:    rows,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. getHRTickets — قائمة التذاكر للسكرتارية
// ─────────────────────────────────────────────────────────────────────────────

export async function getHRTickets(
  status?: string,
): Promise<WorkflowResult<HRTicketRow[]>> {
  const persona = await getActivePersona();
  if (!persona || !persona.schoolId) {
    return { ok: false, error: 'يرجى تسجيل الدخول' };
  }

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('hr_accountability_tickets')
    .select('id, ticket_number, violation_type, violation_date, violation_details, employee_name_snapshot, employee_role_snapshot, employee_response, principal_decision, status, workflow_instance_id, created_by_name_snapshot, created_at')
    .eq('school_id', persona.schoolId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) return { ok: false, error: toSafeError('[hr-attendance] list', error) };

  return { ok: true, data: (data ?? []) as HRTicketRow[] };
}
