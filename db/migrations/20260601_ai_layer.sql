-- =================================================================
-- M73: طبقة الذكاء الاصطناعي — Phase 8
-- التاريخ: 2026-06-01
-- =================================================================
-- الجداول:
--   ai_prompt_templates — قوالب الـ prompts لكل دور وسياق
--   ai_insights         — رؤى مُولَّدة من Claude API ومخزنة بصلاحية الدور
--
-- المبدأ:
--   المستخدم لا يرى كلمة "AI" أو "prompt". يرى بطاقة "ملاحظات ذكية".
--   ai_prompt_templates تُملأ مرة واحدة من النظام (seed).
--   ai_insights تُملَّئ من Edge Function عند الطلب أو جدول زمني.
--   البيانات المُرسَلة للـ LLM: إحصائيات مجمَّعة فقط — لا بيانات شخصية.
--
-- الخصوصية:
--   data_snapshot يخزن ما أُرسل للـ Claude — لا أسماء، لا أرقام هوية.
--   فقط: نسب + أعداد + قوائم مجهولة الهوية.
--
-- التبعيات:
--   ✅ schools · get_my_school_id() — R00
--   ✅ academic_years · classes · student_profiles (للسياق)
-- =================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────
-- Preflight
-- ────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'ai_prompt_templates'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: ai_prompt_templates موجودة مسبقاً';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'ai_insights'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: ai_insights موجودة مسبقاً';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'get_my_school_id'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: get_my_school_id() غير موجودة';
    END IF;

    RAISE NOTICE 'Preflight ✓';
END $$;

-- ════════════════════════════════════════════════════════════════
-- 1. ai_prompt_templates — قوالب الـ prompts حسب الدور والسياق
-- ════════════════════════════════════════════════════════════════
-- جدول عالمي (بدون school_id) — يُعرَّف على مستوى النظام.
-- كل سجل يمثل نوع تحليل محدد لدور محدد.
-- required_fields: الحقول التي يجب توفيرها في payload قبل استدعاء Claude.
-- ────────────────────────────────────────────────────────────────

CREATE TABLE public.ai_prompt_templates (
    id              uuid    NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    role_target     text    NOT NULL CHECK (role_target IN (
                        'school_principal',
                        'student_affairs_vp',
                        'academic_vp',
                        'student_counselor',
                        'health_coordinator',
                        'quality_coordinator',
                        'school_librarian',
                        'teacher'
                    )),
    context_type    text    NOT NULL CHECK (context_type IN (
                        'school_overview',       -- نظرة عامة على المدرسة
                        'class_report',          -- تقرير شعبة
                        'student_profile',       -- ملف طالب
                        'attendance_analysis',   -- تحليل الغياب
                        'behavior_pattern',      -- نمط السلوك
                        'health_trend',          -- اتجاه الحالات الصحية
                        'lrc_usage',             -- استخدام المكتبة
                        'quality_summary'        -- ملخص الجودة
                    )),
    template_text   text    NOT NULL,
    required_fields text[]  NOT NULL DEFAULT '{}',
    max_tokens      int     NOT NULL DEFAULT 1000 CHECK (max_tokens BETWEEN 100 AND 4000),
    is_active       boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),

    UNIQUE (role_target, context_type)
);

-- جدول النظام — لا RLS (يقرأ منه service_role فقط في Edge Function)
-- لكن نُفعّل RLS ونمنع الوصول المباشر من المستخدمين
ALTER TABLE public.ai_prompt_templates ENABLE ROW LEVEL SECURITY;

-- القراءة: system_owner والأدوار التقنية فقط (الـ Edge Function يعمل بـ service_role)
CREATE POLICY "apt_select" ON public.ai_prompt_templates
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('system_owner', 'school_admin')
);

CREATE POLICY "apt_insert" ON public.ai_prompt_templates
FOR INSERT TO authenticated
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
);

CREATE POLICY "apt_update" ON public.ai_prompt_templates
FOR UPDATE TO authenticated
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner')
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner');

CREATE TRIGGER trg_apt_updated_at
    BEFORE UPDATE ON public.ai_prompt_templates
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ════════════════════════════════════════════════════════════════
-- 2. ai_insights — رؤى Claude المخزنة
-- ════════════════════════════════════════════════════════════════
-- كل سجل = رؤية واحدة أُنتجت من Claude لسياق معين.
-- scope: مستوى التحليل (school / class / student)
-- scope_id: UUID الكيان (school_id أو class_id أو student_id)
-- expires_at: الرؤى تنتهي صلاحيتها (لا تُعرض رؤية قديمة على أنها حديثة)
-- data_snapshot: ما أُرسل لـ Claude — إحصائيات مجمّعة فقط (لا بيانات شخصية)
-- ────────────────────────────────────────────────────────────────

CREATE TABLE public.ai_insights (
    id              uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       uuid        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,

    -- السياق
    scope           text        NOT NULL CHECK (scope IN ('school', 'class', 'student')),
    scope_id        uuid        NOT NULL,
    role_target     text        NOT NULL CHECK (role_target IN (
                        'school_principal',
                        'student_affairs_vp',
                        'academic_vp',
                        'student_counselor',
                        'health_coordinator',
                        'quality_coordinator',
                        'school_librarian',
                        'teacher'
                    )),
    context_type    text        NOT NULL,   -- يُطابق ai_prompt_templates.context_type

    -- المخرجات
    summary_ar      text        NOT NULL,   -- ملخص بالعربية للعرض
    recommendations jsonb       NOT NULL DEFAULT '[]', -- توصيات كـ array

    -- ما أُرسل لـ Claude (للمراجعة والتدقيق — لا بيانات شخصية)
    data_snapshot   jsonb       NOT NULL DEFAULT '{}',

    -- دورة الحياة
    generated_at    timestamptz NOT NULL DEFAULT now(),
    generated_date  date        NOT NULL DEFAULT CURRENT_DATE,
    expires_at      timestamptz NOT NULL DEFAULT (now() + INTERVAL '24 hours'),

    academic_year_id uuid       REFERENCES public.academic_years(id),
    model_version   text        NOT NULL DEFAULT 'claude-sonnet-4-6'
);

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- قراءة: كل دور يرى الرؤى المخصصة له فقط، والمنتهية الصلاحية تُخفى
-- (فلترة expires_at تُفضَّل في الـ query لكن يمكن تطبيقها في RLS)
CREATE POLICY "ai_select" ON public.ai_insights
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (
            -- المدير والمنسق يرون كل الرؤى
            (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_admin', 'school_principal')
            -- كل دور يرى الرؤى المخصصة له
            OR role_target = (auth.jwt() -> 'app_metadata' ->> 'role')
        )
    )
);

-- كتابة: service_role فقط (Edge Function) + admin للاختبار
CREATE POLICY "ai_insert" ON public.ai_insights
FOR INSERT TO authenticated
WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_admin', 'system_owner')
);

-- منع رؤية مكررة لنفس السياق والدور في نفس اليوم
CREATE UNIQUE INDEX idx_ai_insights_daily_unique
    ON public.ai_insights (school_id, scope, scope_id, role_target, context_type, generated_date);

-- فهارس: الاستعلام الشائع = "أحدث رؤية نشطة لسياق معين"
CREATE INDEX idx_ai_scope         ON public.ai_insights (school_id, scope, scope_id, role_target);
CREATE INDEX idx_ai_role_date     ON public.ai_insights (school_id, role_target, generated_at DESC);
CREATE INDEX idx_ai_expires       ON public.ai_insights (expires_at);

-- ────────────────────────────────────────────────────────────────
-- Seed: قوالب أولية (يمكن توسيعها لاحقاً)
-- ────────────────────────────────────────────────────────────────
INSERT INTO public.ai_prompt_templates
    (role_target, context_type, template_text, required_fields, max_tokens)
VALUES
(
    'school_principal',
    'school_overview',
    $tmpl$أنت مستشار تعليمي متخصص. بناءً على البيانات التالية لمدرسة:
- نسبة الحضور: {{attendance_rate}}%
- عدد الحالات السلوكية هذا الأسبوع: {{behavioral_count}}
- زيارات المكتبة: {{lrc_visits}}
- حالات العيادة: {{health_cases}}
- عدد الطلاب ذوي الخطر العالي: {{high_risk_count}}

قدّم تحليلاً موجزاً بالعربية (3-4 جمل) مع توصيتين عمليتين للمدير.$tmpl$,
    ARRAY['attendance_rate','behavioral_count','lrc_visits','health_cases','high_risk_count'],
    800
),
(
    'student_affairs_vp',
    'attendance_analysis',
    $tmpl$أنت مستشار لوكيل شؤون الطلاب. البيانات:
- غيابات اليوم: {{absent_today}}
- تأخرات اليوم: {{late_today}}
- نسبة الغياب هذا الأسبوع: {{week_absence_rate}}%
- طلاب تجاوزوا 5 غيابات: {{threshold_students}}

قدّم ملاحظتين موجزتين بالعربية مع إجراء موصى به لكل منهما.$tmpl$,
    ARRAY['absent_today','late_today','week_absence_rate','threshold_students'],
    600
),
(
    'student_counselor',
    'student_profile',
    $tmpl$أنت مرشد طلابي متخصص. بيانات الطالب (مجهولة الهوية):
- إجمالي الغيابات هذا العام: {{total_absences}}
- حوادث سلوكية: {{behavior_incidents}}
- نوع الإحالات: {{referral_types}}
- مستوى المخاطرة الحالي: {{risk_level}}

اقترح نهج تدخل مناسباً بالعربية (فقرة واحدة) مع خطوتين عمليتين.$tmpl$,
    ARRAY['total_absences','behavior_incidents','referral_types','risk_level'],
    700
),
(
    'school_librarian',
    'lrc_usage',
    $tmpl$أنت متخصص في تطوير مصادر التعلم. بيانات المكتبة:
- إعارات نشطة: {{active_loans}}
- متأخرات إعادة: {{overdue_count}}
- زيارات الفصول هذا الأسبوع: {{class_visits}}
- أكثر الفئات طلباً: {{top_categories}}

قدّم ملاحظة واحدة موجزة بالعربية مع توصية لتحسين الاستخدام.$tmpl$,
    ARRAY['active_loans','overdue_count','class_visits','top_categories'],
    500
),
(
    'health_coordinator',
    'health_trend',
    $tmpl$أنت مستشار صحة مدرسية. بيانات العيادة:
- زيارات هذا الأسبوع: {{visits_week}}
- أكثر الشكاوى تكراراً: {{top_complaints}}
- إحالات للمستشفى: {{hospital_referrals}}
- حالات طوارئ: {{emergency_count}}

قدّم ملاحظة صحية موجزة بالعربية مع توصية وقائية واحدة.$tmpl$,
    ARRAY['visits_week','top_complaints','hospital_referrals','emergency_count'],
    500
);

-- ────────────────────────────────────────────────────────────────
-- التحقق النهائي
-- ────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_templates int;
    v_rls_apt   boolean;
    v_rls_ai    boolean;
    v_pol_apt   int;
    v_pol_ai    int;
BEGIN
    SELECT relrowsecurity INTO v_rls_apt FROM pg_class
    WHERE relnamespace = 'public'::regnamespace AND relname = 'ai_prompt_templates';

    SELECT relrowsecurity INTO v_rls_ai FROM pg_class
    WHERE relnamespace = 'public'::regnamespace AND relname = 'ai_insights';

    IF NOT COALESCE(v_rls_apt, false) THEN
        RAISE EXCEPTION 'FAIL: RLS غير مفعَّل على ai_prompt_templates';
    END IF;
    IF NOT COALESCE(v_rls_ai, false) THEN
        RAISE EXCEPTION 'FAIL: RLS غير مفعَّل على ai_insights';
    END IF;

    SELECT COUNT(*) INTO v_pol_apt FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ai_prompt_templates';

    SELECT COUNT(*) INTO v_pol_ai FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ai_insights';

    IF v_pol_apt < 3 THEN
        RAISE EXCEPTION 'FAIL: ai_prompt_templates — % سياسات (المتوقع 3+)', v_pol_apt;
    END IF;
    IF v_pol_ai < 2 THEN
        RAISE EXCEPTION 'FAIL: ai_insights — % سياسات (المتوقع 2+)', v_pol_ai;
    END IF;

    SELECT COUNT(*) INTO v_templates FROM public.ai_prompt_templates WHERE is_active = true;

    RAISE NOTICE '✅ M73 اكتمل — Phase 8: AI Layer جاهز';
    RAISE NOTICE '   ✓ ai_prompt_templates — % سياسات + % قوالب seed', v_pol_apt, v_templates;
    RAISE NOTICE '   ✓ ai_insights — % سياسات + GENERATED expires_at + UNIQUE يومي', v_pol_ai;
    RAISE NOTICE '   ✓ ai_insights.school_id NOT NULL';
    RAISE NOTICE '';
    RAISE NOTICE '   الخطوة التالية: Edge Function تقرأ من ai_prompt_templates،';
    RAISE NOTICE '   تبني payload من daily_kpis/student_analytics_cache،';
    RAISE NOTICE '   تستدعي Claude API وتخزن النتيجة في ai_insights.';
END $$;

COMMIT;
