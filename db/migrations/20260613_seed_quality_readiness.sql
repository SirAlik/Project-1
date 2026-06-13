-- =================================================================
-- M81 (seed): جاهزية الجودة — سنة دراسية نشطة + مؤشر ATT-001
-- التاريخ: 2026-06-13  ·  Phase 3E-2
-- =================================================================
-- يُفعّل **سلسلة الأدلة الحقيقية الوحيدة المربوطة حالياً**:
--   period_attendance (INSERT) → trigger M78 → quality_evidence (ATT-001)
--
-- M78 يتطلّب صراحةً، وإلا يتخطّى بصمت:
--   (1) مؤشر ATT-001 للمدرسة: is_auto_fillable=true · is_active=true
--   (2) سنة دراسية نشطة للمدرسة (academic_years.is_active=true)
--
-- هذا seed بيانات حقيقي (تعريف مؤشر + سنة) — **ليس دليلاً وهمياً**.
-- الأدلة (quality_evidence) لا تُنشأ إلا عند تسجيل غياب/تأخر حقيقي.
--
-- النطاق: مدرسة الفلاح فقط (المستأجر الوحيد المُسجَّل ببرنامج جودة في
--   lib/quality/tenant-templates.ts). يُحَدَّد بـ slug='al-falah' (مستقر،
--   لا UUID مُثبَّت). idempotent عبر ON CONFLICT DO NOTHING.
--
-- ملاحظة تشغيلية: السنة والمؤشر يصيران لاحقاً تحت إدارة school_admin
--   (تدوير السنة · تفعيل/تعطيل المؤشر) — هذا seed أساس أوّلي فقط.
-- =================================================================

BEGIN;

-- ── (1) سنة دراسية نشطة للفلاح (السنة الجارية نسبةً لتاريخ الإطلاق) ──
INSERT INTO public.academic_years (school_id, name, start_date, end_date, is_active)
SELECT s.id, '2025-2026', DATE '2025-08-24', DATE '2026-06-25', true
FROM public.schools s
WHERE s.slug = 'al-falah'
ON CONFLICT (school_id, name) DO NOTHING;

-- ── (2) مؤشر ATT-001 (انتظام الطلاب — غياب/تأخر) المربوط بـ trigger M78 ──
INSERT INTO public.quality_indicators (
    school_id, code, name_ar, domain, responsible_role,
    measurement_method, target_value, is_auto_fillable, is_active
)
SELECT
    s.id,
    'ATT-001',
    'انتظام الطلاب (الغياب والتأخر)',
    'attendance',
    'student_affairs_vp',
    'احتساب آلي من سجل الحضور بالحصة (period_attendance) عبر trigger M78: غياب=1.0 · تأخر=0.5',
    NULL,   -- لا قيمة مستهدفة مُختلَقة — تُضبط لاحقاً من إدارة المدرسة
    true,   -- is_auto_fillable — شرط عمل trigger M78
    true    -- is_active
FROM public.schools s
WHERE s.slug = 'al-falah'
ON CONFLICT (school_id, code) DO NOTHING;

-- ── التحقق النهائي ──
DO $$
DECLARE
    v_school   uuid;
    v_year     integer;
    v_ind      integer;
BEGIN
    SELECT id INTO v_school FROM public.schools WHERE slug = 'al-falah';
    IF v_school IS NULL THEN
        RAISE NOTICE 'تخطّي: لا مدرسة بـ slug=al-falah (لا seed)';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO v_year FROM public.academic_years
    WHERE school_id = v_school AND is_active = true;
    SELECT COUNT(*) INTO v_ind FROM public.quality_indicators
    WHERE school_id = v_school AND code = 'ATT-001'
      AND is_auto_fillable = true AND is_active = true;

    IF v_year < 1 THEN RAISE EXCEPTION 'FAIL: لا سنة دراسية نشطة للفلاح'; END IF;
    IF v_ind  < 1 THEN RAISE EXCEPTION 'FAIL: مؤشر ATT-001 غير مُفعَّل للفلاح'; END IF;

    RAISE NOTICE '✅ seed جاهزية الجودة اكتمل (الفلاح):';
    RAISE NOTICE '   ✓ سنة دراسية نشطة (% سنة نشطة)', v_year;
    RAISE NOTICE '   ✓ مؤشر ATT-001 مُفعَّل (auto_fillable+active) — سلسلة الحضور→الدليل حيّة';
END $$;

COMMIT;
