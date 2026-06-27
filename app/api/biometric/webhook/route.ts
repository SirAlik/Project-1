import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual }           from 'crypto';
import { supabaseAdmin }             from '@/lib/db/supabase-admin';

// مقارنة سرّ ثابتة الزمن — تمنع timing attacks على الـwebhook secret.
// عدم تطابق الطول يُعيد false مباشرةً (تسريب طول السرّ فقط — مقبول).
function safeSecretEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// ─────────────────────────────────────────────────────────────────────────────
// Biometric Device Webhook
// POST /api/biometric/webhook
//
// الجهاز يُرسل:
//   Header: x-webhook-secret: <BIOMETRIC_WEBHOOK_SECRET>
//   Body: {
//     school_id: string,
//     device_id: string,
//     punches: [{ employee_id: string, punch_time: string, punch_type?: 'in'|'out'|'unknown' }]
//   }
//
// النظام يُخزّن السجلات الخام في biometric_logs.
// معالجة السجلات → staff_attendance_logs تتم عبر cron job منفصل.
// ─────────────────────────────────────────────────────────────────────────────

interface BiometricPunch {
  employee_id: string;
  punch_time:  string;
  punch_type?: 'in' | 'out' | 'unknown';
}

interface WebhookPayload {
  school_id: string;
  device_id: string;
  punches:   BiometricPunch[];
}

function isValidPayload(body: unknown): body is WebhookPayload {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.school_id === 'string' && b.school_id.length > 0 &&
    typeof b.device_id === 'string' && b.device_id.length > 0 &&
    Array.isArray(b.punches) && b.punches.length > 0
  );
}

export async function POST(request: NextRequest) {
  // ── 1. التحقق من الـ webhook secret ──────────────────────────────────────
  const secret = process.env.BIOMETRIC_WEBHOOK_SECRET;
  if (!secret) {
    // لم يُهيَّأ بعد — fail closed
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 503 },
    );
  }

  const incoming = request.headers.get('x-webhook-secret');
  if (!incoming || !safeSecretEqual(incoming, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. تحليل الحمولة ─────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!isValidPayload(body)) {
    return NextResponse.json(
      { error: 'Missing required fields: school_id, device_id, punches[]' },
      { status: 400 },
    );
  }

  const { school_id, device_id, punches } = body;

  // ── 3. تحقق من صحة punch_time ────────────────────────────────────────────
  const validPunches = punches.filter(p => {
    if (!p.employee_id || typeof p.employee_id !== 'string') return false;
    if (!p.punch_time  || typeof p.punch_time  !== 'string') return false;
    const d = new Date(p.punch_time);
    return !isNaN(d.getTime());
  });

  if (validPunches.length === 0) {
    return NextResponse.json({ error: 'No valid punches' }, { status: 400 });
  }

  // ── 3b. ربط الجهاز بالمدرسة (fail-closed) ────────────────────────────────
  // الجهاز يجب أن يكون مسجَّلاً في biometric_devices ومطابقاً لـ school_id المُدّعى
  // ومُفعَّلاً — وإلا يُرفض. يمنع جهازاً من حقن حضور لمدرسة أخرى بتغيير school_id.
  const { data: device, error: deviceErr } = await supabaseAdmin
    .from('biometric_devices')
    .select('school_id, is_active')
    .eq('device_id', device_id)
    .maybeSingle();

  if (deviceErr) {
    console.error('[biometric-webhook] device lookup error:', deviceErr.message);
    return NextResponse.json({ error: 'Storage error' }, { status: 500 });
  }

  if (!device || device.is_active !== true || device.school_id !== school_id) {
    // رسالة واحدة لا تكشف سبب الرفض (غير مسجَّل/غير مطابق/غير مُفعَّل)
    console.error('[biometric-webhook] rejected unregistered or mismatched device');
    return NextResponse.json({ error: 'Unknown or unauthorized device' }, { status: 403 });
  }

  // ── 4. تخزين في biometric_logs (service role — يتجاوز RLS) ──────────────
  const rows = validPunches.map(p => ({
    school_id,
    device_id,
    raw_employee_id: p.employee_id,
    persona_id:      null,
    punch_time:      new Date(p.punch_time).toISOString(),
    punch_type:      p.punch_type ?? 'unknown',
    raw_payload:     p,
    processed:       false,
  }));

  const { error } = await supabaseAdmin
    .from('biometric_logs')
    .upsert(rows, {
      onConflict:       'device_id,raw_employee_id,punch_time',
      ignoreDuplicates: true,
    });

  if (error) {
    console.error('[biometric-webhook] insert error:', error.message);
    return NextResponse.json(
      { error: 'Storage error' },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { ok: true, received: rows.length, stored: rows.length },
    { status: 200 },
  );
}

// رفض أي طلب غير POST
export async function GET()    { return NextResponse.json({ error: 'Method not allowed' }, { status: 405 }); }
export async function DELETE() { return NextResponse.json({ error: 'Method not allowed' }, { status: 405 }); }
