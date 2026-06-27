# ميزة «تقدّم المنهج / الدرس» للمعلّم — Sidra / School OS

**آخر تحديث:** 2026-06-27 (Sprint 7) · **الحالة:** **منفّذة (Implemented)** · **العلامة المرئية:** «سِدرة»
**المشروع:** PRE-LAUNCH — لا مستخدمون حقيقيون · لا بيانات إنتاجية.

> سجلّ Sprint 6 (التدقيق) أدناه يُحفظ كتاريخ؛ القسم العلوي يعكس تنفيذ Sprint 7.

---

## الحالة بعد Sprint 7: منفّذة
المعلّم يرى داخل `/classroom/[classId]` قسم **«تقدّم المنهج»** بنسبة حقيقية لكل مادة يُدرّسها في الفصل، ويُحدّث حالة كل درس.

### أين تظهر
- المسار: [/classroom/[classId]](app/classroom/[classId]) (Server Component يحرس الفصل + تكليف المعلّم).
- المكوّن: [CurriculumProgress.tsx](app/classroom/[classId]/_components/CurriculumProgress.tsx)، مركّب في [ClassroomWorkspace.tsx](app/classroom/[classId]/_components/ClassroomWorkspace.tsx).
- الإجراءات: [_actions.ts](app/classroom/[classId]/_actions.ts) — `getClassCurriculumAction` · `setLessonProgressAction`.

### كيف تُحسب النسبة (حقيقية، لا static)
`progress_percent = completedLessons / totalActiveLessons * 100` — محسوبة في العميل من عدّ الدروس النشطة المكتملة فعلياً لكل (فصل + مادة). إذا `totalActiveLessons = 0` → النسبة 0 وتُعرض حالة فارغة صادقة. **لا أرقام مُثبَّتة (20%/40%) ولا قيمة نسبة مخزَّنة يدوياً.**

### الجداول (migration `20260701_curriculum_progress.sql`، مُطبَّق حياً)
| الجدول | الغرض | مفاتيح/قيود |
|---|---|---|
| `curriculum_units` | وحدات منهج لمادة عند صفّ | `school_id`+`subject_id`+`grade_level`+`title`+`sort_order`+`is_active` · UNIQUE(school_id,subject_id,grade_level,title) |
| `curriculum_lessons` | دروس داخل الوحدة | `school_id`+`unit_id`+`title`+`estimated_periods`+`is_active` · UNIQUE(unit_id,title) |
| `class_curriculum_progress` | حالة إنجاز درس لفصل | `school_id`+`class_id`+`lesson_id`+`status`(not_started/in_progress/completed)+`completed_at`+`updated_by` · **UNIQUE(class_id,lesson_id)** |
+ دالة `is_assigned_class_teacher(uuid)` (SECURITY DEFINER · search_path=public · EXECUTE لـ authenticated) للتحقّق من تكليف المعلّم داخل RLS.

### RLS وعزل المستأجر
- كل جدول: `school_id NOT NULL` + RLS مفعّلة + **لا `USING(true)`** (مُتحقَّق حياً).
- `school_id = get_my_school_id()` على كل صف — و`get_my_school_id()` تقرأ `school_id` من **توكن المُستدعي نفسه** (`auth.jwt()->'app_metadata'->>'school_id'`) → القراءة/الكتابة عبر المدارس **مستحيلة بنيوياً**.
- تأليف المنهج (units/lessons): `school_admin`/`school_principal`/`academic_vp` لمدرستهم.
- تقدّم الفصل: المعلّم يقرأ/يُحدّث **فقط الفصول المُسنَدة إليه** (`is_assigned_class_teacher` — يطابق `teacher_assignments.teacher_id = auth.uid()`)؛ الإدارة/الإشراف على مستوى المدرسة؛ `system_owner` قراءة فقط.
- تحقّق حيّ: `is_assigned_class_teacher` تُعيد `false` لفصل غير مُسنَد (fail-closed)، و`get_my_school_id()` تُعيد مدرسة التوكن.

### هل يُحدّث المعلّم التقدّم؟
نعم — أزرار حالة لكل درس (لم يبدأ/قيد التنفيذ/مكتمل) → `setLessonProgressAction`. التحقّق الخادمي: persona + `schoolId` + الفصل/الدرس في المدرسة + صفّ الدرس = صفّ الفصل + (للمعلّم) تكليف (فصل+مادة). RLS الحدّ الأخير.

### عند غياب خطة المنهج
حالة فارغة صادقة: **«لم يتم إعداد خطة المنهج لهذا الفصل بعد.»** (تظهر عندما لا توجد وحدات/دروس نشطة لمواد المعلّم عند صفّ الفصل، أو الصفّ غير محدّد). لا نسبة وهمية.

### تنظيف placeholders تحليلات المدير
حقول `curriculumProgress`/`curriculumDetails`/`curriculumCompletion` (تحليلات المدير) كانت placeholders ميتة. بقيت فارغة (لا تجميع على مستوى المعلّم بعد)، واستُبدلت ملاحظة «تتوافق مع الخطط المسجلة في Classroom» المضلّلة بحالة فارغة صادقة تشير لميزة الفصل، ووُسمت الحقول كغير-مربوطة. **لا نسبة منهج مُختلَقة متبقية.**

---

## Phase 6 — سياسة بيانات التجربة (لم تُزرع بيانات حيّة)
لا آلية seed/demo معتمدة (لا `db/seed`، لا `supabase/seed`، لا npm script). إنشاء بيانات في المدرسة الحيّة الوحيدة = بيانات إنتاجية وهمية (ممنوع). **لم تُدرَج أي بيانات.** التحقّق تمّ عبر build/tsc/lint/test + فحص RLS الحيّ.

### قائمة البيانات المطلوبة للتحقّق الحيّ بالمتصفّح (تُوسَم demo/test)
1. **مدرسة اختبار** (`schools`) — أو استخدام المدرسة القائمة في بيئة اختبار.
2. **مادة** (`subjects`: school_id + name_ar).
3. **فصل** (`classes`: school_id + grade_level + stage_id + section).
4. **تكليف معلّم** (`teacher_assignments`: teacher_id = `auth.uid()` للمعلّم + subject_id + class_id + academic_year_id + school_id).
5. **طلاب** (`student_profiles`: class_id + school_id) — اختياري لعرض القسم (التقدّم لا يعتمد على الطلاب).
6. **وحدات منهج** (`curriculum_units`: school_id + subject_id + grade_level = صفّ الفصل + title + is_active).
7. **دروس** (`curriculum_lessons`: school_id + unit_id + title + is_active).
8. **(للتحقّق من التحديث)** جلسة معلّم مُصادَقة (JWT بدور teacher + school_id) → ضغط أزرار الحالة → صفوف `class_curriculum_progress`.

### النتائج المتوقَّعة عند توفّر البيانات
- لا وحدات/دروس → «لم يتم إعداد خطة المنهج لهذا الفصل بعد.»
- N درسًا، 0 مكتمل → 0% · «تم إنجاز 0 من N درسًا».
- وضع M دروس «مكتمل» → النسبة = round(M/N*100)% وتتحدّث فوراً.
- معلّم غير مُسنَد للفصل/المادة → رفض «هذا الفصل/المادة غير مُسنَد إليك» (وRLS يمنع).

---

## (تاريخي) تدقيق Sprint 6 — كانت غير منفّذة
أكّد Sprint 6: لا ميزة حقيقية · لا جداول منهج (فقط `quest_progress` = gamification) · `curriculumProgress`/`curriculumDetails`/`curriculumCompletion` placeholders ميتة في تحليلات المدير (`individual=null`، صفحة عالقة على spinner) · لا نسبة محسوبة. هذا ما عالجه Sprint 7 أعلاه.
