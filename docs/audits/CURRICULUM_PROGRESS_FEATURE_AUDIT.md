# ميزة المنهج للمعلّم — توزيع المنهج وتقدّمه — Sidra / School OS

**آخر تحديث:** 2026-06-27 (Sprint 8) · **الحالة:** **منفّذة — توزيع المنهج يؤلّفه المعلّم** · **العلامة المرئية:** «سِدرة»
**المشروع:** PRE-LAUNCH — لا مستخدمون حقيقيون · لا بيانات إنتاجية.

> **النموذج الميداني الصحيح:** الإدارة **تُسند** المعلّم للمادة/الفصل · المعلّم **يوزّع** المنهج · الإدارة **تتابع** الإنجاز.

---

## الحالة بعد Sprint 8
داخل **`/classroom/[classId]`** يرى المعلّم المُسنَد قسم **«توزيع المنهج»** يؤلّف فيه الوحدات والدروس (عنوان · تاريخ مخطّط · ترتيب · حالة · ملاحظات) لكل مادة يُدرّسها في الفصل، مع شريط **«تقدّم المنهج»** بنسبة حقيقية. **لا تؤلّف الإدارة منهج المعلّم** — قراءة/متابعة فقط.

### التصحيح مقابل Sprint 7 (الخطأ التصميمي)
| البند | Sprint 7 (خطأ) | Sprint 8 (مصحّح) |
|---|---|---|
| نطاق الوحدة | عالمي `(subject_id + grade_level)` — خطة مشتركة لكل فصول الصف | `(class_id + subject_id)` — توزيع خاص بالفصل |
| المؤلِّف | الإدارة (`school_admin/principal/academic_vp`) فقط | **المعلّم المُسنَد فقط** |
| القيد الفريد | `UNIQUE(subject_id, grade_level, title)` يمنع توزيعاً خاصاً لكل فصل | `UNIQUE(class_id, subject_id, title)` — لكل فصل توزيعه |
| حالة الدرس | جدول منفصل `class_curriculum_progress` | على الدرس مباشرةً (`status`) — الجدول المنفصل **حُذف** |
| دور الإدارة | تؤلّف | **تتابع فقط (قراءة)** |

### أين تظهر
- المسار: `/classroom/[classId]` (Server Component يحرس الفصل + تكليف المعلّم).
- المكوّن: `app/classroom/[classId]/_components/CurriculumProgress.tsx`.
- الإجراءات: `app/classroom/[classId]/_actions.ts`.

### كيف تُحسب النسبة (حقيقية، لا static)
`pct = total > 0 ? Math.round(completedLessons / totalActiveLessons * 100) : 0` — من عدّ الدروس النشطة المكتملة (`status='completed'`) لكل (فصل + مادة). `total = 0` → 0% + حالة فارغة. **لا 20%/40% مُثبَّتة ولا نسبة مخزَّنة.**

### الجداول (migration `20260702_curriculum_distribution_correction.sql`، مُطبَّق حياً)
| الجدول | الغرض | مفاتيح/قيود |
|---|---|---|
| `curriculum_units` | وحدة توزيع لفصل+مادة | `school_id`+`class_id`+`subject_id`+`title`+`sort_order`+`is_active`+`created_by` · UNIQUE(class_id,subject_id,title) |
| `curriculum_lessons` | درس داخل وحدة (يحمل حالته) | `school_id`+`unit_id`+`title`+`planned_date`+`estimated_periods`+`status`+`completed_at`+`notes`+`is_active`+`created_by` · UNIQUE(unit_id,title) |
+ دالتان SECURITY DEFINER (search_path=public · EXECUTE لـ authenticated): `is_assigned_subject_teacher(class_id,subject_id)` · `is_unit_owner_teacher(unit_id)`. **حُذف** `class_curriculum_progress` و`is_assigned_class_teacher`.

### RLS وعزل المستأجر
- كل جدول: `school_id NOT NULL` + RLS + **لا `USING(true)`** (مُتحقَّق: `any_permissive_true = null`).
- `school_id = get_my_school_id()` (تقرأ مدرسة التوكن) → عبر-المدارس مستحيل.
- **التأليف (INSERT/UPDATE/DELETE):** المعلّم المُسنَد فقط (`is_assigned_subject_teacher` للوحدات · `is_unit_owner_teacher` للدروس) — **لا سياسة كتابة للإدارة** (`admin_write_policies = null`).
- **القراءة:** system_owner + إدارة/إشراف المدرسة (متابعة) + المعلّم المُسنَد.
- تحقّق حيّ: `is_assigned_subject_teacher`/`is_unit_owner_teacher` تُعيدان **false** لغير المُسنَد/المالك (fail-closed).

### هل الإدارة تؤلّف أم تتابع؟
**تتابع فقط.** لا سياسة كتابة للإدارة على الوحدات/الدروس؛ وإجراءات التأليف تَرفض غير `role='teacher'`. الإدارة تُسند عبر `teacher_assignments` (لم يُمَسّ تدفّق الإسناد).

### هل المعلّم يضيف الوحدات والدروس؟
نعم: `addCurriculumUnitAction` · `addCurriculumLessonAction` · `updateCurriculumLessonAction` (عنوان/تاريخ/ملاحظات) · `setLessonStatusAction` · `deleteCurriculumLessonAction` · `deleteCurriculumUnitAction` (حذف الوحدة الفارغة · **تعطيل آمن** إن كانت تحوي دروسًا). كلها تتحقّق persona + `role='teacher'` + تكليف (فصل+مادة) خادمياً، وRLS الحدّ الأخير.

### عند غياب التوزيع
حالة فارغة صادقة: **«لم يضف المعلم توزيع المنهج لهذا الفصل بعد.»** (مع إتاحة «إضافة وحدة» للبدء). لا مادة مُسنَدة → «لا توجد مادة مُسنَدة إليك في هذا الفصل.»

---

## Phase 6 — سياسة بيانات التجربة (لم تُزرع بيانات حيّة)
لا آلية seed/demo معتمدة. **لم تُدرَج بيانات.** التحقّق عبر build/tsc/lint/test + فحص RLS حيّ.

### قائمة البيانات المطلوبة للتحقّق الحيّ بالمتصفّح (تُوسَم demo/test)
1. مدرسة اختبار · 2. مادة (`subjects`) · 3. فصل (`classes`) · 4. **تكليف معلّم** (`teacher_assignments`: teacher_id=`auth.uid()` + subject_id + class_id + academic_year_id + school_id) · 5. جلسة معلّم مُصادَقة (JWT role=teacher + school_id) → إضافة وحدات/دروس وتغيير الحالة → صفوف `curriculum_units`/`curriculum_lessons`.

### النتائج المتوقَّعة
- لا وحدات → «لم يضف المعلم توزيع المنهج لهذا الفصل بعد.»
- إضافة وحدة + دروس → تظهر؛ النسبة 0% حتى الإكمال.
- تعيين M من N دروس «مكتمل» → النسبة round(M/N*100)% وتتحدّث.
- معلّم غير مُسنَد → «هذا الفصل/المادة غير مُسنَد إليك» (وRLS يمنع).

---

## (تاريخي) سياق Sprint 6 → 7 → 8
- **Sprint 6:** الميزة غير منفّذة (لا جداول؛ placeholders ميتة في تحليلات المدير).
- **Sprint 7:** أُنشئت الجداول لكن بنموذج **خاطئ** (عالمي + admin-authored).
- **Sprint 8:** تصحيح النموذج إلى **teacher-authored distribution** (هذا المستند).
