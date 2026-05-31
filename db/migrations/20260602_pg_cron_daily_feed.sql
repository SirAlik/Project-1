-- M76: pg_cron + pg_net — جدولة استدعاء /api/cron/daily-feed يومياً 03:00 Asia/Riyadh (00:00 UTC)
--
-- بعد النشر، قم بتشغيل الأوامر التالية لتفعيل الجدولة:
--   ALTER DATABASE postgres SET app.cron_site_url = 'https://your-app.vercel.app';
--   ALTER DATABASE postgres SET app.cron_secret   = '<CRON_SECRET>';
--
-- pg_cron + pg_net متاحان على Supabase Pro+. إذا لم يكونا مثبتَين، فعّلهما من
-- لوحة تحكم Supabase → Database → Extensions، ثم أعد تطبيق هذا الملف.

-- ─── Extensions ───────────────────────────────────────────────────────────────
DO $$
BEGIN
  EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_cron';
EXCEPTION WHEN others THEN
  RAISE NOTICE 'pg_cron غير متوفر في هذه الخطة: % — الجدولة التلقائية غير فعالة', SQLERRM;
END;
$$;

DO $$
BEGIN
  EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_net';
EXCEPTION WHEN others THEN
  RAISE NOTICE 'pg_net غير متوفر في هذه الخطة: % — الجدولة التلقائية غير فعالة', SQLERRM;
END;
$$;

-- ─── Helper function ──────────────────────────────────────────────────────────
-- تقرأ عنوان التطبيق والسر من إعدادات قاعدة البيانات.
-- SECURITY DEFINER تتيح للـ cron job تشغيلها بصلاحية postgres.
CREATE OR REPLACE FUNCTION public.cron_trigger_daily_feed()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url    text := current_setting('app.cron_site_url', true);
  v_secret text := current_setting('app.cron_secret',   true);
BEGIN
  IF coalesce(v_url, '') = '' OR coalesce(v_secret, '') = '' THEN
    RAISE NOTICE 'cron_trigger_daily_feed: app.cron_site_url أو app.cron_secret غير مضبوطَين — تم التخطي';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     => v_url || '/api/cron/daily-feed',
    headers => jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body    => '{}'::jsonb
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cron_trigger_daily_feed() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cron_trigger_daily_feed() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cron_trigger_daily_feed() FROM authenticated;

-- ─── Schedule ────────────────────────────────────────────────────────────────
-- يعمل فقط إذا كان pg_cron مثبتاً. آمن تماماً إذا لم يكن كذلك.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- إزالة الجدول القديم إذا وُجد (idempotent)
    BEGIN
      PERFORM cron.unschedule('daily-analytics-feed');
    EXCEPTION WHEN others THEN NULL;
    END;

    -- 00:00 UTC = 03:00 Asia/Riyadh كل يوم
    PERFORM cron.schedule(
      'daily-analytics-feed',
      '0 0 * * *',
      $cron$ SELECT public.cron_trigger_daily_feed(); $cron$
    );

    RAISE NOTICE 'تم جدولة daily-analytics-feed: كل يوم 00:00 UTC (03:00 Asia/Riyadh)';
  ELSE
    RAISE NOTICE 'pg_cron غير مثبت — تم تخطي الجدولة. فعّله من لوحة Supabase ثم أعد تطبيق هذا الملف.';
  END IF;
END;
$$;
