import { NextRequest, NextResponse } from 'next/server';
import { runAIInsightsJob }          from '@/lib/jobs/ai-insights-job';

// يُستدعى يومياً من pg_cron عبر cron_trigger_ai_insights() أو من daily-maintenance Edge Function
// Authorization: Bearer <CRON_SECRET>

export async function POST(req: NextRequest) {
  const auth   = req.headers.get('authorization') ?? '';
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runAIInsightsJob();

  return NextResponse.json({
    ok:     result.ok,
    data:   result.ok ? result.data : null,
    error:  result.ok ? null : result.error,
    ran_at: new Date().toISOString(),
  }, { status: result.ok ? 200 : 207 });
}

export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: '/api/cron/ai-insights' });
}
