-- ════════════════════════════════════════════════════════════════════════════
-- Sprint 3 — Phase 2/3: جدول مكافآت الفصل (classroom_rewards)
-- ════════════════════════════════════════════════════════════════════════════
--
-- المشكلة:
--   النجوم/الأوسمة/النقاط الإيجابية الصفّية لم يكن لها مكان تخزين صحيح:
--     • enum `events.type` مخصّص للأحداث التشغيلية/التأديبية (غياب/تأخر/مخالفة/…)؛
--       حشو سلوك إيجابي فيه تزوير دلالي (ممنوع).
--     • اقتصاد الـmetaverse (`student_wallet`/`transaction_logs`/`rpc_process_transaction`)
--       عالَم منفصل (عملات/سوق/مهام) بقيود اقتصاد/circuit-breaker/salt — قسر النقاط
--       الصفّية فيه يقرنها بنظام غير معنيّ بها.
--   لذا بقيت معطّلة بصدق في Sprint 1/2.
--
-- الحل (Option B — جدول منظَّم مخصّص):
--   نطاق مستقلّ للمكافآت الصفّية الإيجابية: نجمة/نقطة إيجابية/وسام، بعزل مستأجر
--   كامل (`school_id` + `class_id` + `student_id`) ومرجع المُنشئ، وRLS بأدوار مناسبة.
--   النقاط اليومية تُحسب من هذا الجدول (إيجابي) + أحداث `events` التأديبية (سلبي).
--
-- ملاحظات:
--   • لا أكواد QF مُختلَقة ولا بذور مكافآت وهمية — الجدول يبدأ فارغاً؛ المكافأة
--     تُنشأ فقط حين يمنحها عضو طاقم لطالب حقيقي.
--   • `label` نصّ حرّ (اسم المكافأة/السلوك كما يختاره المعلّم) — لا قائمة مُثبَّتة.
--   • `points` مساهمة النقاط الإيجابية (الوسام قد يكون 0 = إنجاز بلا نقاط).
--   • `created_by` = `auth.uid()` (مثل اصطلاح `events.created_by`، بلا FU صارم لـauth).
--
-- أثر التراجع:
--   جدول + فهارس + سياسات جديدة فقط (لا تغيير لأي كائن قائم).
--   التراجع: `DROP TABLE public.classroom_rewards CASCADE;`. PRE-LAUNCH: لا بيانات.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.classroom_rewards (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id             uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id              uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id            uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    reward_type           text NOT NULL CHECK (reward_type IN ('star', 'positive_point', 'badge')),
    label                 text NOT NULL,
    points                integer NOT NULL DEFAULT 1,
    note                  text,
    created_by            uuid,
    created_by_persona_id uuid,
    reward_date           date NOT NULL DEFAULT current_date,
    created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classroom_rewards_class_date ON public.classroom_rewards (class_id, reward_date);
CREATE INDEX IF NOT EXISTS idx_classroom_rewards_student    ON public.classroom_rewards (student_id);
CREATE INDEX IF NOT EXISTS idx_classroom_rewards_school     ON public.classroom_rewards (school_id);

ALTER TABLE public.classroom_rewards ENABLE ROW LEVEL SECURITY;

-- إدراج: طاقم تشغيل الفصل لمدرسته فقط
CREATE POLICY cr_insert ON public.classroom_rewards FOR INSERT
WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = ANY (ARRAY['teacher','school_admin','school_principal','activity_leader'])
);

-- قراءة: مالك النظام، أو أدوار المدرسة المعنيّة بمتابعة الطالب
CREATE POLICY cr_select ON public.classroom_rewards FOR SELECT
USING (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner')
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') = ANY (ARRAY['teacher','school_admin','school_principal','academic_vp','student_affairs_vp','student_counselor']))
);

-- حذف (تراجع): المعلّم/المنسق/المدير لمدرسته فقط
CREATE POLICY cr_delete ON public.classroom_rewards FOR DELETE
USING (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = ANY (ARRAY['teacher','school_admin','school_principal'])
);
