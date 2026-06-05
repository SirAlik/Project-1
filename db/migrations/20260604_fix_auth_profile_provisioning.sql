-- ============================================================
-- Phase 1 — إصلاح Auth/Profile Provisioning
-- ============================================================
-- المشكلة الحرجة A:
--   handle_new_user() في قاعدة البيانات الحية لا تزال تكتب
--   profiles.role = 'teacher' — هذا العمود حُذف في R04.
--   نتيجة: كل عملية تسجيل تفشل بخطأ 42703.
--
-- المشكلة الحرجة B:
--   block_privileged_field_changes() تفحص NEW.role / OLD.role
--   الذي حُذف في R04. نتيجة: أي UPDATE على جدول profiles
--   يفشل فوراً بخطأ 42703.
--
-- الحل: إعادة بناء كلتا الدالتين لإزالة كل إشارة لـ profiles.role
-- ملاحظة: profiles.role يجب ألا يعود أبداً — الأدوار المدرسية
--          تُدار عبر user_personas فقط.
-- ============================================================

BEGIN;

-- ─── Preflight ────────────────────────────────────────────────

DO $$
BEGIN
    -- تأكد أن profiles.role محذوف (ما يجب أن يكون عليه الوضع بعد R04)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'profiles'
          AND column_name  = 'role'
    ) THEN
        -- في حالة التطبيق على قاعدة بيانات حية قبل R04:
        -- الدالة المُعاد بناؤها لا تكتب هذا العمود، لذا تستمر بأمان.
        RAISE NOTICE 'تحذير: profiles.role لا يزال موجوداً — قد تكون R04 لم تُطبَّق بعد.';
        RAISE NOTICE 'هذه المهاجرة آمنة في كلتا الحالتين.';
    ELSE
        RAISE NOTICE 'Preflight ✓ — profiles.role غير موجود كما هو مطلوب.';
    END IF;
END $$;

-- ─── 1. handle_new_user() — إنشاء صف profiles مبسَّط فقط ───────

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- هذه الدالة لا تكتب سوى الحقول الأساسية للملف الشخصي.
    --   • عمود الدور المدرسي حُذف في R04 ولا يُكتب هنا إطلاقاً.
    --   • الأدوار المدرسية تُحدَّد عبر user_personas بعد قبول الدعوة.
    --   • system_role يأخذ القيمة الافتراضية 'system_user' من تعريف العمود.
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        created_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- منع الاستدعاء المباشر عبر API — هذه الدالة للـ trigger فقط
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- إعادة ربط الـ trigger (على حالة DROP ... CASCADE أزاله)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ─── 2. block_privileged_field_changes() — حذف فحص role ─────────

DROP FUNCTION IF EXISTS public.block_privileged_field_changes() CASCADE;

CREATE OR REPLACE FUNCTION public.block_privileged_field_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_system_role text;
BEGIN
    -- service_role: auth.uid() = NULL → اسمح بكل العمليات الإدارية
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;

    -- جلب system_role الخاص بالمستخدم الحالي
    SELECT system_role::text
    INTO v_caller_system_role
    FROM public.profiles
    WHERE id = auth.uid();

    -- system_owner مسموح له بتغيير أي حقل
    IF v_caller_system_role = 'system_owner' THEN
        RETURN NEW;
    END IF;

    -- ─── حقول محمية — لا يُسمح للمستخدم العادي بتعديلها ───────

    IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'Unauthorized: لا يمكن تغيير معرّف المستخدم.';
    END IF;

    -- ملاحظة هامة: profiles.role حُذف في R04 — لا يُشار إليه هنا إطلاقاً.
    -- أي إضافة مستقبلية لفحص role يجب أن تستخدم user_personas، ليس profiles.

    IF NEW.system_role IS DISTINCT FROM OLD.system_role THEN
        RAISE EXCEPTION 'Unauthorized: لا يمكن تغيير system_role مباشرةً.';
    END IF;

    IF NEW.default_persona_id IS DISTINCT FROM OLD.default_persona_id THEN
        -- السماح إذا كانت NULL (إلغاء الاختيار) أو إذا كانت الـ persona تخص المستخدم الحالي
        IF NEW.default_persona_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM public.user_personas
            WHERE id = NEW.default_persona_id AND user_id = auth.uid()
        ) THEN
            RAISE EXCEPTION 'Unauthorized: default_persona_id يجب أن تخص المستخدم الحالي.';
        END IF;
    END IF;

    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'Unauthorized: لا يمكن تغيير created_at.';
    END IF;

    RETURN NEW;
END;
$$;

-- منع الاستدعاء المباشر — هذه الدالة للـ trigger فقط
REVOKE EXECUTE ON FUNCTION public.block_privileged_field_changes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.block_privileged_field_changes() FROM anon;
REVOKE EXECUTE ON FUNCTION public.block_privileged_field_changes() FROM authenticated;

-- إعادة ربط الـ trigger
DROP TRIGGER IF EXISTS enforce_privileged_fields_immutability ON public.profiles;
CREATE TRIGGER enforce_privileged_fields_immutability
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.block_privileged_field_changes();

-- ─── Validation ───────────────────────────────────────────────

DO $$
DECLARE
    v_src     text;
    v_trigger text;
BEGIN
    -- التحقق من handle_new_user
    SELECT prosrc INTO v_src
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'handle_new_user';

    IF v_src IS NULL THEN
        RAISE EXCEPTION 'FAIL: handle_new_user() مفقودة بعد إعادة البناء';
    END IF;

    IF v_src ILIKE '%profiles.role%'
    OR v_src ILIKE '%, role,%'
    OR v_src ILIKE '%''teacher''%'
    OR v_src ILIKE '%role ==%' THEN
        RAISE EXCEPTION 'FAIL: handle_new_user() لا تزال تشير إلى profiles.role أو تعيّن teacher';
    END IF;

    -- التحقق من block_privileged_field_changes
    SELECT prosrc INTO v_src
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'block_privileged_field_changes';

    IF v_src IS NULL THEN
        RAISE EXCEPTION 'FAIL: block_privileged_field_changes() مفقودة بعد إعادة البناء';
    END IF;

    IF v_src ILIKE '%NEW.role%' OR v_src ILIKE '%OLD.role%' THEN
        RAISE EXCEPTION 'FAIL: block_privileged_field_changes() لا تزال تشير إلى NEW.role / OLD.role';
    END IF;

    -- التحقق من وجود الـ trigger على auth.users
    SELECT tgname INTO v_trigger
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'auth' AND c.relname = 'users' AND t.tgname = 'on_auth_user_created';

    IF v_trigger IS NULL THEN
        RAISE EXCEPTION 'FAIL: trigger on_auth_user_created مفقود على auth.users';
    END IF;

    RAISE NOTICE '✅ Phase 1 اكتمل بنجاح:';
    RAISE NOTICE '   handle_new_user()              — لا كتابة لـ profiles.role — Signup يعمل';
    RAISE NOTICE '   block_privileged_field_changes() — لا إشارة لـ NEW.role/OLD.role — UPDATE يعمل';
    RAISE NOTICE '   Trigger on_auth_user_created   — مرتبط ✓';
END $$;

COMMIT;
