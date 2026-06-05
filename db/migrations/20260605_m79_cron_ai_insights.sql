-- =================================================================
-- M79: جدولة AI Insights + إعداد cron secrets
-- التاريخ: 2026-06-05 (مُصحَّح بعد فحص DB الحية 2026-06-05)
-- =================================================================
-- البنود:
--   1. إضافة مفاتيح cron_site_url + cron_secret إلى app_private.secrets
--      (placeholder values — تُستبدل عند الإطلاق)
--   2. دالة get_cron_setting(p_name) SECURITY DEFINER — تقرأ app_private.secrets
--      مع fallback إلى current_setting (لتوافق الإعدادات القديمة)
--   3. تحديث cron_trigger_daily_feed() لاستخدام get_cron_setting
--   4. إنشاء cron_trigger_ai_insights() — نفس النمط
--   5. جدولة AI insights عبر pg_cron: 01:00 UTC يومياً (04:00 Asia/Riyadh)
--
-- مخطط app_private.secrets الحي (مُتحقَّق منه 2026-06-05):
--   name       text  NOT NULL  PRIMARY KEY
--   secret     text  NOT NULL
--   created_at timestamptz NOT NULL DEFAULT now()
--
-- تعليمات الإطلاق:
--   قبل أي وظيفة cron حقيقية، حدِّث القيم في app_private.secrets:
--     UPDATE app_private.secrets SET secret = 'https://your-app.vercel.app'
--       WHERE name = 'cron_site_url';
--     UPDATE app_private.secrets SET secret = '<your-CRON_SECRET>'
--       WHERE name = 'cron_secret';
--   ملاحظة: هذه التعليمات تُنفَّذ من Supabase SQL Editor (بصلاحية postgres) — لا تُكتب في كود.
--
-- المتطلبات:
--   ✅ M4: app_private schema + app_private.secrets (20260604_rebuild_gamification_ledger.sql)
--   ✅ M76: pg_cron + cron_trigger_daily_feed (20260602_pg_cron_daily_feed.sql)
-- =================================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════
-- 1. Preflight
-- ════════════════════════════════════════════════════════════════
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.schemata
        WHERE schema_name = 'app_private'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: app_private schema غير موجود — طبِّق Phase 4 migration أولاً';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'app_private' AND table_name = 'secrets'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: app_private.secrets غير موجود — طبِّق Phase 4 migration أولاً';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'app_private'
          AND table_name   = 'secrets'
          AND column_name  = 'secret'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: العمود secret غير موجود في app_private.secrets — تحقق من مخطط الجدول';
    END IF;

    RAISE NOTICE 'Preflight ✓ (مخطط app_private.secrets: name/secret/created_at)';
END $$;

-- ════════════════════════════════════════════════════════════════
-- 2. إضافة مفاتيح cron إلى app_private.secrets
--    ON CONFLICT (name) DO NOTHING — name هو PRIMARY KEY
-- ════════════════════════════════════════════════════════════════
INSERT INTO app_private.secrets (name, secret)
VALUES
    ('cron_site_url', 'https://REPLACE_BEFORE_LAUNCH.vercel.app'),
    ('cron_secret',   'REPLACE_BEFORE_LAUNCH')
ON CONFLICT (name) DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- 3. دالة مساعدة: get_cron_setting(p_name)
--    SECURITY DEFINER — تقرأ app_private.secrets (محجوبة بـ RLS)
--    Fallback: current_setting لتوافق الإعدادات القديمة
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_cron_setting(p_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
AS $$
DECLARE
    v_val text;
BEGIN
    -- المصدر الأساسي: app_private.secrets (العمود: secret)
    SELECT secret INTO v_val
    FROM app_private.secrets
    WHERE name = p_name
    LIMIT 1;

    -- fallback: current_setting (للإعدادات المضبوطة عبر ALTER DATABASE)
    IF coalesce(v_val, '') = '' OR v_val LIKE '%REPLACE_BEFORE_LAUNCH%' THEN
        v_val := current_setting('app.' || p_name, true);
    END IF;

    RETURN coalesce(v_val, '');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_cron_setting(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_cron_setting(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_cron_setting(text) FROM authenticated;

-- ════════════════════════════════════════════════════════════════
-- 4. تحديث cron_trigger_daily_feed() لاستخدام get_cron_setting
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.cron_trigger_daily_feed()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_url    text := public.get_cron_setting('cron_site_url');
    v_secret text := public.get_cron_setting('cron_secret');
BEGIN
    IF coalesce(v_url, '') = '' OR coalesce(v_secret, '') = ''
       OR v_url    LIKE '%REPLACE_BEFORE_LAUNCH%'
       OR v_secret LIKE '%REPLACE_BEFORE_LAUNCH%'
    THEN
        RAISE NOTICE 'cron_trigger_daily_feed: cron_site_url أو cron_secret غير مضبوطَين — تم التخطي';
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

-- ════════════════════════════════════════════════════════════════
-- 5. دالة cron_trigger_ai_insights()
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.cron_trigger_ai_insights()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_url    text := public.get_cron_setting('cron_site_url');
    v_secret text := public.get_cron_setting('cron_secret');
BEGIN
    IF coalesce(v_url, '') = '' OR coalesce(v_secret, '') = ''
       OR v_url    LIKE '%REPLACE_BEFORE_LAUNCH%'
       OR v_secret LIKE '%REPLACE_BEFORE_LAUNCH%'
    THEN
        RAISE NOTICE 'cron_trigger_ai_insights: cron_site_url أو cron_secret غير مضبوطَين — تم التخطي';
        RETURN;
    END IF;

    PERFORM net.http_post(
        url     => v_url || '/api/cron/ai-insights',
        headers => jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || v_secret
        ),
        body    => '{}'::jsonb
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cron_trigger_ai_insights() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cron_trigger_ai_insights() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cron_trigger_ai_insights() FROM authenticated;

-- ════════════════════════════════════════════════════════════════
-- 6. جدولة AI insights عبر pg_cron
--    01:00 UTC = 04:00 Asia/Riyadh (بعد daily-feed بساعة)
-- ════════════════════════════════════════════════════════════════
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        BEGIN
            PERFORM cron.unschedule('daily-ai-insights');
        EXCEPTION WHEN others THEN NULL;
        END;

        PERFORM cron.schedule(
            'daily-ai-insights',
            '0 1 * * *',
            $cron$ SELECT public.cron_trigger_ai_insights(); $cron$
        );

        RAISE NOTICE 'تم جدولة daily-ai-insights: كل يوم 01:00 UTC (04:00 Asia/Riyadh)';
    ELSE
        RAISE NOTICE 'pg_cron غير مثبت — تم تخطي جدولة AI insights';
    END IF;
END;
$$;

-- ════════════════════════════════════════════════════════════════
-- 7. التحقق النهائي
-- ════════════════════════════════════════════════════════════════
DO $$
DECLARE
    v_keys_count    integer;
    v_fn_ai_exists  boolean;
    v_fn_get_exists boolean;
BEGIN
    SELECT COUNT(*) INTO v_keys_count
    FROM app_private.secrets
    WHERE name IN ('cron_site_url', 'cron_secret');

    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'cron_trigger_ai_insights'
    ) INTO v_fn_ai_exists;

    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'get_cron_setting'
    ) INTO v_fn_get_exists;

    IF v_keys_count < 2 THEN
        RAISE EXCEPTION 'FAIL: cron_site_url أو cron_secret مفقودان من app_private.secrets (العمود: name)';
    END IF;

    IF NOT v_fn_ai_exists THEN
        RAISE EXCEPTION 'FAIL: cron_trigger_ai_insights() غير موجودة';
    END IF;

    IF NOT v_fn_get_exists THEN
        RAISE EXCEPTION 'FAIL: get_cron_setting() غير موجودة';
    END IF;

    RAISE NOTICE '✅ M79 اكتمل:';
    RAISE NOTICE '   ✓ app_private.secrets يحتوي cron_site_url + cron_secret (placeholders)';
    RAISE NOTICE '   ✓ get_cron_setting() — SECURITY DEFINER — يقرأ العمود secret حيث name = p_name';
    RAISE NOTICE '   ✓ cron_trigger_daily_feed() محدَّثة لاستخدام get_cron_setting';
    RAISE NOTICE '   ✓ cron_trigger_ai_insights() — تستدعي /api/cron/ai-insights';
    RAISE NOTICE '   ✓ daily-ai-insights مجدوَل: 01:00 UTC يومياً';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  قبل الإطلاق: حدِّث القيم الفعلية في app_private.secrets:';
    RAISE NOTICE '   UPDATE app_private.secrets SET secret = ''https://your-app.vercel.app'' WHERE name = ''cron_site_url'';';
    RAISE NOTICE '   UPDATE app_private.secrets SET secret = ''<CRON_SECRET>'' WHERE name = ''cron_secret'';';
END $$;

COMMIT;
