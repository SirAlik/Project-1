'use server';

import { createSupabaseServerClient } from '../db/supabase-server';
import { getActivePersona }           from '../auth/context-service';
import { startWorkflow, advanceWorkflow } from '../workflow-service';
import type { WorkflowResult }        from '../workflow-service';
import { createGeneratedForm }        from '../quality/generated-forms';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MeetingInviteeOption {
  persona_id: string;
  full_name:  string;
  role:       string;
  job_title:  string | null;
}

export interface CreateMeetingInput {
  title:               string;
  meeting_type:        'regular' | 'emergency' | 'specialized' | 'management_review' | 'other';
  scheduled_date:      string;   // YYYY-MM-DD
  start_time:          string;   // HH:MM
  end_time?:           string;   // HH:MM
  location?:           string;
  agenda_items?:       string[];
  invitee_persona_ids: string[];
}

export interface AddNoteInput {
  note_type:        'discussion' | 'decision' | 'action_item' | 'attachment';
  content:          string;
  agenda_topic_idx?: number;
}

export interface ActionItemInput {
  task:                      string;
  assigned_to_persona_id:    string;
  assigned_to_name_snapshot: string;
  due_date?:                 string;
  priority?:                 'low' | 'medium' | 'high' | 'critical';
}

export interface EndMeetingInput {
  minutes:          string;
  decisions?:       string[];
  recommendations?: string[];
  action_items?:    ActionItemInput[];
}

export interface MeetingListItem {
  id:                      string;
  session_number:          string;
  title:                   string;
  meeting_type:            string;
  scheduled_date:          string;
  start_time:              string;
  location:                string | null;
  organizer_name_snapshot: string;
  status:                  string;
  created_at:              string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeSessionNumber(): string {
  const datePart = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const seq      = Date.now().toString().slice(-5);
  return `MTG-${datePart}-${seq}`;
}

const ORGANIZER_ROLES = [
  'school_principal',
  'school_admin',
  'school_secretary',
  'quality_coordinator',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// 1. getMyMeetings
// ─────────────────────────────────────────────────────────────────────────────

export async function getMyMeetings(): Promise<WorkflowResult<MeetingListItem[]>> {
  const persona = await getActivePersona();
  if (!persona || !persona.schoolId) {
    return { ok: false, error: 'يرجى تسجيل الدخول بسياق مدرسة' };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('meeting_sessions')
    .select(
      'id, session_number, title, meeting_type, scheduled_date, start_time, location, organizer_name_snapshot, status, created_at',
    )
    .eq('school_id', persona.schoolId)
    .order('scheduled_date', { ascending: false });

  if (error) return { ok: false, error: error.message };

  return { ok: true, data: (data ?? []) as MeetingListItem[] };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. getMeetingInviteeOptions — كل personas في المدرسة للاختيار من بينهم
// ─────────────────────────────────────────────────────────────────────────────

export async function getMeetingInviteeOptions(): Promise<WorkflowResult<MeetingInviteeOption[]>> {
  const persona = await getActivePersona();
  if (!persona || !persona.schoolId) {
    return { ok: false, error: 'يرجى تسجيل الدخول بسياق مدرسة' };
  }

  const supabase = await createSupabaseServerClient();

  const { data: personas, error } = await supabase
    .from('user_personas')
    .select('id, user_id, role, job_title')
    .eq('school_id', persona.schoolId);

  if (error) return { ok: false, error: error.message };
  if (!personas?.length) return { ok: true, data: [] };

  const userIds = personas.map((p) => p.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds);

  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p.full_name as string]),
  );

  return {
    ok: true,
    data: personas.map((p) => ({
      persona_id: p.id,
      full_name:  profileMap[p.user_id] ?? 'غير معروف',
      role:       p.role,
      job_title:  p.job_title ?? null,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. getMeetingById
// ─────────────────────────────────────────────────────────────────────────────

export async function getMeetingById(meetingId: string): Promise<WorkflowResult<{
  meeting:     Record<string, unknown>;
  attendees:   Record<string, unknown>[];
  notes:       Record<string, unknown>[];
  actionItems: Record<string, unknown>[];
}>> {
  const persona = await getActivePersona();
  if (!persona || !persona.schoolId) {
    return { ok: false, error: 'يرجى تسجيل الدخول' };
  }

  const supabase = await createSupabaseServerClient();

  const [meetingRes, attendeesRes, notesRes, actionItemsRes] = await Promise.all([
    supabase
      .from('meeting_sessions')
      .select('*')
      .eq('id', meetingId)
      .eq('school_id', persona.schoolId)
      .single(),
    supabase
      .from('meeting_session_attendees')
      .select('*')
      .eq('meeting_session_id', meetingId)
      .order('created_at'),
    supabase
      .from('meeting_live_notes')
      .select('*')
      .eq('meeting_session_id', meetingId)
      .order('created_at'),
    supabase
      .from('meeting_action_items')
      .select('*')
      .eq('meeting_session_id', meetingId)
      .order('created_at'),
  ]);

  if (meetingRes.error || !meetingRes.data) {
    return { ok: false, error: 'الاجتماع غير موجود أو لا تملك صلاحية الوصول إليه' };
  }

  return {
    ok: true,
    data: {
      meeting:     meetingRes.data as Record<string, unknown>,
      attendees:   (attendeesRes.data ?? []) as Record<string, unknown>[],
      notes:       (notesRes.data ?? []) as Record<string, unknown>[],
      actionItems: (actionItemsRes.data ?? []) as Record<string, unknown>[],
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. createMeeting
// ─────────────────────────────────────────────────────────────────────────────

export async function createMeeting(
  input: CreateMeetingInput,
): Promise<WorkflowResult<{ meeting_id: string; session_number: string }>> {
  const persona = await getActivePersona();
  if (!persona || !persona.schoolId) {
    return { ok: false, error: 'يرجى تسجيل الدخول بسياق مدرسة' };
  }

  const allowed = (ORGANIZER_ROLES as readonly string[]).includes(persona.role);
  if (!allowed && !persona.isSystemOwner) {
    return { ok: false, error: 'ليس لديك صلاحية إنشاء اجتماعات' };
  }

  const supabase = await createSupabaseServerClient();

  // جلب بيانات المنظِّم
  const { data: orgPersona } = await supabase
    .from('user_personas')
    .select('id')
    .eq('user_id', persona.userId)
    .eq('school_id', persona.schoolId)
    .eq('role', persona.role)
    .limit(1)
    .single();

  if (!orgPersona) return { ok: false, error: 'تعذّر التحقق من هوية المنظِّم' };

  const { data: orgProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', persona.userId)
    .single();

  const organizerName  = orgProfile?.full_name ?? persona.displayName ?? 'غير معروف';
  const sessionNumber  = makeSessionNumber();

  // إنشاء الاجتماع
  const { data: meeting, error: meetErr } = await supabase
    .from('meeting_sessions')
    .insert({
      school_id:               persona.schoolId,
      session_number:          sessionNumber,
      title:                   input.title,
      meeting_type:            input.meeting_type,
      scheduled_date:          input.scheduled_date,
      start_time:              input.start_time,
      end_time:                input.end_time ?? null,
      location:                input.location ?? null,
      organizer_persona_id:    orgPersona.id,
      organizer_name_snapshot: organizerName,
      agenda_items:            (input.agenda_items ?? []).map((text, i) => ({ idx: i, text })),
      status:                  'scheduled',
    })
    .select('id')
    .single();

  if (meetErr || !meeting) {
    return { ok: false, error: `فشل إنشاء الاجتماع: ${meetErr?.message}` };
  }

  // إضافة المدعوِّين
  if (input.invitee_persona_ids.length > 0) {
    const { data: inviteePersonas } = await supabase
      .from('user_personas')
      .select('id, role, user_id')
      .in('id', input.invitee_persona_ids)
      .eq('school_id', persona.schoolId);

    if (inviteePersonas?.length) {
      const userIds = inviteePersonas.map((p) => p.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profileMap = Object.fromEntries(
        (profiles ?? []).map((p) => [p.id, p.full_name as string]),
      );

      await supabase.from('meeting_session_attendees').insert(
        inviteePersonas.map((p) => ({
          meeting_session_id: meeting.id,
          school_id:          persona.schoolId!,
          persona_id:         p.id,
          name_snapshot:      profileMap[p.user_id] ?? 'غير معروف',
          role_snapshot:      p.role,
          is_invited:         true,
          attended:           false,
          rsvp_status:        'pending',
        })),
      );
    }
  }

  // إطلاق workflow
  const wfResult = await startWorkflow({
    workflow_code: 'MEETING',
    subject_ref: {
      table:     'meeting_sessions',
      id:        meeting.id,
      type:      'اجتماع',
      display:   `${input.title} — ${sessionNumber}`,
      school_id: persona.schoolId,
    },
    context_data: {
      session_number: sessionNumber,
      meeting_type:   input.meeting_type,
      organizer_name: organizerName,
    },
    due_date: input.scheduled_date,
  });

  if (wfResult.ok) {
    await supabase
      .from('meeting_sessions')
      .update({ workflow_instance_id: wfResult.data.instance_id })
      .eq('id', meeting.id);
  }

  // نموذج دعوة الاجتماع — الرمز المعتمد QF19-1 (alias تاريخي: QF-19-1).
  // عبر خدمة السجلّ المُبوّبة بسجلّ المستأجر (+ منع تكرار · school_id من سياق مصادَق).
  // best-effort: مدرسة غير مُسجَّلة ببرنامج جودة → لا سجل (fail-closed) دون إفشال إنشاء الاجتماع.
  await createGeneratedForm({
    formCode:           'QF19-1',
    sourceTable:        'meeting_sessions',
    sourceRecordId:     meeting.id,
    workflowInstanceId: wfResult.ok ? wfResult.data.instance_id : undefined,
    formData: {
      session_number:  sessionNumber,
      title:           input.title,
      meeting_type:    input.meeting_type,
      scheduled_date:  input.scheduled_date,
      start_time:      input.start_time,
      location:        input.location ?? null,
      organizer_name:  organizerName,
      agenda_items:    input.agenda_items ?? [],
      generated_at:    new Date().toISOString(),
    },
    isReady: false,
  });

  // إشعارات للمدعوِّين
  if (input.invitee_persona_ids.length > 0) {
    await supabase.from('notifications').insert(
      input.invitee_persona_ids.map((pid) => ({
        school_id:            persona.schoolId!,
        recipient_persona_id: pid,
        notification_type:    'meeting_invited',
        title:                `دعوة اجتماع: ${input.title}`,
        body:                 `دُعيت للمشاركة في اجتماع "${input.title}" بتاريخ ${input.scheduled_date} الساعة ${input.start_time}.`,
        source_table:         'meeting_sessions',
        source_record_id:     meeting.id,
        workflow_instance_id: wfResult.ok ? wfResult.data.instance_id : null,
      })),
    );
  }

  return { ok: true, data: { meeting_id: meeting.id, session_number: sessionNumber } };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. startMeeting
// ─────────────────────────────────────────────────────────────────────────────

export async function startMeeting(
  meetingId: string,
): Promise<WorkflowResult<null>> {
  const persona = await getActivePersona();
  if (!persona || !persona.schoolId) return { ok: false, error: 'يرجى تسجيل الدخول' };

  const supabase = await createSupabaseServerClient();

  const { data: meeting } = await supabase
    .from('meeting_sessions')
    .select('id, status, workflow_instance_id')
    .eq('id', meetingId)
    .eq('school_id', persona.schoolId)
    .single();

  if (!meeting) return { ok: false, error: 'الاجتماع غير موجود' };
  if (meeting.status !== 'scheduled') {
    return { ok: false, error: `لا يمكن بدء اجتماع في حالة: ${meeting.status}` };
  }

  await supabase
    .from('meeting_sessions')
    .update({ status: 'in_progress', actual_start_time: new Date().toISOString() })
    .eq('id', meetingId)
    .eq('school_id', persona.schoolId);

  if (meeting.workflow_instance_id) {
    await advanceWorkflow({
      workflow_instance_id: meeting.workflow_instance_id,
      action: 'start',
    });
  }

  return { ok: true, data: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. addNote
// ─────────────────────────────────────────────────────────────────────────────

export async function addNote(
  meetingId: string,
  input: AddNoteInput,
): Promise<WorkflowResult<{ note_id: string }>> {
  const persona = await getActivePersona();
  if (!persona || !persona.schoolId) return { ok: false, error: 'يرجى تسجيل الدخول' };

  const supabase = await createSupabaseServerClient();

  const { data: meeting } = await supabase
    .from('meeting_sessions')
    .select('id, status')
    .eq('id', meetingId)
    .eq('school_id', persona.schoolId)
    .single();

  if (!meeting) return { ok: false, error: 'الاجتماع غير موجود' };
  if (meeting.status !== 'in_progress') {
    return { ok: false, error: 'الاجتماع ليس قيد الانعقاد' };
  }

  const { data: authorPersona } = await supabase
    .from('user_personas')
    .select('id')
    .eq('user_id', persona.userId)
    .eq('school_id', persona.schoolId)
    .eq('role', persona.role)
    .limit(1)
    .single();

  if (!authorPersona) return { ok: false, error: 'تعذّر التحقق من الهوية' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', persona.userId)
    .single();

  const { data: note, error } = await supabase
    .from('meeting_live_notes')
    .insert({
      meeting_session_id:  meetingId,
      school_id:           persona.schoolId,
      author_persona_id:   authorPersona.id,
      author_name_snapshot: profile?.full_name ?? persona.displayName ?? 'غير معروف',
      note_type:           input.note_type,
      content:             input.content,
      agenda_topic_idx:    input.agenda_topic_idx ?? null,
    })
    .select('id')
    .single();

  if (error || !note) return { ok: false, error: `فشل حفظ الملاحظة: ${error?.message}` };

  return { ok: true, data: { note_id: note.id } };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. endMeeting
// ─────────────────────────────────────────────────────────────────────────────

export async function endMeeting(
  meetingId: string,
  input: EndMeetingInput,
): Promise<WorkflowResult<null>> {
  const persona = await getActivePersona();
  if (!persona || !persona.schoolId) return { ok: false, error: 'يرجى تسجيل الدخول' };

  const supabase = await createSupabaseServerClient();

  const { data: meeting } = await supabase
    .from('meeting_sessions')
    .select('id, status, workflow_instance_id, title, session_number')
    .eq('id', meetingId)
    .eq('school_id', persona.schoolId)
    .single();

  if (!meeting) return { ok: false, error: 'الاجتماع غير موجود' };
  if (meeting.status !== 'in_progress') {
    return { ok: false, error: 'الاجتماع ليس قيد الانعقاد' };
  }

  const endedAt = new Date().toISOString();

  // تحديث الاجتماع إلى awaiting_signatures
  await supabase
    .from('meeting_sessions')
    .update({
      status:          'awaiting_signatures',
      actual_end_time: endedAt,
      minutes:         input.minutes,
      decisions:       (input.decisions ?? []).map((text, i) => ({ idx: i, text })),
      recommendations: (input.recommendations ?? []).map((text, i) => ({ idx: i, text })),
    })
    .eq('id', meetingId)
    .eq('school_id', persona.schoolId);

  // إضافة بنود الإجراء
  if (input.action_items?.length) {
    await supabase.from('meeting_action_items').insert(
      input.action_items.map((ai) => ({
        meeting_session_id:        meetingId,
        school_id:                 persona.schoolId!,
        task:                      ai.task,
        assigned_to_persona_id:    ai.assigned_to_persona_id,
        assigned_to_name_snapshot: ai.assigned_to_name_snapshot,
        due_date:                  ai.due_date ?? null,
        priority:                  ai.priority ?? 'medium',
        status:                    'pending',
      })),
    );
  }

  // نموذج محضر الاجتماع — الرمز المعتمد QF19-2 (alias تاريخي: QF-19-2).
  // عبر خدمة السجلّ المُبوّبة (+ منع تكرار · school_id من سياق مصادَق · fail-closed).
  await createGeneratedForm({
    formCode:           'QF19-2',
    sourceTable:        'meeting_sessions',
    sourceRecordId:     meetingId,
    workflowInstanceId: meeting.workflow_instance_id ?? undefined,
    formData: {
      session_number:  meeting.session_number,
      title:           meeting.title,
      minutes:         input.minutes,
      decisions:       input.decisions ?? [],
      recommendations: input.recommendations ?? [],
      ended_at:        endedAt,
    },
    isReady: false,
  });

  // إشعارات لجميع المدعوِّين بأن المحضر جاهز للتوقيع
  const { data: attendees } = await supabase
    .from('meeting_session_attendees')
    .select('persona_id')
    .eq('meeting_session_id', meetingId)
    .eq('is_invited', true);

  const signablePersonas = (attendees ?? []).filter((a) => a.persona_id);
  if (signablePersonas.length > 0) {
    await supabase.from('notifications').insert(
      signablePersonas.map((a) => ({
        school_id:            persona.schoolId!,
        recipient_persona_id: a.persona_id!,
        notification_type:    'minutes_ready',
        title:                `محضر اجتماع "${meeting.title}" جاهز للتوقيع`,
        body:                 'يرجى الاطلاع على محضر الاجتماع والتوقيع الرقمي.',
        source_table:         'meeting_sessions',
        source_record_id:     meetingId,
        workflow_instance_id: meeting.workflow_instance_id,
      })),
    );
  }

  return { ok: true, data: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. signMinutes
// ─────────────────────────────────────────────────────────────────────────────

export async function signMinutes(
  meetingId: string,
): Promise<WorkflowResult<null>> {
  const persona = await getActivePersona();
  if (!persona || !persona.schoolId) return { ok: false, error: 'يرجى تسجيل الدخول' };

  const supabase = await createSupabaseServerClient();

  const { data: personaRow } = await supabase
    .from('user_personas')
    .select('id')
    .eq('user_id', persona.userId)
    .eq('school_id', persona.schoolId)
    .eq('role', persona.role)
    .limit(1)
    .single();

  if (!personaRow) return { ok: false, error: 'تعذّر التحقق من الهوية' };

  const signatureHash = `${personaRow.id.slice(0, 8)}-${meetingId.slice(0, 8)}-${Date.now()}`;

  const { error } = await supabase
    .from('meeting_session_attendees')
    .update({
      signature_time: new Date().toISOString(),
      signature_hash: signatureHash,
    })
    .eq('meeting_session_id', meetingId)
    .eq('persona_id', personaRow.id)
    .eq('school_id', persona.schoolId);

  if (error) return { ok: false, error: `فشل التوقيع: ${error.message}` };

  // التحقق إذا اكتملت جميع التوقيعات
  const { data: unsigned } = await supabase
    .from('meeting_session_attendees')
    .select('id')
    .eq('meeting_session_id', meetingId)
    .eq('school_id', persona.schoolId)
    .eq('is_invited', true)
    .is('signature_time', null);

  if (!unsigned?.length) {
    await supabase
      .from('meeting_sessions')
      .update({ status: 'minutes_signed' })
      .eq('id', meetingId);
  }

  return { ok: true, data: null };
}
