import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import { runLrcMaintenance }         from '@/lib/jobs/lrc-maintenance-service';

// يُستدعى يومياً من Supabase Edge Function (daily-maintenance)
// Authorization: Bearer <CRON_SECRET>

export async function POST(req: NextRequest) {
  const auth   = req.headers.get('authorization') ?? '';
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  await Promise.all(
    (schools ?? []).map(async ({ id }: { id: string }) => {
      const lrcRes = await runLrcMaintenance(id);

      results[id] = lrcRes.ok ? lrcRes.data : { error: lrcRes.error };
      if (!lrcRes.ok) errors.push(`school ${id} lrc: ${lrcRes.error}`);
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

export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: '/api/cron/daily-maintenance' });
}
