-- =================================================================
-- Migration 38: Layer 5 — جدول تعريفات الـ Workflows
-- التاريخ: 2026-05-26
-- المشروع: Smart School OS 2.0
-- =================================================================
-- الهدف:
--   إنشاء جدول workflow_definitions كقالب عالمي مشترك بين جميع المدارس.
--   لا يحمل school_id لأنه seed data ثابت وليس بيانات مُستأجِرة.
--
-- ملاحظة حول get_my_school_id():
--   هذا الجدول عالمي ولا تستخدم سياسات RLS الخاصة به school_id.
--   ستُنشأ الدالة get_my_school_id() في Migration 39 عند الحاجة
--   الفعلية لها في جداول workflow_instances و approval_gates.
--
-- التبعيات المطلوبة: schools, user_personas (للـ preflight فقط)
-- الجداول التالية:  39 → workflow_instances
--                   40 → workflow_transitions
--                   41 → approval_gates
-- =================================================================

BEGIN;

-- ============================================================
-- Preflight: التحقق من الجداول الأساسية قبل البدء
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE  table_schema = 'public'
          AND  table_name   = 'schools'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: جدول schools غير موجود — أوقف Migration 38';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE  table_schema = 'public'
          AND  table_name   = 'user_personas'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: جدول user_personas غير موجود — أوقف Migration 38';
    END IF;

    RAISE NOTICE 'Preflight نجح: schools + user_personas موجودان';
END $$;

-- ============================================================
-- إنشاء جدول workflow_definitions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workflow_definitions (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_code    text        UNIQUE NOT NULL,
    display_name_ar  text        NOT NULL,
    qms_form_codes   text[]      NOT NULL DEFAULT '{}',
    states           jsonb       NOT NULL,
    required_roles   text[]      NOT NULL DEFAULT '{}',
    iso_clause       text,
    is_active        boolean     NOT NULL DEFAULT true,
    created_at       timestamptz NOT NULL DEFAULT now(),

    -- التحقق البنيوي الكامل من حقل states:
    --   1. يجب احتواء المفاتيح الثلاثة الإلزامية
    --   2. final و transitions يجب أن يكونا مصفوفتين JSON
    CONSTRAINT states_structure_valid CHECK (
        (states ? 'initial')
        AND (states ? 'final')
        AND (states ? 'transitions')
        AND jsonb_typeof(states -> 'final')       = 'array'
        AND jsonb_typeof(states -> 'transitions') = 'array'
    )
);

COMMENT ON TABLE  public.workflow_definitions                IS 'Layer 5: قوالب الـ Workflows العالمية — seed-only، لا تعديل عبر الواجهة';
COMMENT ON COLUMN public.workflow_definitions.workflow_code  IS 'مفتاح نصي فريد للـ workflow — يُستخدم كـ FK في workflow_instances';
COMMENT ON COLUMN public.workflow_definitions.states         IS 'بنية JSONB: {initial, final[], transitions[{from,to,action,actor}]} — تُقرأ في Service Layer';
COMMENT ON COLUMN public.workflow_definitions.required_roles IS 'الأدوار المُعتمدة لبدء هذا الـ workflow — قيم من school_role_type ENUM';
COMMENT ON COLUMN public.workflow_definitions.qms_form_codes IS 'أكواد نماذج الجودة المرتبطة بهذا الـ workflow';

-- ============================================================
-- تفعيل Row Level Security
-- ============================================================
ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;

-- قراءة: جميع المستخدمين المُوثَّقين — الجدول عالمي لا قيد مدرسة
DROP POLICY IF EXISTS "wfd_select_authenticated" ON public.workflow_definitions;
CREATE POLICY "wfd_select_authenticated" ON public.workflow_definitions
    FOR SELECT
    TO authenticated
    USING (true);

-- لا توجد سياسات INSERT / UPDATE / DELETE
-- الكتابة تتم عبر service role من خارج RLS فقط

-- ============================================================
-- Seed Data: 5 تعريفات Workflows
-- ON CONFLICT DO NOTHING → idempotent تماماً
-- ============================================================

-- ----------------------------------------------------------------
-- 1. الإجراء التصحيحي لعدم المطابقة   ISO 10.2
-- ----------------------------------------------------------------
INSERT INTO public.workflow_definitions
    (workflow_code, display_name_ar, qms_form_codes, states, required_roles, iso_clause)
VALUES (
    'CORRECTIVE_ACTION',
    'الإجراء التصحيحي لعدم المطابقة',
    ARRAY['QF03-1', 'QF03-2'],
    jsonb_build_object(
        'initial', 'draft',
        'final',   jsonb_build_array(
                       'closed_effective',
                       'closed_ineffective',
                       'escalated',
                       'cancelled'
                   ),
        'transitions', jsonb_build_array(
            -- منسق الجودة يُنشئ ويُرسل
            jsonb_build_object('from','draft',                   'to','awaiting_acknowledgment','action','submit',            'actor','quality_coordinator'),
            -- الطرف المعني يستجيب أو يعترض
            jsonb_build_object('from','awaiting_acknowledgment', 'to','in_corrective_action',  'action','acknowledge',        'actor','target_staff'),
            jsonb_build_object('from','awaiting_acknowledgment', 'to','under_review',           'action','dispute',            'actor','target_staff'),
            -- تصعيد تلقائي عند انتهاء المهلة (actor=system)
            jsonb_build_object('from','awaiting_acknowledgment', 'to','escalated',             'action','escalate_timeout',   'actor','system'),
            -- الطرف المعني يُقدم الإجراء التصحيحي
            jsonb_build_object('from','in_corrective_action',    'to','awaiting_verification', 'action','submit_evidence',    'actor','target_staff'),
            -- منسق الجودة يتحقق من الفاعلية
            jsonb_build_object('from','awaiting_verification',   'to','closed_effective',      'action','verify_effective',   'actor','quality_coordinator'),
            jsonb_build_object('from','awaiting_verification',   'to','closed_ineffective',    'action','verify_ineffective', 'actor','quality_coordinator'),
            -- إعادة فتح عند عدم الفاعلية
            jsonb_build_object('from','closed_ineffective',      'to','in_corrective_action',  'action','reopen',             'actor','quality_coordinator'),
            -- إلغاء من الحالات النشطة فقط
            jsonb_build_object('from','draft',                   'to','cancelled',             'action','cancel',             'actor','quality_coordinator'),
            jsonb_build_object('from','awaiting_acknowledgment', 'to','cancelled',             'action','cancel',             'actor','quality_coordinator'),
            jsonb_build_object('from','under_review',            'to','cancelled',             'action','cancel',             'actor','quality_coordinator')
        )
    ),
    ARRAY['quality_coordinator', 'school_principal'],
    '10.2 — Nonconformity and corrective action'
)
ON CONFLICT (workflow_code) DO NOTHING;

-- ----------------------------------------------------------------
-- 2. مساءلة حضور الموظف   ISO 7.1.2
-- ----------------------------------------------------------------
INSERT INTO public.workflow_definitions
    (workflow_code, display_name_ar, qms_form_codes, states, required_roles, iso_clause)
VALUES (
    'HR_ATTENDANCE',
    'مساءلة حضور الموظف',
    ARRAY['QF-A-3-1', 'QF-A-3-2', 'QF-A-3-3'],
    jsonb_build_object(
        'initial', 'initiated',
        'final',   jsonb_build_array('archived', 'cancelled'),
        'transitions', jsonb_build_array(
            -- السكرتير يُنشئ المساءلة
            jsonb_build_object('from','initiated',         'to','awaiting_employee', 'action','submit',           'actor','school_secretary'),
            -- الموظف يرد بمبرره
            jsonb_build_object('from','awaiting_employee', 'to','awaiting_manager',  'action','respond',          'actor','target_staff'),
            -- تصعيد تلقائي إذا لم يرد الموظف خلال المهلة
            jsonb_build_object('from','awaiting_employee', 'to','awaiting_manager',  'action','escalate_timeout', 'actor','system'),
            -- المدير يُصدر قراره (ثلاثة قرارات محتملة للحالة ذاتها)
            jsonb_build_object('from','awaiting_manager',  'to','decided',           'action','decide_justified', 'actor','school_principal'),
            jsonb_build_object('from','awaiting_manager',  'to','decided',           'action','decide_deducted',  'actor','school_principal'),
            jsonb_build_object('from','awaiting_manager',  'to','decided',           'action','decide_closed',    'actor','school_principal'),
            -- السكرتير يؤرشف الملف
            jsonb_build_object('from','decided',           'to','archived',          'action','archive',          'actor','school_secretary'),
            -- إلغاء قبل وصوله للمدير
            jsonb_build_object('from','initiated',         'to','cancelled',         'action','cancel',           'actor','school_secretary'),
            jsonb_build_object('from','awaiting_employee', 'to','cancelled',         'action','cancel',           'actor','school_secretary')
        )
    ),
    ARRAY['school_secretary', 'school_principal'],
    '7.1.2 — Competence'
)
ON CONFLICT (workflow_code) DO NOTHING;

-- ----------------------------------------------------------------
-- 3. تقييم الأداء الوظيفي   ISO 9.1.3
-- ----------------------------------------------------------------
INSERT INTO public.workflow_definitions
    (workflow_code, display_name_ar, qms_form_codes, states, required_roles, iso_clause)
VALUES (
    'STAFF_EVAL',
    'تقييم الأداء الوظيفي',
    ARRAY['QF-71-9-1', 'QF-71-9-2', 'QF-71-9-3', 'QF-71-9-4', 'QF-71-9-5'],
    jsonb_build_object(
        'initial', 'draft',
        'final',   jsonb_build_array('filed', 'cancelled'),
        'transitions', jsonb_build_array(
            -- المدير يُكمل التقييم ويُرسله
            jsonb_build_object('from','draft',        'to','completed',   'action','submit',           'actor','school_principal'),
            -- الموظف يُقرّ باستلام التقييم
            jsonb_build_object('from','completed',    'to','acknowledged','action','acknowledge',       'actor','evaluatee'),
            -- تصعيد تلقائي إذا لم يُقرّ الموظف خلال المهلة
            jsonb_build_object('from','completed',    'to','acknowledged','action','escalate_timeout',  'actor','system'),
            -- السكرتير يحفظ في الملف الرسمي
            jsonb_build_object('from','acknowledged', 'to','filed',       'action','file',              'actor','school_secretary'),
            -- إلغاء من حالة المسودة فقط
            jsonb_build_object('from','draft',        'to','cancelled',   'action','cancel',            'actor','school_principal')
        )
    ),
    ARRAY['school_principal', 'school_secretary'],
    '9.1.3 — Analysis and evaluation'
)
ON CONFLICT (workflow_code) DO NOTHING;

-- ----------------------------------------------------------------
-- 4. إدارة الاجتماع وإعداد المحضر   ISO 9.3
-- ----------------------------------------------------------------
INSERT INTO public.workflow_definitions
    (workflow_code, display_name_ar, qms_form_codes, states, required_roles, iso_clause)
VALUES (
    'MEETING',
    'إدارة الاجتماع وإعداد المحضر',
    ARRAY['QF-19-1', 'QF-19-2'],
    jsonb_build_object(
        'initial', 'scheduled',
        'final',   jsonb_build_array('minutes_signed', 'cancelled'),
        'transitions', jsonb_build_array(
            -- المنظّم يبدأ الجلسة
            jsonb_build_object('from','scheduled',           'to','in_progress',        'action','start',            'actor','organizer'),
            -- المنظّم يُنهي الجلسة
            jsonb_build_object('from','in_progress',         'to','ended',              'action','end',              'actor','organizer'),
            -- النظام يولّد المحضر تلقائياً بعد الانتهاء
            jsonb_build_object('from','ended',               'to','awaiting_signatures','action','generate_minutes', 'actor','system'),
            -- النظام يُغلق الـ workflow بعد اكتمال جميع التوقيعات
            jsonb_build_object('from','awaiting_signatures', 'to','minutes_signed',     'action','all_signed',       'actor','system'),
            -- إلغاء قبل البدء أو أثناء الجلسة
            jsonb_build_object('from','scheduled',           'to','cancelled',          'action','cancel',           'actor','organizer'),
            jsonb_build_object('from','in_progress',         'to','cancelled',          'action','cancel',           'actor','organizer')
        )
    ),
    ARRAY['school_principal', 'school_admin', 'school_secretary'],
    '9.3 — Management review'
)
ON CONFLICT (workflow_code) DO NOTHING;

-- ----------------------------------------------------------------
-- 5. رفع البيانات المجمّع
-- ----------------------------------------------------------------
INSERT INTO public.workflow_definitions
    (workflow_code, display_name_ar, qms_form_codes, states, required_roles, iso_clause)
VALUES (
    'BULK_UPLOAD',
    'رفع البيانات المجمّع',
    '{}',
    jsonb_build_object(
        'initial', 'uploaded',
        'final',   jsonb_build_array('completed', 'failed', 'rejected', 'cancelled'),
        'transitions', jsonb_build_array(
            -- النظام يتحقق من الملف تلقائياً فور الرفع
            jsonb_build_object('from','uploaded',          'to','validated',         'action','validate',         'actor','system'),
            jsonb_build_object('from','uploaded',          'to','failed',            'action','fail_validation',  'actor','system'),
            -- بعد التحقق: تنفيذ مباشر أو انتظار موافقة (يُحدَّد في Service Layer)
            jsonb_build_object('from','validated',         'to','processing',        'action','execute',          'actor','uploader'),
            jsonb_build_object('from','validated',         'to','awaiting_approval', 'action','request_approval', 'actor','system'),
            -- المدير يوافق أو يرفض
            jsonb_build_object('from','awaiting_approval', 'to','processing',        'action','approve',          'actor','school_principal'),
            jsonb_build_object('from','awaiting_approval', 'to','rejected',          'action','reject',           'actor','school_principal'),
            -- النظام ينهي المعالجة
            jsonb_build_object('from','processing',        'to','completed',         'action','finish',           'actor','system'),
            jsonb_build_object('from','processing',        'to','failed',            'action','fail_processing',  'actor','system'),
            -- إلغاء قبل المعالجة
            jsonb_build_object('from','validated',         'to','cancelled',         'action','cancel',           'actor','uploader'),
            jsonb_build_object('from','awaiting_approval', 'to','cancelled',         'action','cancel',           'actor','uploader')
        )
    ),
    ARRAY['school_principal'],
    NULL
)
ON CONFLICT (workflow_code) DO NOTHING;

-- ============================================================
-- التحقق النهائي
-- ============================================================
DO $$
DECLARE
    _count      integer;
    _rls_active boolean;
BEGIN
    -- التحقق من وجود جميع الـ 5 workflows
    SELECT COUNT(*) INTO _count
    FROM  public.workflow_definitions
    WHERE workflow_code IN (
        'CORRECTIVE_ACTION',
        'HR_ATTENDANCE',
        'STAFF_EVAL',
        'MEETING',
        'BULK_UPLOAD'
    );

    IF _count <> 5 THEN
        RAISE EXCEPTION
            'التحقق فشل: المتوقع 5 تعريفات — الموجود %', _count;
    END IF;

    -- التحقق من أن RLS مُفعّل
    SELECT relrowsecurity INTO _rls_active
    FROM   pg_class
    WHERE  relname      = 'workflow_definitions'
      AND  relnamespace = 'public'::regnamespace;

    IF NOT _rls_active THEN
        RAISE EXCEPTION 'التحقق فشل: RLS غير مُفعّل على workflow_definitions';
    END IF;

    -- التحقق من وجود سياسة SELECT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE  schemaname = 'public'
          AND  tablename  = 'workflow_definitions'
          AND  policyname = 'wfd_select_authenticated'
          AND  cmd        = 'SELECT'
    ) THEN
        RAISE EXCEPTION 'التحقق فشل: سياسة wfd_select_authenticated غير موجودة';
    END IF;

    RAISE NOTICE '✓ workflow_definitions: % تعريف مُدرج بنجاح', _count;
    RAISE NOTICE '✓ RLS مُفعّل على workflow_definitions';
    RAISE NOTICE '✓ سياسة wfd_select_authenticated موجودة';
    RAISE NOTICE '✓ Migration 38 اكتمل بنجاح';
END $$;

COMMIT;

-- ============================================================
-- ROLLBACK MANUAL — تعليمات الرجوع اليدوي فقط
-- لا تُنفَّذ تلقائياً — لا CASCADE — لا حذف ضمني
-- ============================================================
--
-- تحذير: نفّذ هذه الخطوات بالترتيب العكسي فقط بعد التأكد من
-- عدم وجود جداول تعتمد على workflow_definitions.
-- (يجب تنفيذ rollback لـ 41 → 40 → 39 قبل هذا الملف)
--
-- الخطوة 1: حذف سياسة RLS
--   DROP POLICY IF EXISTS "wfd_select_authenticated"
--       ON public.workflow_definitions;
--
-- الخطوة 2: تعطيل RLS
--   ALTER TABLE public.workflow_definitions
--       DISABLE ROW LEVEL SECURITY;
--
-- الخطوة 3: حذف الجدول (بدون CASCADE)
--   DROP TABLE IF EXISTS public.workflow_definitions;
--
-- ملاحظة: إذا كانت Migration 39 أو أحدث قد طُبِّقت بالفعل،
-- ستفشل الخطوة 3 برسالة تبعية واضحة — هذا السلوك مقصود.
