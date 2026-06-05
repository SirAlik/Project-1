-- ============================================================
-- Phase 3 — تصليب RPCs القديمة والـ Enums
-- ============================================================
-- يُعالج:
--   B. rpc_scan_ar_glyph / rpc_purchase_furniture — منح anon
--      rpc_process_transaction / rpc_corrupt_system — منح anon
--   B.5. cases — حذف سياسة UPDATE قديمة غير موثقة تعتمد على get_my_role()
--   C. get_my_role() — حذف نهائي
--   D. invites.target_role — تحويل user_role → school_role_type
--   D.5. cases.assigned_to_role — تحويل user_role → school_role_type + حذف DEFAULT
--   E. user_role enum — إزالة آمنة بدون CASCADE مع تحقق pg_depend
--   F. rate_limit_tracker — جدول مفقود + RPC مفقودة
--
-- ============================================================
-- نتائج الفحص المباشر لـ DB الحية (2026-06-05):
--
-- قيم user_role الفعلية (لم تُطبَّق عليها 20260523_normalize_role_keys):
--   admin, student_affairs, counselor, teacher, principal,
--   secretary, health_guide, lab_tech, lrc_admin, activity_leader, super_admin
--
-- المعتمِدون على user_role (pg_depend deptype='n'):
--   pg_attrdef: cases.assigned_to_role DEFAULT = 'student_affairs'::user_role
--   pg_class:   cases.assigned_to_role (عمود 12)
--   pg_class:   invites.target_role (عمود 6)
--   pg_policy:  OID 27080 = "Assigned Role Update Cases"
--               USING: (assigned_to_role=get_my_role()) OR (get_my_role()='admin'::user_role)
--   pg_proc:    get_my_role() — تُعيد user_role
--   pg_type:    نوع المصفوفة الداخلي (deptype='i') — يزول تلقائياً
--
-- ترتيب الحذف الآمن:
--   1. DROP POLICY "Assigned Role Update Cases" → يُزيل ثلاثة قيود دفعةً واحدة:
--      (a) يُفك قيد ALTER cases.assigned_to_role TYPE
--      (b) يُفك قيد DROP FUNCTION get_my_role()
--      (c) يُفك التبعية المباشرة لـ user_role من pg_policy
--   2. DROP FUNCTION get_my_role()
--   3. DROP DEFAULT cases.assigned_to_role + ALTER TYPE (CASE كاملة)
--   4. TRUNCATE invites + ALTER target_role TYPE
--   5. DROP TYPE public.user_role
-- ============================================================
--
-- ملاحظة: system_config وإعادة بناء gamification RPCs الكاملة
--         موجودة في Phase 4 (20260604_rebuild_gamification_ledger_infrastructure.sql).
-- ============================================================

BEGIN;

-- ============================================================
-- B. REVOKE anon من RPCs الخطرة
-- ============================================================
-- هذه الدوال SECURITY DEFINER — وصول anon يعني أي مستخدم
-- غير مصادَق يمكنه استدعاؤها مباشرةً عبر REST API.

DO $$
BEGIN
    -- rpc_scan_ar_glyph(text) — فحص التوقيع الدقيق: وسيط واحد text
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'rpc_scan_ar_glyph'
          AND p.pronargs = 1
          AND p.proargtypes[0] = 'text'::regtype
    ) THEN
        REVOKE EXECUTE ON FUNCTION public.rpc_scan_ar_glyph(text) FROM anon, public;
        GRANT  EXECUTE ON FUNCTION public.rpc_scan_ar_glyph(text) TO authenticated;
        RAISE NOTICE '✓ rpc_scan_ar_glyph(text): anon مُلغَى — authenticated فقط';
    END IF;

    -- rpc_scan_ar_glyph(text, uuid) — فحص التوقيع الدقيق: text ثم uuid
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'rpc_scan_ar_glyph'
          AND p.pronargs = 2
          AND p.proargtypes[0] = 'text'::regtype
          AND p.proargtypes[1] = 'uuid'::regtype
    ) THEN
        REVOKE EXECUTE ON FUNCTION public.rpc_scan_ar_glyph(text, uuid) FROM anon, public;
        GRANT  EXECUTE ON FUNCTION public.rpc_scan_ar_glyph(text, uuid) TO authenticated;
        RAISE NOTICE '✓ rpc_scan_ar_glyph(text, uuid): anon مُلغَى';
    END IF;

    -- rpc_purchase_furniture(uuid) — فحص التوقيع الدقيق: وسيط واحد uuid
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'rpc_purchase_furniture'
          AND p.pronargs = 1
          AND p.proargtypes[0] = 'uuid'::regtype
    ) THEN
        REVOKE EXECUTE ON FUNCTION public.rpc_purchase_furniture(uuid) FROM anon, public;
        GRANT  EXECUTE ON FUNCTION public.rpc_purchase_furniture(uuid) TO authenticated;
        RAISE NOTICE '✓ rpc_purchase_furniture(uuid): anon مُلغَى';
    END IF;

    -- rpc_purchase_furniture(uuid, uuid) — فحص التوقيع الدقيق: uuid + uuid
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'rpc_purchase_furniture'
          AND p.pronargs = 2
          AND p.proargtypes[0] = 'uuid'::regtype
          AND p.proargtypes[1] = 'uuid'::regtype
    ) THEN
        REVOKE EXECUTE ON FUNCTION public.rpc_purchase_furniture(uuid, uuid) FROM anon, public;
        GRANT  EXECUTE ON FUNCTION public.rpc_purchase_furniture(uuid, uuid) TO authenticated;
        RAISE NOTICE '✓ rpc_purchase_furniture(uuid, uuid): anon مُلغَى';
    END IF;

    -- rpc_process_transaction(uuid, bigint, bigint, text, text, uuid)
    -- فحص التوقيع الدقيق: 6 وسائط — Phase 4 ستُعيد بناءها بالكامل
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'rpc_process_transaction'
          AND p.pronargs = 6
          AND p.proargtypes[0] = 'uuid'::regtype
          AND p.proargtypes[1] = 'bigint'::regtype
          AND p.proargtypes[2] = 'bigint'::regtype
          AND p.proargtypes[3] = 'text'::regtype
          AND p.proargtypes[4] = 'text'::regtype
          AND p.proargtypes[5] = 'uuid'::regtype
    ) THEN
        REVOKE EXECUTE ON FUNCTION
            public.rpc_process_transaction(uuid, bigint, bigint, text, text, uuid)
        FROM anon, public;
        GRANT EXECUTE ON FUNCTION
            public.rpc_process_transaction(uuid, bigint, bigint, text, text, uuid)
        TO authenticated;
        RAISE NOTICE '✓ rpc_process_transaction(uuid,bigint,bigint,text,text,uuid): anon مُلغَى';
    END IF;

    -- rpc_corrupt_system(uuid) — فحص التوقيع الدقيق: وسيط واحد uuid
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'rpc_corrupt_system'
          AND p.pronargs = 1
          AND p.proargtypes[0] = 'uuid'::regtype
    ) THEN
        REVOKE EXECUTE ON FUNCTION public.rpc_corrupt_system(uuid) FROM anon, public;
        RAISE NOTICE '✓ rpc_corrupt_system(uuid): anon مُلغَى';
    END IF;
END $$;

-- ============================================================
-- B.5. cases — إزالة سياسة UPDATE القديمة + بديل حديث
-- ============================================================
-- "Assigned Role Update Cases" (OID 27080) هي نقطة الفشل الوحيدة التي
-- تمنع الخطوات الثلاث التالية في نفس الوقت:
--
--   المانع 1 — ALTER cases.assigned_to_role TYPE:
--     PostgreSQL لا يسمح بتغيير نوع عمود مُستخدَم في تعريف سياسة RLS.
--     ERROR 0A000: cannot alter type of a column used in a policy definition
--
--   المانع 2 — DROP FUNCTION get_my_role():
--     السياسة تستدعي get_my_role() في USING clause.
--
--   المانع 3 — DROP TYPE user_role:
--     السياسة تحتوي literal 'admin'::user_role مُسجَّلاً في pg_depend.
--
-- لذا: يجب حذفها أولاً قبل أي خطوة أخرى.
--
-- السياسة الحديثة cases_update_assigned:
--   • JWT مباشرة — لا دوال مساعدة
--   • school_id isolation + WITH CHECK
--   • system_owner كفرع OR مستقل
--   • أدوار school_role_type الرسمية فقط

DROP POLICY IF EXISTS "Assigned Role Update Cases" ON public.cases;
DROP POLICY IF EXISTS "cases_update_assigned"       ON public.cases;

CREATE POLICY "cases_update_assigned" ON public.cases
    FOR UPDATE TO authenticated
    USING (
        (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
        OR (
            school_id = (auth.jwt()->'app_metadata'->>'school_id')::uuid
            AND (auth.jwt()->'app_metadata'->>'role') IN (
                'school_admin',
                'school_principal',
                'student_affairs_vp',
                'student_counselor'
            )
        )
    )
    WITH CHECK (
        (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
        OR school_id = (auth.jwt()->'app_metadata'->>'school_id')::uuid
    );

DO $$ BEGIN
    RAISE NOTICE '✓ cases: "Assigned Role Update Cases" محذوفة — cases_update_assigned مُنشَأة';
END $$;

-- ============================================================
-- C. get_my_role() — حذف نهائي
-- ============================================================
-- آمن الآن بعد B.5: السياسة الوحيدة التي تستدعيها مُحذوفة.
-- pg_proc dependency على user_role تزول بحذف الدالة.

DROP FUNCTION IF EXISTS public.get_my_role();

DO $$ BEGIN
    RAISE NOTICE '✓ get_my_role(): محذوفة';
END $$;

-- ============================================================
-- D. invites.target_role — تحويل user_role → school_role_type
-- ============================================================
-- الجدول فارغ (ما قبل الإطلاق) → TRUNCATE ثم ALTER TYPE.
-- USING clause مكتوبة بالكامل للصحة المعمارية وإن كانت moot
-- على جدول فارغ.
--
-- الخريطة الكاملة (user_role الحية → school_role_type):
--   admin           → school_admin
--   student_affairs → student_affairs_vp
--   counselor       → student_counselor
--   teacher         → teacher
--   principal       → school_principal
--   secretary       → school_secretary
--   health_guide    → health_coordinator
--   lab_tech        → lab_technician
--   lrc_admin       → school_librarian
--   activity_leader → activity_leader
--   super_admin     → system_owner

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='invites'
    ) THEN
        RAISE NOTICE 'invites غير موجودة — تخطي D';
        RETURN;
    END IF;

    -- فارغة في مرحلة ما قبل الإطلاق
    -- CASCADE: لو وُجدت جداول FK تشير لـ invites.id فستُفرَّغ هي الأخرى
    TRUNCATE TABLE public.invites CASCADE;

    -- target_school_id NOT NULL — قد تكون R08 لم تُطبَّق
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='invites'
          AND column_name='target_school_id' AND is_nullable='YES'
    ) THEN
        ALTER TABLE public.invites
            ALTER COLUMN target_school_id SET NOT NULL;
        RAISE NOTICE 'invites.target_school_id: SET NOT NULL ✓';
    END IF;

    -- تحويل target_role من user_role إلى school_role_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='invites'
          AND column_name='target_role' AND udt_name='user_role'
    ) THEN
        RAISE NOTICE 'invites.target_role: ليست user_role — تخطي (طُبِّق مسبقاً)';
        RETURN;
    END IF;

    ALTER TABLE public.invites
        ALTER COLUMN target_role TYPE public.school_role_type
        USING (
            CASE target_role::text
                -- قيم user_role الأصلية (DB الحية)
                WHEN 'admin'           THEN 'school_admin'::public.school_role_type
                WHEN 'student_affairs' THEN 'student_affairs_vp'::public.school_role_type
                WHEN 'counselor'       THEN 'student_counselor'::public.school_role_type
                WHEN 'teacher'         THEN 'teacher'::public.school_role_type
                WHEN 'principal'       THEN 'school_principal'::public.school_role_type
                WHEN 'secretary'       THEN 'school_secretary'::public.school_role_type
                WHEN 'health_guide'    THEN 'health_coordinator'::public.school_role_type
                WHEN 'lab_tech'        THEN 'lab_technician'::public.school_role_type
                WHEN 'lrc_admin'       THEN 'school_librarian'::public.school_role_type
                WHEN 'activity_leader' THEN 'activity_leader'::public.school_role_type
                WHEN 'super_admin'     THEN 'system_owner'::public.school_role_type
                -- قيم post-normalize (idempotency)
                WHEN 'school_admin'        THEN 'school_admin'::public.school_role_type
                WHEN 'school_principal'    THEN 'school_principal'::public.school_role_type
                WHEN 'student_affairs_vp'  THEN 'student_affairs_vp'::public.school_role_type
                WHEN 'student_counselor'   THEN 'student_counselor'::public.school_role_type
                WHEN 'school_secretary'    THEN 'school_secretary'::public.school_role_type
                WHEN 'health_coordinator'  THEN 'health_coordinator'::public.school_role_type
                WHEN 'school_librarian'    THEN 'school_librarian'::public.school_role_type
                WHEN 'lab_technician'      THEN 'lab_technician'::public.school_role_type
                WHEN 'academic_vp'         THEN 'academic_vp'::public.school_role_type
                WHEN 'school_affairs_vp'   THEN 'school_affairs_vp'::public.school_role_type
                WHEN 'quality_coordinator' THEN 'quality_coordinator'::public.school_role_type
                WHEN 'system_owner'        THEN 'system_owner'::public.school_role_type
                WHEN 'student'             THEN 'student'::public.school_role_type
                WHEN 'parent'              THEN 'parent'::public.school_role_type
                ELSE NULL
            END
        );

    RAISE NOTICE 'invites.target_role: user_role → school_role_type ✓';
END $$;

-- ============================================================
-- D.5. cases.assigned_to_role — تحويل user_role → school_role_type
-- ============================================================
-- ثلاثة قيود مترابطة — يجب معالجتها بهذا الترتيب:
--
--   أ. column_default = 'student_affairs'::user_role
--      → pg_depend (pg_attrdef) على user_role
--      → يمنع DROP TYPE طالما DEFAULT موجود
--      الحل: DROP DEFAULT أولاً
--
--   ب. نوع العمود = user_role
--      → pg_depend (pg_class) على user_role
--      → يمنع DROP TYPE
--      الحل: ALTER COLUMN TYPE مع CASE USING كاملة
--
--   ج. قيم بيانات قديمة (admin، counselor، principal، إلخ)
--      → لا توجد cast تلقائي من user_role → school_role_type
--      → USING ::text::school_role_type يفشل للقيم القديمة
--      الحل: CASE USING صريح لكل قيمة من الـ 11 قيمة
--
-- الخريطة الكاملة (user_role الأصلية → school_role_type):
--   admin           → school_admin
--   student_affairs → student_affairs_vp
--   counselor       → student_counselor
--   teacher         → teacher
--   principal       → school_principal
--   secretary       → school_secretary
--   health_guide    → health_coordinator
--   lab_tech        → lab_technician
--   lrc_admin       → school_librarian
--   activity_leader → activity_leader
--   super_admin     → system_owner
--
-- لا تُضاف DEFAULT جديدة: assigned_to_role يُعيَّن صراحةً في كل INSERT.
-- ملاحظة: opened_by_role عمود text — لا يحتاج تحويلاً.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='cases'
    ) THEN
        RAISE NOTICE '⚠ cases غير موجودة — تخطي D.5';
        RETURN;
    END IF;

    -- تحقق idempotency: هل العمود لا يزال user_role؟
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='cases'
          AND column_name='assigned_to_role' AND udt_name='user_role'
    ) THEN
        RAISE NOTICE '✓ cases.assigned_to_role ليست user_role — تخطي D.5 (طُبِّق مسبقاً)';
        RETURN;
    END IF;

    -- خطوة 1: حذف القيمة الافتراضية القديمة 'student_affairs'::user_role
    -- هذا يُزيل تبعية pg_attrdef على user_role، ويُتيح ALTER TYPE لاحقاً
    ALTER TABLE public.cases
        ALTER COLUMN assigned_to_role DROP DEFAULT;
    RAISE NOTICE '✓ cases.assigned_to_role: DEFAULT محذوف';

    -- خطوة 2: تحويل النوع مع خريطة كاملة لجميع قيم user_role الأصلية
    -- CASE يعالج كل قيمة من الـ 11 قيمة الموجودة في DB الحية
    ALTER TABLE public.cases
        ALTER COLUMN assigned_to_role TYPE public.school_role_type
        USING (
            CASE assigned_to_role::text
                -- قيم user_role الأصلية (DB الحية — لم تُطبَّق عليها 20260523)
                WHEN 'admin'           THEN 'school_admin'::public.school_role_type
                WHEN 'student_affairs' THEN 'student_affairs_vp'::public.school_role_type
                WHEN 'counselor'       THEN 'student_counselor'::public.school_role_type
                WHEN 'teacher'         THEN 'teacher'::public.school_role_type
                WHEN 'principal'       THEN 'school_principal'::public.school_role_type
                WHEN 'secretary'       THEN 'school_secretary'::public.school_role_type
                WHEN 'health_guide'    THEN 'health_coordinator'::public.school_role_type
                WHEN 'lab_tech'        THEN 'lab_technician'::public.school_role_type
                WHEN 'lrc_admin'       THEN 'school_librarian'::public.school_role_type
                WHEN 'activity_leader' THEN 'activity_leader'::public.school_role_type
                WHEN 'super_admin'     THEN 'system_owner'::public.school_role_type
                -- قيم post-normalize (idempotency)
                WHEN 'school_admin'        THEN 'school_admin'::public.school_role_type
                WHEN 'school_principal'    THEN 'school_principal'::public.school_role_type
                WHEN 'student_affairs_vp'  THEN 'student_affairs_vp'::public.school_role_type
                WHEN 'student_counselor'   THEN 'student_counselor'::public.school_role_type
                WHEN 'school_secretary'    THEN 'school_secretary'::public.school_role_type
                WHEN 'health_coordinator'  THEN 'health_coordinator'::public.school_role_type
                WHEN 'school_librarian'    THEN 'school_librarian'::public.school_role_type
                WHEN 'lab_technician'      THEN 'lab_technician'::public.school_role_type
                WHEN 'academic_vp'         THEN 'academic_vp'::public.school_role_type
                WHEN 'school_affairs_vp'   THEN 'school_affairs_vp'::public.school_role_type
                WHEN 'quality_coordinator' THEN 'quality_coordinator'::public.school_role_type
                WHEN 'system_owner'        THEN 'system_owner'::public.school_role_type
                ELSE NULL
            END
        );

    RAISE NOTICE '✓ cases.assigned_to_role: user_role → school_role_type ✓';
END $$;

-- ============================================================
-- E. حذف user_role enum بأمان — بدون CASCADE
-- ============================================================
-- بعد B.5 + C + D + D.5: جميع تبعيات pg_depend (deptype='n') مُزالة:
--   pg_policy  (OID 27080) → مُزال في B.5
--   pg_proc    (get_my_role) → مُزال في C
--   pg_class   (invites.target_role) → مُزال في D
--   pg_attrdef (cases DEFAULT) → مُزال في D.5 خطوة 1
--   pg_class   (cases.assigned_to_role) → مُزال في D.5 خطوة 2
-- pg_type (deptype='i') = نوع المصفوفة الداخلي — يزول تلقائياً.
--
-- نستخدم pg_depend للتحقق الشامل — يكتشف الدوال والـ views
-- والـ domains و CHECK constraints بخلاف information_schema.columns.

DO $$
DECLARE
    v_dep_count int;
BEGIN
    SELECT COUNT(*) INTO v_dep_count
    FROM pg_depend d
    JOIN pg_type t ON t.oid = d.refobjid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'user_role'
      AND n.nspname = 'public'
      AND d.deptype = 'n';

    IF v_dep_count > 0 THEN
        RAISE EXCEPTION
            'user_role لا يزال لديه % مُعتمِد — لا يمكن الحذف الآمن. '
            'للتحقيق: SELECT d.classid::regclass, d.objid, d.deptype '
            'FROM pg_depend d JOIN pg_type t ON t.oid=d.refobjid '
            'JOIN pg_namespace n ON n.oid=t.typnamespace '
            'WHERE t.typname=''user_role'' AND d.deptype=''n''',
            v_dep_count;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typname = 'user_role'
    ) THEN
        DROP TYPE public.user_role;
        RAISE NOTICE '✓ user_role enum: حُذف بأمان (بدون CASCADE)';
    ELSE
        RAISE NOTICE '✓ user_role enum: غير موجود (تم حذفه مسبقاً أو لم يُنشَأ)';
    END IF;
END $$;

-- ============================================================
-- F. rate_limit_tracker + increment_rate_limit RPC
-- ============================================================
-- lib/rate-limiter.ts يحتاج هذا الجدول — غائب من قاعدة البيانات الحية.
-- الـ rate limiter يعمل بنمط fail-open حالياً (يسمح بكل شيء).
-- إنشاء الجدول يفعّل حماية rate limiting الفعلية.

CREATE TABLE IF NOT EXISTS public.rate_limit_tracker (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type   text        NOT NULL,
    window_start  timestamptz NOT NULL,
    attempt_count int         NOT NULL DEFAULT 1,
    created_at    timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT rate_limit_tracker_unique UNIQUE (user_id, action_type, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rlt_user_action_window
    ON public.rate_limit_tracker (user_id, action_type, window_start DESC);

CREATE INDEX IF NOT EXISTS idx_rlt_window_start
    ON public.rate_limit_tracker (window_start);

ALTER TABLE public.rate_limit_tracker ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rate_limit_tracker_select" ON public.rate_limit_tracker;
CREATE POLICY "rate_limit_tracker_select" ON public.rate_limit_tracker
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- لا سياسة INSERT/UPDATE للـ authenticated — يكتب عبر service_role فقط
-- (lib/rate-limiter.ts يستخدم supabaseAdmin)

CREATE OR REPLACE FUNCTION public.increment_rate_limit(
    p_user_id     uuid,
    p_action_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_window timestamptz := date_trunc('hour', now());
BEGIN
    INSERT INTO public.rate_limit_tracker (user_id, action_type, window_start, attempt_count)
    VALUES (p_user_id, p_action_type, v_window, 1)
    ON CONFLICT (user_id, action_type, window_start)
    DO UPDATE SET attempt_count = rate_limit_tracker.attempt_count + 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_rate_limit(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.increment_rate_limit(uuid, text) TO service_role;

DO $$ BEGIN
    RAISE NOTICE '✓ rate_limit_tracker: جدول + RLS + increment_rate_limit RPC';
END $$;

-- ─── Validation ───────────────────────────────────────────────

DO $$
BEGIN
    -- ─── get_my_role: يجب ألا تكون موجودة ──────────────────────
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'get_my_role'
    ) THEN
        RAISE EXCEPTION 'FAIL: get_my_role() لا تزال موجودة';
    END IF;

    -- ─── rate_limit_tracker موجودة ────────────────────────────
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='rate_limit_tracker'
    ) THEN
        RAISE EXCEPTION 'FAIL: rate_limit_tracker غير موجودة';
    END IF;

    -- ─── increment_rate_limit: service_role فقط ───────────────
    IF NOT has_function_privilege('service_role',
        'public.increment_rate_limit(uuid, text)', 'EXECUTE') THEN
        RAISE EXCEPTION 'FAIL: increment_rate_limit — EXECUTE غير ممنوح لـ service_role';
    END IF;

    IF has_function_privilege('anon',
        'public.increment_rate_limit(uuid, text)', 'EXECUTE') THEN
        RAISE EXCEPTION 'FAIL: increment_rate_limit — EXECUTE ممنوح لـ anon';
    END IF;

    IF has_function_privilege('authenticated',
        'public.increment_rate_limit(uuid, text)', 'EXECUTE') THEN
        RAISE EXCEPTION 'FAIL: increment_rate_limit — EXECUTE ممنوح لـ authenticated';
    END IF;

    -- ─── cases.assigned_to_role — نوع + بدون DEFAULT ──────────
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='cases') THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema='public' AND table_name='cases'
              AND column_name='assigned_to_role' AND udt_name='user_role'
        ) THEN
            RAISE EXCEPTION 'FAIL: cases.assigned_to_role لا تزال من نوع user_role';
        END IF;
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema='public' AND table_name='cases'
              AND column_name='assigned_to_role' AND column_default IS NOT NULL
        ) THEN
            RAISE EXCEPTION 'FAIL: cases.assigned_to_role لا تزال لها DEFAULT: %',
                (SELECT column_default FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='cases'
                   AND column_name='assigned_to_role');
        END IF;
        RAISE NOTICE '   cases.assigned_to_role     — school_role_type، بدون DEFAULT ✓';
    END IF;

    -- ─── invites.target_role ──────────────────────────────────
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='invites') THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema='public' AND table_name='invites'
              AND column_name='target_role' AND udt_name='user_role'
        ) THEN
            RAISE EXCEPTION 'FAIL: invites.target_role لا تزال من نوع user_role';
        END IF;
        RAISE NOTICE '   invites.target_role         — school_role_type ✓';
    ELSE
        RAISE NOTICE '   invites                     — غير موجودة (تخطي التحقق)';
    END IF;

    -- ─── لا عمود في public يستخدم user_role ──────────────────
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND udt_name='user_role'
    ) THEN
        RAISE EXCEPTION 'FAIL: أعمدة لا تزال تستخدم user_role: %',
            (SELECT string_agg(table_name || '.' || column_name, ', ')
             FROM information_schema.columns
             WHERE table_schema='public' AND udt_name='user_role');
    END IF;
    RAISE NOTICE '   لا أعمدة في public تستخدم user_role ✓';

    RAISE NOTICE '';
    RAISE NOTICE '✅ Phase 3 اكتمل:';
    RAISE NOTICE '   rpc_*: anon مُلغَى                    — توقيعات مُتحقَّق منها ✓';
    RAISE NOTICE '   get_my_role()                         — محذوفة ✓';
    RAISE NOTICE '   cases.assigned_to_role                — school_role_type، بدون DEFAULT ✓';
    RAISE NOTICE '   invites.target_role                   — school_role_type ✓';
    RAISE NOTICE '   user_role enum                        — حُذف بأمان بدون CASCADE ✓';
    RAISE NOTICE '   rate_limit_tracker                    — مُنشَأ ✓';
    RAISE NOTICE '   increment_rate_limit                  — service_role فقط ✓';
    RAISE NOTICE '';
    RAISE NOTICE '📌 system_config + gamification RPCs: موجودة في Phase 4';
    RAISE NOTICE '   (20260604_rebuild_gamification_ledger_infrastructure.sql)';
END $$;

COMMIT;
