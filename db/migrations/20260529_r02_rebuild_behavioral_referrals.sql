-- =================================================================
-- R02: إعادة بناء behavioral_referrals بالنمط الذهبي
-- التاريخ: 2026-05-29
-- المشروع: Smart School OS 2.0
-- =================================================================
-- الهدف:
--   إعادة بناء behavioral_referrals من الصفر بعد حذفها في R01.
--   النسخة القديمة:
--     • لا school_id
--     • تشير لـ auth.users مباشرة (vp_id, counselor_id)
--     • لا RLS صحيحة
--   النسخة الجديدة:
--     • school_id NOT NULL → عزل متعدد المستأجرين
--     • referred_by_persona_id → user_personas (بدلاً من vp_id → auth.users)
--     • counselor_persona_id → user_personas (بدلاً من counselor_id → auth.users)
--     • UNIQUE (id, school_id) → دعم composite FK مستقبلاً
--     • RLS بالنمط الذهبي (Golden Pattern)
--
-- ملاحظة مهمة:
--   fn_auto_referral_on_absence() في 20260528_student_daily_attendance.sql
--   تُدرج في behavioral_referrals بدون school_id — ستنكسر بعد هذا الملف.
--   سيتم إصلاحها في R03 بتمرير school_id = NEW.school_id.
--
-- التبعيات:
--   R00 ✅ (get_my_school_id() تعمل من JWT)
--   R01 ✅ (behavioral_referrals محذوفة + legacy tables محذوفة)
--   referral_type + referral_status (أنواع لا تزال موجودة — تُحذف وتُعاد هنا)
-- =================================================================

BEGIN;

-- ============================================================
-- Preflight: التحقق من أن behavioral_referrals محذوفة فعلاً من R01
-- ============================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'behavioral_referrals'
    ) THEN
        RAISE EXCEPTION
            'PREFLIGHT FAILED: behavioral_referrals لا تزال موجودة — '
            'يجب تطبيق R01 أولاً أو حذف الجدول يدوياً';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_personas'
    ) THEN
        RAISE EXCEPTION
            'PREFLIGHT FAILED: user_personas غير موجودة — '
            'الجدول مطلوب كـ FK لـ referred_by_persona_id و counselor_persona_id';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'student_profiles'
    ) THEN
        RAISE EXCEPTION
            'PREFLIGHT FAILED: student_profiles غير موجودة — '
            'الجدول مطلوب كـ FK لـ student_id';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'schools'
    ) THEN
        RAISE EXCEPTION
            'PREFLIGHT FAILED: schools غير موجودة — '
            'الجدول مطلوب كـ FK لـ school_id';
    END IF;

    RAISE NOTICE 'Preflight: behavioral_referrals محذوفة + user_personas + student_profiles + schools موجودة ✓';
END $$;

-- ============================================================
-- حذف الأنواع القديمة (لا تزال موجودة من قبل R01)
-- ============================================================
-- referral_type و referral_status لم تُحذف في R01 عمداً — تُحذف هنا
-- مع CASCADE لأن behavioral_referrals محذوفة بالفعل فلا مخاطرة.

DROP TYPE IF EXISTS public.referral_status CASCADE;
DROP TYPE IF EXISTS public.referral_type CASCADE;

-- ============================================================
-- إنشاء الأنواع الجديدة
-- ============================================================

CREATE TYPE public.referral_type AS ENUM (
    'lateness',   -- تأخر متكرر
    'absence',    -- غياب متكرر
    'behavior',   -- سلوك مخالف
    'academic'    -- تراجع أكاديمي
);

CREATE TYPE public.referral_status AS ENUM (
    'draft',               -- مسودة (لم تُرسل بعد)
    'pending_counselor',   -- بانتظار المرشد
    'in_progress',         -- قيد المعالجة
    'resolved',            -- تم الحل
    'escalated'            -- مُصعَّدة لمدير المدرسة
);

-- ============================================================
-- إنشاء الجدول الجديد (النمط الذهبي)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.behavioral_referrals (
    id                     uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id              uuid        NOT NULL REFERENCES public.schools(id),

    -- الطالب المُحال
    student_id             uuid        NOT NULL REFERENCES public.student_profiles(id),

    -- الموظف الذي أنشأ الإحالة (نائب شؤون الطلاب عادةً)
    referred_by_persona_id uuid        NOT NULL REFERENCES public.user_personas(id),

    -- المرشد الطلابي المسؤول عن المتابعة
    counselor_persona_id   uuid        REFERENCES public.user_personas(id),

    -- تفاصيل الإحالة
    referral_type          public.referral_type NOT NULL,
    trigger_count          integer     NOT NULL DEFAULT 1 CHECK (trigger_count > 0),
    trigger_period         text,                     -- مثال: '30 days'
    vp_reason              text        NOT NULL,      -- سبب الإحالة بكلمات نائب الشؤون
    counselor_notes        text,                      -- ملاحظات المرشد
    resolution_notes       text,                      -- ملاحظات الإغلاق

    status                 public.referral_status NOT NULL DEFAULT 'draft',

    created_at             timestamptz NOT NULL DEFAULT now(),
    updated_at             timestamptz NOT NULL DEFAULT now(),

    -- دعم composite FK مستقبلاً (student_profiles(id, school_id) مثلاً)
    CONSTRAINT br_school_id_id_unique UNIQUE (id, school_id)
);

-- ============================================================
-- Trigger: تحديث updated_at تلقائياً
-- ============================================================
-- نستخدم الدالة الموجودة fn_set_updated_at() من student_daily_attendance migration.
-- إذا لم تكن موجودة، سيفشل هذا السطر ويحتاج تطبيق R03 أولاً.

CREATE TRIGGER trg_behavioral_referrals_updated_at
    BEFORE UPDATE ON public.behavioral_referrals
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================
-- فهارس الأداء
-- ============================================================

CREATE INDEX idx_br_school_id        ON public.behavioral_referrals (school_id);
CREATE INDEX idx_br_student_id       ON public.behavioral_referrals (student_id);
CREATE INDEX idx_br_status           ON public.behavioral_referrals (status);
CREATE INDEX idx_br_referral_type    ON public.behavioral_referrals (referral_type);
CREATE INDEX idx_br_referred_by      ON public.behavioral_referrals (referred_by_persona_id);
CREATE INDEX idx_br_counselor        ON public.behavioral_referrals (counselor_persona_id);
CREATE INDEX idx_br_created_at       ON public.behavioral_referrals (created_at DESC);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.behavioral_referrals ENABLE ROW LEVEL SECURITY;

-- SELECT: system_owner يرى الكل | الأدوار المخوّلة يرون مدرستهم فقط
CREATE POLICY "br_select" ON public.behavioral_referrals
FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'student_affairs_vp',
            'student_counselor',
            'school_principal',
            'school_admin'
        )
    )
);

-- INSERT: الأدوار المخوّلة تُدرج فقط في مدرستهم
CREATE POLICY "br_insert" ON public.behavioral_referrals
FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'student_affairs_vp',
        'student_counselor',
        'school_principal'
    )
);

-- UPDATE: الأدوار المخوّلة تعدّل فقط في مدرستهم
CREATE POLICY "br_update" ON public.behavioral_referrals
FOR UPDATE USING (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'student_affairs_vp',
        'student_counselor',
        'school_principal'
    )
) WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'student_affairs_vp',
        'student_counselor',
        'school_principal'
    )
);

-- لا DELETE policy — الجدول أرشيفي (الحذف غير مسموح به تصميمياً)

-- ============================================================
-- التحقق النهائي
-- ============================================================
DO $$
DECLARE
    v_col_school_id     text;
    v_col_nullable      text;
    v_rls_enabled       boolean;
    v_policy_count      integer;
    v_idx_count         integer;
    v_type_referral     text;
    v_type_status       text;
BEGIN
    -- التحقق من وجود school_id NOT NULL
    SELECT column_name, is_nullable
    INTO v_col_school_id, v_col_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'behavioral_referrals'
      AND column_name  = 'school_id';

    IF v_col_school_id IS NULL THEN
        RAISE EXCEPTION 'التحقق فشل: عمود school_id غير موجود في behavioral_referrals';
    END IF;

    IF v_col_nullable <> 'NO' THEN
        RAISE EXCEPTION 'التحقق فشل: school_id يقبل NULL — يجب أن يكون NOT NULL';
    END IF;

    -- التحقق من تفعيل RLS
    SELECT relrowsecurity INTO v_rls_enabled
    FROM pg_class
    WHERE relnamespace = 'public'::regnamespace
      AND relname = 'behavioral_referrals';

    IF NOT v_rls_enabled THEN
        RAISE EXCEPTION 'التحقق فشل: RLS غير مفعَّل على behavioral_referrals';
    END IF;

    -- التحقق من عدد السياسات (يجب 3: select + insert + update)
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'behavioral_referrals';

    IF v_policy_count <> 3 THEN
        RAISE EXCEPTION 'التحقق فشل: عدد السياسات = % (المتوقع 3)', v_policy_count;
    END IF;

    -- التحقق من الفهارس (يجب 7 + PK)
    SELECT COUNT(*) INTO v_idx_count
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename  = 'behavioral_referrals';

    IF v_idx_count < 7 THEN
        RAISE WARNING 'تحذير: عدد الفهارس = % (المتوقع ≥ 7)', v_idx_count;
    END IF;

    -- التحقق من الأنواع
    SELECT typname INTO v_type_referral
    FROM pg_type WHERE typname = 'referral_type' AND typnamespace = 'public'::regnamespace;

    SELECT typname INTO v_type_status
    FROM pg_type WHERE typname = 'referral_status' AND typnamespace = 'public'::regnamespace;

    IF v_type_referral IS NULL THEN
        RAISE EXCEPTION 'التحقق فشل: referral_type ENUM غير موجودة';
    END IF;

    IF v_type_status IS NULL THEN
        RAISE EXCEPTION 'التحقق فشل: referral_status ENUM غير موجودة';
    END IF;

    RAISE NOTICE '✓ behavioral_referrals أُنشئت بالنمط الذهبي';
    RAISE NOTICE '✓ school_id NOT NULL ✓';
    RAISE NOTICE '✓ referred_by_persona_id → user_personas ✓';
    RAISE NOTICE '✓ counselor_persona_id → user_personas ✓';
    RAISE NOTICE '✓ UNIQUE (id, school_id) ✓';
    RAISE NOTICE '✓ RLS مفعَّل + 3 سياسات (select/insert/update) ✓';
    RAISE NOTICE '✓ referral_type + referral_status أنواع جديدة ✓';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  تذكير: fn_auto_referral_on_absence() في 20260528_student_daily_attendance.sql';
    RAISE NOTICE '   تُدرج بدون school_id — ستفشل الآن. يتطلب R03 لإصلاحها.';
    RAISE NOTICE '✓ R02 اكتمل — behavioral_referrals جاهزة للاستخدام مع Layer 6';
END $$;

COMMIT;

-- ============================================================
-- التحقق السريع (للتشغيل بعد COMMIT مباشرة في SQL Editor)
-- ============================================================
-- SELECT column_name, is_nullable, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'behavioral_referrals'
-- ORDER BY ordinal_position;
--
-- SELECT relrowsecurity FROM pg_class WHERE relname = 'behavioral_referrals';
-- -- يجب: true
--
-- SELECT policyname, cmd FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'behavioral_referrals';
-- -- يجب: br_select (SELECT) + br_insert (INSERT) + br_update (UPDATE)

-- ============================================================
-- ROLLBACK MANUAL — لا يُنصح به
-- ============================================================
-- إذا احتجت التراجع عن R02:
--   DROP TABLE IF EXISTS public.behavioral_referrals CASCADE;
--   DROP TYPE  IF EXISTS public.referral_type CASCADE;
--   DROP TYPE  IF EXISTS public.referral_status CASCADE;
-- ملاحظة: التراجع يُبقي النظام بلا behavioral_referrals كلياً
-- وستفشل أي استدعاءات fn_auto_referral_on_absence() بأخطاء runtime.
