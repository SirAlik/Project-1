# تدقيق ميزة «تقدّم المنهج / الدرس» للمعلّم — Sidra / School OS

**التاريخ:** 2026-06-27 · **السبرنت:** Sprint 6 — Phase 2 · **العلامة المرئية:** «سِدرة»
**المشروع:** PRE-LAUNCH — لا مستخدمون حقيقيون · لا بيانات إنتاجية.

> هذا تدقيق فقط. **لم تُنفَّذ الميزة** ولم يُضَف أي جدول/migration ولا أي نسبة تقدّم وهمية.

---

## السؤال
هل يستطيع المعلّم حالياً فتح درس/عنصر منهج ورؤية شريط تقدّم يبيّن نسبة إنجاز المنهج (مثلاً 20% · 40%)؟

## الإجابة المختصرة
**لا — الميزة غير منفّذة (Missing).** لا يوجد سطح معلّم يعرض تقدّم منهج حقيقياً، ولا جدول بيانات للمنهج/الدروس، ولا أي مسار يتيح للمعلّم تحديث التقدّم. ما هو موجود مجرّد **واجهة placeholder ميتة (غير قابلة للوصول)** في تحليلات المدير، تعرض شريط نسبة لو وُجدت بيانات — لكن البيانات لا تُملأ أبداً.

---

## ما هو موجود فعلاً (placeholder غير حقيقي)

| الموقع | الحالة | لماذا ليس ميزة حقيقية |
|---|---|---|
| [useTeacherAnalytics.ts](app/principal/analytics/_hooks/useTeacherAnalytics.ts) | يُعرّف النوعين `curriculumProgress: number` و`curriculumDetails: {subject, progress}[]` | لكن `teacherList: []` و`individual: null` دائماً — **لا تُملأ من أي مصدر** |
| [teachers/[id]/page.tsx:106-126](app/principal/analytics/teachers/[id]/page.tsx) | بطاقة «خط سير المنهج» + شريط نسبة (`%{c.progress}`) | تُرسم من `teacher.curriculumDetails`؛ والصفحة **تتوقّف عند spinner التحميل** لأن `!stats.individual` صحيح دائماً → الشريط **غير قابل للوصول** |
| [teachers/page.tsx](app/principal/analytics/teachers/page.tsx) | عمود مخطّط «إنجاز المنهج» (`dataKey="curriculumProgress"`) | مصدره `teacherList` الفارغ → لا يرسم شيئاً |
| [useAcademicAnalytics.ts:34](app/principal/analytics/_hooks/useAcademicAnalytics.ts) | `curriculumCompletion: []` | مصفوفة فارغة دائماً — حالة فارغة صادقة |
| سلاسل ثابتة في [teachers/[id]/page.tsx:163](app/principal/analytics/teachers/[id]/page.tsx) | «تم تحديث خطة الدرس للفصل ٤/أ» · «+%١٢» | **placeholder ثابت ميت** داخل سجلّ أحداث؛ غير قابل للوصول (الصفحة عالقة على spinner) — يجب حذفه/استبداله عند بناء الميزة |

**ملاحظات مهمّة:**
- كل ما سبق **يخصّ المدير (`school_principal`) في تحليلاته**، وليس سطح المعلّم.
- سطح المعلّم الفعلي [/classroom/[classId]](app/classroom/[classId]) **لا يحوي أي تقدّم منهج إطلاقاً** (مقاعد · أدوار · حضور · مكافآت · أحداث صفّية فقط).
- صفحة [/educational](app/educational/page.tsx) حالة فارغة صادقة بلا مؤشرات منهج.

## مصدر البيانات
**لا يوجد.** فحص قاعدة البيانات الحيّة (`information_schema`) لجداول تطابق `curriculum/lesson/syllabus/unit/chapter/topic/progress/coverage`:
- النتيجة الوحيدة: **`quest_progress`** — جدول تقدّم مهام الـ gamification (اقتصاد الميتافيرس)، **لا علاقة له بالمنهج الدراسي**.
- **لا** `curriculum_units` · **لا** `curriculum_lessons` · **لا** `class_curriculum_progress` · **لا** أي جدول دروس/وحدات/مواضيع.

## هل النسبة حقيقية أم static؟
**لا حقيقية ولا static مرئية** — لا تُحسب من أي مصدر، ولا تُعرض أصلاً (الواجهة عالقة على التحميل لأن `individual = null`). لا توجد في أي مكان معادلة `completed_lessons / total_lessons * 100`.

## هل يستطيع المعلّم تحديث التقدّم؟
**لا** — لا جدول · لا server action · لا مسار · لا UI.

## النطاق (per class/subject/teacher/school)؟
**غير منطبق** — لا توجد ميزة لتكون لها حُبيبيّة.

---

## الخلاصة: غير منفّذة (Missing)
- لا أساس آمن قائم لبناء سريع وصغير. الميزة تتطلب جداول جديدة + RLS + خدمات + UI معلّم → **ليست تغييراً صغيراً**.
- **لم تُنفَّذ في Sprint 6** عملاً بقاعدة «لا تُنشئ المخطط إلا إذا كان الأساس آمناً والتنفيذ صغيراً».

## التصميم المقترح (Sprint 7 — مقترح، غير منفَّذ)
multi-tenant صارم · `school_id NOT NULL` · RLS لكل جدول · بلا نسب وهمية:

```
curriculum_units        (id, school_id, subject_id, stage_id?, name, order_index, total_lessons, created_by, created_at)
curriculum_lessons      (id, school_id, unit_id, title, order_index, created_by, created_at)
class_curriculum_progress (id, school_id, class_id, subject_id, teacher_persona_id,
                           unit_id, lesson_id, status['not_started'|'in_progress'|'completed'],
                           completed_at, created_at, updated_at)
```
- **النسبة من إنجاز حقيقي فقط:** `progress_percent = completed_lessons / total_lessons * 100` (محسوبة، لا مخزَّنة كرقم حرّ يُكتب يدوياً).
- **tenant-scoped:** `school_id` من `getActivePersona()` خادمياً — لا من العميل.
- **يحدّثه المعلّم** عبر server action مع تحقّق persona + ملكية الفصل (`teacher_assignments`).
- **حُبيبيّة:** per (class × subject)، مملوكة لـ `teacher_persona_id`، ضمن `school_id`.
- يدعم تقارير/PDF مستقبلية عبر طبقتي الجودة (6 التعبئة · 7 النماذج).
- **تنظيف مصاحب:** إزالة placeholder المنهج الميت من تحليلات المدير (`useTeacherAnalytics`/`teachers[/id]`) أو ربطه بالمصدر الحقيقي.

## التوصية
**نعم — يُقترح جعلها Sprint 7** (ميزة قائمة بذاتها بمخطط + RLS + خدمات + سطح معلّم)، وليس تعديلاً صغيراً ضمن سبرنت تنظيف. تحتاج **migration**. حتى تنفيذها: لا تُعرض أي نسبة تقدّم منهج (الحفاظ على قاعدة صدق البيانات).
