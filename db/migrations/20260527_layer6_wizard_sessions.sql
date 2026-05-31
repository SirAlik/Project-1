-- Migration 50: Layer 6 — Wizard Sessions + Reason Codes Catalog
-- جلسات المعالج الذكي + قاموس الأسباب الموحَّد
-- المرحلة 3 من Sidra Hybrid Automation v2

-- ─────────────────────────────────────────────────────────────────────────────
-- reason_codes_catalog — قاموس أسباب موحَّد لجميع الـ wizards
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reason_codes_catalog (
  id             uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  category       text  NOT NULL,
  -- 'corrective_action' | 'hr_late' | 'hr_absence' | 'nonconformance'
  code           text  NOT NULL,
  label_ar       text  NOT NULL,
  iso_clause     text,
  severity       text  CHECK (severity IN ('low','medium','high','critical')),
  default_action text,
  is_active      boolean NOT NULL DEFAULT true,

  CONSTRAINT rcc_code_unique UNIQUE (code)
);

COMMENT ON TABLE public.reason_codes_catalog IS
  'Layer 6: قاموس الأسباب الموحَّد — seed-only, يُقرأ من UI كـ dropdowns';

-- RLS: قراءة لجميع المستخدمين المُسجَّلين، كتابة للـ system_owner فقط
ALTER TABLE public.reason_codes_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rcc_select" ON public.reason_codes_catalog FOR SELECT
  USING (is_active = true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed — أسباب الإجراء التصحيحي (15 سبباً)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.reason_codes_catalog
  (category, code, label_ar, iso_clause, severity, default_action)
VALUES
  ('corrective_action','CA-01','عدم توثيق العمليات وفق متطلبات ISO','7.5','high','توثيق الإجراء المعني وتحديث السجل'),
  ('corrective_action','CA-02','تكرار نفس عدم المطابقة للمرة الثانية','10.2','critical','تحليل السبب الجذري وخطة منع التكرار'),
  ('corrective_action','CA-03','عدم تحقيق الهدف النوعي المحدد','9.1','high','مراجعة الهدف وإعادة جدولة خطة التنفيذ'),
  ('corrective_action','CA-04','عدم تطبيق الخطة التشغيلية الموثقة','8.1','high','تطبيق الخطة فوراً وإضافة آلية متابعة أسبوعية'),
  ('corrective_action','CA-05','عدم إجراء المراجعة الدورية المطلوبة','9.3','medium','جدولة المراجعة الفائتة وتوثيقها'),
  ('corrective_action','CA-06','انحراف في تنفيذ إجراء موثق','8.5','high','العودة للإجراء الموثق وتدريب المعني'),
  ('corrective_action','CA-07','عدم استيفاء متطلبات السجلات الإلزامية','7.5.3','medium','استكمال السجلات الناقصة خلال أسبوع'),
  ('corrective_action','CA-08','إخفاق في إجراء التحسين المستمر','10.3','medium','تحديد فرصة تحسين جديدة وتوثيقها'),
  ('corrective_action','CA-09','عدم اتباع إجراءات الطوارئ','8.2','critical','إعادة تدريب على خطة الطوارئ وتوثيق الاستجابة'),
  ('corrective_action','CA-10','قصور في تطبيق متطلبات السلامة','8.1','critical','تصحيح الوضع فوراً وإعداد تقرير الحادثة'),
  ('corrective_action','CA-11','عدم الالتزام بالوقت المحدد للعمليات','8.5','low','توضيح الجدول الزمني وإضافة نقطة متابعة'),
  ('corrective_action','CA-12','قصور في تهيئة الموارد اللازمة','7.1','medium','طلب الموارد رسمياً وتوثيق الطلب'),
  ('corrective_action','CA-13','عدم الاستجابة لملاحظات المراجعة الداخلية','9.2','high','الرد على ملاحظات المراجعة خلال أسبوعين'),
  ('corrective_action','CA-14','إغفال متطلبات الكفاءة والتأهيل','7.2','medium','تحديد برنامج التدريب المناسب وتسجيله'),
  ('corrective_action','CA-15','انتهاك سياسة حماية البيانات','7.5','critical','تحديد نطاق الانتهاك والمعالجة الفورية')
ON CONFLICT (code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed — أسباب تأخر الموظف (8 أسباب)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.reason_codes_catalog
  (category, code, label_ar, iso_clause, severity, default_action)
VALUES
  ('hr_late','HL-01','ازدحام مروري أو عطل في وسيلة النقل',NULL,'low','تنبيه شفوي لأول مرة'),
  ('hr_late','HL-02','ظرف صحي طارئ يستوجب التوثيق الطبي',NULL,'low','قبول العذر مع تقديم التقرير الطبي'),
  ('hr_late','HL-03','ظرف عائلي طارئ',NULL,'low','قبول العذر لمرة واحدة'),
  ('hr_late','HL-04','عطل في البنية التحتية (كهرباء / مياه)',NULL,'low','قبول العذر بتأييد من الإدارة'),
  ('hr_late','HL-05','تأخر وسيلة نقل المدرسة',NULL,'low','قبول العذر مع متابعة الجهة المعنية'),
  ('hr_late','HL-06','اجتماع رسمي قبل الدوام (موثَّق)',NULL,'low','قبول العذر بتقديم الدليل'),
  ('hr_late','HL-07','مهمة رسمية خارجية معتمدة',NULL,'low','قبول العذر تلقائياً'),
  ('hr_late','HL-08','بلا عذر مقبول',NULL,'high','تنبيه كتابي وتسجيل المخالفة')
ON CONFLICT (code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed — أسباب غياب الموظف (10 أسباب)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.reason_codes_catalog
  (category, code, label_ar, iso_clause, severity, default_action)
VALUES
  ('hr_absence','HA-01','إجازة مرضية بتقرير طبي معتمد',NULL,'low','اعتماد الإجازة بعد تقديم التقرير'),
  ('hr_absence','HA-02','إجازة اضطرارية — وفاة قريب من الدرجة الأولى',NULL,'low','اعتماد إجازة العزاء وفق اللائحة'),
  ('hr_absence','HA-03','إجازة زواج',NULL,'low','اعتماد إجازة الزواج وفق اللائحة'),
  ('hr_absence','HA-04','مهمة رسمية معتمدة مسبقاً',NULL,'low','قبول تلقائي بوجود الأمر الرسمي'),
  ('hr_absence','HA-05','ظرف صحي طارئ بدون تقرير طبي',NULL,'medium','منح مهلة 3 أيام لتقديم التقرير'),
  ('hr_absence','HA-06','تعذّر الوصول بسبب أحوال جوية أو طارئ أمني',NULL,'low','قبول العذر بتأييد الجهات المختصة'),
  ('hr_absence','HA-07','إجازة اضطرارية لسبب آخر',NULL,'medium','التحقق من السبب واتخاذ القرار المناسب'),
  ('hr_absence','HA-08','إجازة سنوية معتمدة مسبقاً من الإدارة',NULL,'low','تأكيد الموافقة في السجلات'),
  ('hr_absence','HA-09','غياب بعذر غير رسمي',NULL,'medium','طلب توضيح رسمي خلال يومين'),
  ('hr_absence','HA-10','غياب بدون عذر',NULL,'critical','بدء إجراءات المساءلة الرسمية')
ON CONFLICT (code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- wizard_sessions — جلسات المعالج الذكي
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.wizard_sessions (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id                   uuid        NOT NULL REFERENCES public.schools(id),
  wizard_type                 text        NOT NULL,
  -- 'corrective_action' | 'staff_evaluation' | 'hr_inquiry'

  -- ربط بالـ workflow instance (يُعيَّن بعد إطلاق الـ workflow)
  workflow_instance_id        uuid        REFERENCES public.workflow_instances(id),

  -- منشئ الجلسة (منسق الجودة عادةً)
  initiated_by_persona_id     uuid        NOT NULL REFERENCES public.user_personas(id),
  initiated_by_name_snapshot  text        NOT NULL,

  -- الهدف (الموظف المعني بالإجراء)
  target_persona_id           uuid        REFERENCES public.user_personas(id),
  target_name_snapshot        text,
  target_role_snapshot        text,

  -- بيانات المعالج
  form_data                   jsonb,      -- جميع مدخلات المستخدم
  reason_codes                text[]      NOT NULL DEFAULT '{}',

  -- الحالة
  status                      text        NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','submitted','completed','cancelled')),
  qms_form_code               text,       -- 'QF03-1', 'QF-71-9-x', ...

  created_at                  timestamptz NOT NULL DEFAULT now(),
  submitted_at                timestamptz
);

COMMENT ON TABLE public.wizard_sessions IS
  'Layer 6: جلسات المعالج الذكي — تُنشأ عند تقديم wizard وتُربط بـ workflow_instance';

CREATE INDEX IF NOT EXISTS idx_ws_school_type
  ON public.wizard_sessions (school_id, wizard_type, status);

CREATE INDEX IF NOT EXISTS idx_ws_initiator
  ON public.wizard_sessions (initiated_by_persona_id);

CREATE INDEX IF NOT EXISTS idx_ws_workflow
  ON public.wizard_sessions (workflow_instance_id)
  WHERE workflow_instance_id IS NOT NULL;

-- RLS
ALTER TABLE public.wizard_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ws_select" ON public.wizard_sessions FOR SELECT
  USING (
    school_id = get_my_school_id()
    OR (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
  );

CREATE POLICY "ws_insert" ON public.wizard_sessions FOR INSERT
  WITH CHECK (school_id = get_my_school_id());

CREATE POLICY "ws_update" ON public.wizard_sessions FOR UPDATE
  USING (school_id = get_my_school_id());
