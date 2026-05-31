// Supabase Edge Function — daily-feed
// يُجدوَل يومياً عبر Supabase Cron (Dashboard → Edge Functions → Schedule)
// يستدعي /api/cron/daily-feed في تطبيق Next.js
//
// متغيرات البيئة المطلوبة (Supabase Dashboard → Settings → Edge Functions):
//   APP_URL      — رابط تطبيق Next.js (مثال: https://sidra-os.vercel.app)
//   CRON_SECRET  — نفس القيمة في .env.local

const APP_URL     = Deno.env.get('APP_URL');
const CRON_SECRET = Deno.env.get('CRON_SECRET');

Deno.serve(async (): Promise<Response> => {
  if (!APP_URL || !CRON_SECRET) {
    return new Response(
      JSON.stringify({ error: 'APP_URL أو CRON_SECRET غير مضبوطَين' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let res: Response;
  try {
    res = await fetch(`${APP_URL}/api/cron/daily-feed`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `فشل الاتصال: ${String(err)}` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const body = await res.text();
  return new Response(body, {
    status:  res.status,
    headers: { 'Content-Type': 'application/json' },
  });
});
