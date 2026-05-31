-- =================================================================
-- M61: محرك القواعد والإشعارات
-- التاريخ: 2026-05-30
-- =================================================================
-- الجداول:
--   automation_rules   — قواعد الأتمتة (متى تُطلَق وماذا تفعل)
--   notification_queue — قائمة انتظار الإشعارات قبل الإرسال
--
-- المبدأ:
--   منطق "3 غيابات → تنبيه، 5 غيابات → إحالة" لا يعيش في React.
--   يعيش في جدول automation_rules يقرأه trigger أو Edge Function.
--   notification_queue يفصل "إنشاء الإشعار" عن "إرساله" — يُتيح
--   retry، تتبع الحالة، وإحصائيات التسليم.
--
-- التبعيات:
--   ✅ schools · profiles · user_personas
-- =================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────
-- Preflight
-- ────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'automation_rules'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: automation_rules موجودة مسبقاً';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'notification_queue'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: notification_queue موجودة مسبقاً';
    END IF;

    RAISE NOTICE 'Preflight ✓';
END $$;

-- ════════════════════════════════════════════════════════════════
-- 1. automation_rules — قواعد الأتمتة
-- ════════════════════════════════════════════════════════════════

CREATE TABLE public.automation_rules (
    id              uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       uuid        NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,

    name            text        NOT NULL,

    -- الحدث الذي يُطلق القاعدة
    trigger_event   text        NOT NULL CHECK (trigger_event IN (
                        'absence_count',    -- غياب يومي متكرر
                        'period_absence',   -- غياب حصص متكرر
                        'late_count',       -- تأخر متكرر
                        'behavior_type',    -- نوع مخالفة سلوكية
                        'loan_overdue',     -- تأخر إعادة كتاب
                        'health_referral'   -- إحالة من العيادة
                    )),

    -- شرط تشغيل القاعدة (JSONB مرن)
    -- مثال: {"threshold": 3, "period": "academic_year", "status": "unexcused"}
    condition       jsonb       NOT NULL DEFAULT '{}',

    -- الإجراء المنفَّذ عند تحقق الشرط
    action          text        NOT NULL CHECK (action IN (
                        'create_referral',  -- إنشاء إحالة للمرشد
                        'notify_role',      -- إشعار دور محدد
                        'notify_parent',    -- إشعار ولي الأمر
                        'create_case',      -- فتح حالة في cases
                        'flag_risk'         -- تعليم الطالب كمخاطرة
                    )),

    -- إعدادات الإجراء
    -- مثال: {"role": "student_counselor", "urgency": "high", "template": "absence_alert"}
    action_config   jsonb       NOT NULL DEFAULT '{}',

    is_active       boolean     NOT NULL DEFAULT true,
    created_by      uuid        REFERENCES public.user_personas(id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ar_select" ON public.automation_rules
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin', 'school_principal', 'quality_coordinator'
        )
    )
);

CREATE POLICY "ar_insert" ON public.automation_rules
FOR INSERT TO authenticated
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin', 'school_principal'
        )
    )
);

CREATE POLICY "ar_update" ON public.automation_rules
FOR UPDATE TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin', 'school_principal'
        )
    )
)
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin', 'school_principal'
        )
    )
);

-- فهرس للـ Engine: يقرأ القواعد النشطة لحدث معيّن فقط
CREATE INDEX idx_ar_school_event ON public.automation_rules (school_id, trigger_event)
    WHERE is_active = true;

-- updated_at trigger
CREATE TRIGGER trg_ar_updated_at
    BEFORE UPDATE ON public.automation_rules
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ════════════════════════════════════════════════════════════════
-- 2. notification_queue — قائمة انتظار الإشعارات
-- ════════════════════════════════════════════════════════════════

CREATE TABLE public.notification_queue (
    id             uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id      uuid        NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,

    -- المستلم: إما فرد (recipient_id) أو دور كامل (recipient_role) — ليس كلاهما معاً
    recipient_id   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
    recipient_role text        CHECK (recipient_role IN (
                       'school_admin', 'school_principal', 'student_affairs_vp',
                       'academic_vp', 'school_affairs_vp', 'student_counselor',
                       'health_coordinator', 'quality_coordinator',
                       'school_librarian', 'school_secretary',
                       'activity_leader', 'lab_technician', 'teacher',
                       'parent'
                   )),

    channel        text        NOT NULL DEFAULT 'app'
                               CHECK (channel IN ('app', 'sms', 'email', 'whatsapp')),

    -- مفتاح القالب — يُفسَّر في Edge Function
    template_key   text        NOT NULL,

    -- بيانات القالب (اسم الطالب، عدد الغيابات، إلخ)
    payload        jsonb       NOT NULL DEFAULT '{}',

    status         text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),

    scheduled_at   timestamptz NOT NULL DEFAULT now(),
    sent_at        timestamptz,
    error_message  text,

    -- مصدر الإشعار — للتتبع وتجنب التكرار
    source_module  text        CHECK (source_module IN (
                       'attendance', 'lrc', 'health', 'behavior',
                       'counselor', 'hr', 'quality'
                   )),
    source_id      uuid,    -- UUID الحدث الأصلي (FK منطقي — متعدد الجداول)

    created_at     timestamptz NOT NULL DEFAULT now(),

    -- منع إرسال نفس الإشعار مرتين لنفس الحدث ونفس المستلم
    CONSTRAINT nq_source_recipient_unique
        UNIQUE NULLS NOT DISTINCT (school_id, source_module, source_id, recipient_id, template_key)
);

ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- SELECT:
--   • system_owner يرى الكل
--   • المستخدم يرى إشعاراته الخاصة
--   • الإداريون يرون كل إشعارات مدرستهم
CREATE POLICY "nq_select" ON public.notification_queue
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR recipient_id = auth.uid()
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin', 'school_principal'
        )
    )
);

-- INSERT: الأدوار التشغيلية + Triggers (SECURITY DEFINER تتجاوز RLS)
CREATE POLICY "nq_insert" ON public.notification_queue
FOR INSERT TO authenticated
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin', 'school_principal',
            'student_affairs_vp', 'health_coordinator'
        )
    )
);

-- UPDATE: Edge Function (via service_role) + الإداريون
CREATE POLICY "nq_update" ON public.notification_queue
FOR UPDATE TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin', 'school_principal'
        )
    )
)
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin', 'school_principal'
        )
    )
);

CREATE INDEX idx_nq_recipient_status  ON public.notification_queue (recipient_id, status);
CREATE INDEX idx_nq_school_status     ON public.notification_queue (school_id, status);
CREATE INDEX idx_nq_pending           ON public.notification_queue (school_id, scheduled_at)
    WHERE status = 'pending';
CREATE INDEX idx_nq_source            ON public.notification_queue (source_module, source_id)
    WHERE source_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────────
-- التحقق النهائي
-- ────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_rls_ar  boolean;
    v_rls_nq  boolean;
    v_pol_ar  integer;
    v_pol_nq  integer;
BEGIN
    SELECT relrowsecurity INTO v_rls_ar FROM pg_class
    WHERE relnamespace = 'public'::regnamespace AND relname = 'automation_rules';

    SELECT relrowsecurity INTO v_rls_nq FROM pg_class
    WHERE relnamespace = 'public'::regnamespace AND relname = 'notification_queue';

    IF NOT v_rls_ar THEN
        RAISE EXCEPTION 'FAIL: RLS غير مفعَّل على automation_rules';
    END IF;
    IF NOT v_rls_nq THEN
        RAISE EXCEPTION 'FAIL: RLS غير مفعَّل على notification_queue';
    END IF;

    SELECT COUNT(*) INTO v_pol_ar FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'automation_rules';

    SELECT COUNT(*) INTO v_pol_nq FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notification_queue';

    IF v_pol_ar < 3 THEN
        RAISE EXCEPTION 'FAIL: % سياسات على automation_rules — المتوقع 3', v_pol_ar;
    END IF;
    IF v_pol_nq < 3 THEN
        RAISE EXCEPTION 'FAIL: % سياسات على notification_queue — المتوقع 3', v_pol_nq;
    END IF;

    RAISE NOTICE '✅ M61 اكتمل:';
    RAISE NOTICE '   ✓ automation_rules — % سياسات RLS', v_pol_ar;
    RAISE NOTICE '   ✓ notification_queue — % سياسات RLS + UNIQUE anti-duplicate', v_pol_nq;
    RAISE NOTICE '   ✓ trigger trg_ar_updated_at على automation_rules';
END $$;

COMMIT;
