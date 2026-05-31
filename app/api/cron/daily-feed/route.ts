import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import { runFullFeed }               from '@/lib/jobs/analytics-feeder';
import { runAutomationEngine }       from '@/lib/jobs/automation-service';
import { processNotificationQueue }  from '@/lib/jobs/notification-queue-processor';

// يُستدعى يومياً من Vercel Cron أو Supabase Edge Function
// Authorization: Bearer <CRON_SECRET>

export async function POST(req: NextRequest) {
  // ── التحقق من السر ──────────────────────────────────────────
  const auth   = req.headers.get('authorization') ?? '';
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── جلب جميع المدارس ────────────────────────────────────────
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: schools, error: schErr } = await admin
    .from('schools')
    .select('id');

  if (schErr) {
    return NextResponse.json({ error: schErr.message }, { status: 500 });
  }

  const results: Record<string, unknown> = {};
  const errors:  string[] = [];

  // ── تشغيل الـ feed والأتمتة لكل مدرسة بالتوازي ─────────────
  await Promise.all(
    (schools ?? []).map(async ({ id }: { id: string }) => {
      // الترتيب: feed أولاً، ثم automation، ثم تسليم الإشعارات
      const feedRes = await runFullFeed(id);
      const [autoRes, queueRes] = await Promise.all([
        runAutomationEngine(id),
        processNotificationQueue(id),
      ]);

      if (feedRes.ok) {
        results[id] = {
          feed:       feedRes.data,
          automation: autoRes.ok  ? autoRes.data  : { error: autoRes.error },
          queue:      queueRes.ok ? queueRes.data : { error: queueRes.error },
        };
      } else {
        errors.push(`school ${id} feed: ${feedRes.error}`);
        if (!autoRes.ok)  errors.push(`school ${id} automation: ${autoRes.error}`);
        if (!queueRes.ok) errors.push(`school ${id} queue: ${queueRes.error}`);
      }
    }),
  );

  return NextResponse.json({
    ok:            errors.length === 0,
    schools_count: schools?.length ?? 0,
    results,
    errors,
    ran_at:        new Date().toISOString(),
  });
}

// GET للتحقق من الصحة (health check) — بدون تشغيل الـ feed
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: '/api/cron/daily-feed' });
}
