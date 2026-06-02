# Sidra OS — المعمارية التقنية المتكاملة
## وثيقة مرجع هندسية | الإصدار 3.1 | رجب 1446هـ

> **هذه الوثيقة تُلغي:** `sidra_automation_report.md` (v1) و`sidra_hybrid_automation_v2.md` (v2)
>
> **ليست وثيقة تنفيذ** — الأكواد الكاملة موجودة في Supabase وفي `db/migrations/`. هذه الوثيقة تصف *لماذا* و*كيف* تتصل الأجزاء ببعضها.

---

## 1. المقدمة التنفيذية

**76 عملية، 141 نموذجاً** موزّعة على 10 أدوار إدارية — كلها تُملأ يدوياً حاليًا — وكلها قابلة للأتمتة عبر بنية event-driven مع الحفاظ على امتثال ISO 9001:2015.

### المبادئ المعمارية الأساسية

| المبدأ | التطبيق |
|--------|---------|
| **SSOT — مصدر الحقيقة الواحد** | 4 جداول قاعدية هي المرجع لكل النماذج. لا تكرار للبيانات. |
| **الجودة كناتج ثانوي** | المستخدم يُنجز مهمة تشغيلية. النظام يُنتج PDF نظام الجودة في الخلفية. |
| **Full-Auto للمخاطر المنخفضة** | تسجيل الغياب، الإشعارات، التذكيرات — trigger مباشر بلا تدخل. |
| **Approval-Gated للمخاطر العالية** | حسم الراتب، الإجراء التصحيحي، محضر الاجتماع — موافقة بشرية موثَّقة. |
| **Chain of Custody** | كل قرار بشري مسجَّل: من + متى + ماذا + لماذا + توقيع رقمي. |
| **لا تكسر ما يعمل** | Layers 1-4 تستمر بلا تعديل. Layers 5-7 تُضاف كطبقة orchestration فوقها. |

---

## 2. مصفوفة القرار — متى نُؤتمت ومتى نطلب موافقة؟

| العملية | مخاطر الخطأ | أثر قانوني/مالي | النموذج |
|---------|------------|-----------------|---------|
| تسجيل غياب الطالب | منخفض | لا | Full-Auto Trigger |
| إشعار طارئة صحية | منخفض | لا | Full-Auto Trigger |
| تذكير استعارة كتاب | منخفض | لا | Full-Auto Trigger |
| إحالة طالب للمرشد (5 غيابات) | متوسط | لا | Full-Auto + إشعار |
| إجراء تصحيحي ISO (QF03-1) | عالٍ | نعم | Smart Wizard + Approval |
| حسم راتب موظف (QF-A-3-3) | عالٍ جداً | نعم | HR State Machine + Manager Decision |
| تقييم أداء وظيفي | عالٍ | نعم | Wizard + Approval |
| محضر اجتماع رسمي | متوسط | نعم | Live Collab + Digital Sign-off |
| تحديث جرد المكتبة | منخفض | لا | Bulk Upload + Auto-Validation |
| إغلاق عدم المطابقة | عالٍ | نعم | Wizard + QC Approval |

---

## 3. الطبقات المعمارية — نظرة عامة

```
Layer 1 │ Core Entities (SSOT)              مصدر الحقيقة الوحيد — لا تكرار
Layer 2 │ Operational Logs                  ما يحدث يومياً (غياب، حالات، استعارات)
Layer 3 │ QMS Workflows (auto-triggered)    تنشأ تلقائياً من Layer 2 عبر triggers
Layer 4 │ QMS Management                    تقييمات، أهداف، مخاطر، شكاوى
────────┼──────────────────────────────────────────────────────
Layer 5 │ Workflow Orchestration            محرك workflows + approval_gates
Layer 6 │ Wizard & Collaboration            معالجات ذكية + اجتماعات + HR State Machine
Layer 7 │ Bulk Operations                   رفع مجمَّع + validation + approval
```

**قاعدة التصميم:** كل جداول Layers 1-4 تبقى مصدر الحقيقة. Layers 5-7 تُغلّفها بطبقة orchestration دون أن تستبدلها.

---

## 4. فهرس الجداول

### 4.1 Layer 1 — Core Entities (SSOT)

| الجدول | الغرض | الحالة | أهم العلاقات |
|--------|--------|--------|--------------|
| `schools` | بيانات المدارس — anchor الـ multi-tenancy | ✅ قائم | الجذر — كل جدول يُشير إليه |
| `academic_years` | السنوات الدراسية | ✅ قائم | `schools` |
| `semesters` | الفصول الدراسية | ✅ قائم | `academic_years` |
| `school_staff` | الموظفون — SSOT للأدوار | ✅ قائم | `schools`, `auth.users` |
| `students` | الطلاب — SSOT شامل (معلومات ولي الأمر + الصحة) | ✅ قائم | `schools`, `academic_years` |
| `classrooms` | الفصول الدراسية الفيزيائية | ✅ قائم | `schools`, `school_staff` |
| `timetable_slots` | الجدول الدراسي — SSOT للحصص | ✅ قائم | `schools`, `semesters`, `classrooms`, `school_staff` |

### 4.2 Layer 2 — Operational Logs

| الجدول | الغرض | الحالة | أهم العلاقات | Trigger يُفعَّل |
|--------|--------|--------|--------------|----------------|
| `attendance_logs` | غياب وحضور الطلاب اليومي | ✅ قائم | `students`, `school_staff` | `fn_check_absence_threshold` |
| `medical_cases` | الحالات الصحية | ✅ قائم | `students`, `school_staff` | `fn_medical_emergency_notify` |
| `lrc_resources` | موارد المصادر التعليمية | ✅ قائم | `schools`, `school_staff` | — |
| `lrc_loans` | استعارات الكتب | ✅ قائم | `lrc_resources`, `students`, `school_staff` | cron يومي للتذكير |
| `lrc_class_visits` | زيارات الفصول للمكتبة | ✅ قائم | `classrooms`, `timetable_slots` | يُنشأ من `fn_auto_log_lrc_visit` |
| `lab_resources` | مواد المختبر وجرده | ✅ قائم | `schools`, `school_staff` | — |
| `lab_experiments` | سجل تنفيذ التجارب | ✅ قائم | `semesters`, `classrooms`, `school_staff` | — |
| `activity_domains` | مجالات النشاط | ✅ قائم | `schools`, `academic_years` | — |
| `activity_registrations` | تسجيل الطلاب في الأنشطة | ✅ قائم | `students`, `activity_domains` | — |
| `competitions` | المسابقات داخلية/خارجية | ✅ قائم | `schools`, `school_staff` | — |
| `competition_participants` | مشاركو المسابقات ونتائجهم | ✅ قائم | `competitions`, `students` | — |
| `supervisory_visits` | الزيارات الإشرافية (موحّدة لكل الأدوار) | ✅ قائم | `school_staff`, `classrooms` | — |

### 4.3 Layer 3 — QMS Workflows (Auto-Triggered)

> **ملاحظة تصميم:** هذه الجداول لا يُكتب فيها مستخدمون بشكل مباشر — تُنشأ عبر triggers أو Edge Functions.

| الجدول | الغرض | الحالة | من يُنشئها |
|--------|--------|--------|------------|
| `counselor_referrals` | إحالات للمرشد الطلابي عند تكرار الغياب | ✅ قائم | `fn_check_absence_threshold` تلقائياً |
| `generated_forms` | قائمة انتظار نماذج PDF التي سيُولّدها `generate_qms_pdf` | ✅ قائم | triggers + Layers 5-6 |
| `notifications` | مركز الإشعارات الموحَّد | ✅ قائم | triggers + workflow engine |
| `operational_plans` | الخطط التشغيلية الفصلية (موحّدة لكل الأدوار بـ `role_key`) | ✅ قائم | المستخدمون مباشرة |

### 4.4 Layer 4 — QMS Management

| الجدول | الغرض | الحالة | ملاحظة |
|--------|--------|--------|--------|
| `staff_evaluations` | تقويم الأداء الوظيفي | ✅ قائم | عند `status='completed'` → trigger يُولّد PDF |
| `quality_goals` | أهداف الجودة السنوية | ✅ قائم | — |
| `nonconformance_reports` | تقارير عدم المطابقة | ✅ قائم | Layer 5 يُضيف wizard فوقه |
| `feedback_submissions` | شكاوى ومقترحات | ✅ قائم | — |
| `risk_register` | سجل المخاطر | ✅ قائم | — |
| `asset_disposal_records` | إتلاف الأصول (مشترك: مختبر + مصادر) | ✅ قائم | — |
| ~~`meetings`~~ | **محذوف — مستبدَل بـ `meeting_sessions`** | ❌ Legacy | انظر [ملحق ج](#ملحق-ج--migration-path) |

### 4.5 Layer 5 — Workflow Orchestration

> **الغرض:** محرك workflows عام يُشغِّل أي مسار بيانات يتطلب خطوات متعددة وموافقات بشرية. Layers 1-4 لا تعرف بوجوده.

| الجدول | الغرض | الحالة | أهم العلاقات |
|--------|--------|--------|--------------|
| `workflow_definitions` | تعريفات الـ workflows المتاحة (قاموس) | 🆕 جديد | لا FK خارجية — نقطة مرجعية |
| `workflow_instances` | مثيل workflow حقيقي قيد التنفيذ | 🆕 جديد | `schools`, `school_staff`, `workflow_definitions` |
| `workflow_transitions` | كل انتقال من حالة لأخرى (audit trail كامل) | 🆕 جديد | `workflow_instances`, `school_staff` |
| `approval_gates` | بوابات الموافقة داخل workflow | 🆕 جديد | `workflow_instances`, `school_staff` |

**الـ workflows الخمسة المُعرَّفة:**

| workflow_code | العملية | يرتبط بـ |
|---|---|---|
| `CORRECTIVE_ACTION` | الإجراء التصحيحي ISO | `nonconformance_reports` |
| `HR_ATTENDANCE` | مساءلة الحضور | `hr_accountability_tickets` |
| `STAFF_EVAL` | تقييم الأداء | `staff_evaluations` |
| `MEETING` | اجتماع رسمي | `meeting_sessions` |
| `BULK_UPLOAD` | رفع مجمَّع | `bulk_upload_jobs` |

### 4.6 Layer 6 — Wizards, Meetings & HR State Machine

#### Wizards

| الجدول | الغرض | الحالة | يرتبط بـ |
|--------|--------|--------|---------|
| `wizard_sessions` | جلسة معالج ذكي (corrective_action / staff_evaluation / hr_inquiry) مع بيانات مُعبَّأة مسبقاً | 🆕 جديد | `workflow_instances`, `school_staff` |
| `reason_codes_catalog` | قاموس أسباب موحَّد لكل المعالجات (بدلاً من نص حر) | 🆕 جديد | لا FK — مرجع بحثي |

#### Meetings 2.0

> يستبدل `meetings` (Layer 4 Legacy) بمنظومة كاملة للتحكم في دورة حياة الاجتماع.

| الجدول | الغرض | الحالة | أهم العلاقات |
|--------|--------|--------|--------------|
| `meeting_sessions` | الاجتماع الرئيسي مع state machine (scheduled → in_progress → ended) | 🆕 جديد | `schools`, `school_staff`, `generated_forms` (دعوة + محضر) |
| `meeting_invitees` | تتبع RSVP + الحضور + التوقيع الرقمي لكل مدعو | 🆕 جديد | `meeting_sessions`, `school_staff` |
| `meeting_live_notes` | ملاحظات حية (مناقشة / قرار / مهمة) — يُبثّ عبر Supabase Realtime | 🆕 جديد | `meeting_sessions`, `school_staff` |
| `meeting_action_items` | مهام مُسندة من الاجتماع — مرئية في dashboard المُكلَّف | 🆕 جديد | `meeting_sessions`, `school_staff` |

#### HR State Machine

> أعقد مسار في النظام: 5 ممثلين بشريين، 5 حالات، مخرجات مالية وقانونية.

| الجدول | الغرض | الحالة | أهم العلاقات |
|--------|--------|--------|--------------|
| `biometric_logs` | بصمات خام من جهاز الحضور (raw data) | 🆕 جديد | `schools`, `school_staff` |
| `staff_attendance_logs` | حضور موظفين يومي مُجمَّع من biometric + محسوب | 🆕 جديد | `schools`, `school_staff` |
| `hr_accountability_tickets` | تذاكر المساءلة (تأخر / غياب) — تجمع كل مراحل القرار في سجل واحد | 🆕 جديد | `schools`, `school_staff`, `staff_attendance_logs`, `workflow_instances`, `generated_forms` |

### 4.7 Layer 7 — Bulk Upload Pipeline

| الجدول | الغرض | الحالة | أهم العلاقات |
|--------|--------|--------|--------------|
| `bulk_upload_jobs` | وظيفة رفع مجمَّع (6 أنواع) مع state machine خاص | 🆕 جديد | `schools`, `school_staff`, `approval_gates` |
| `bulk_upload_validations` | نتائج التحقق على مستوى الصف — تُعرض للمستخدم قبل التنفيذ | 🆕 جديد | `bulk_upload_jobs` |

**أنواع الرفع المدعومة:** `lrc_resources` · `lab_resources` · `students` · `activity_budget` · `staff_initial` · `timetable`

---

## 5. الأتمتة الكاملة — خريطة السلاسل السببية

> **كيف يعمل النمط:** UI Action → INSERT في جدول Layer 2 → Trigger → INSERT في Layer 3 → Edge Function → PDF في Storage.

### خريطة تحويل: UI Action → QMS Form

| فعل المستخدم | الجدول المُغذّى | النموذج المُولَّد | الكود |
|---|---|---|---|
| تسجيل غياب الطالب | `attendance_logs` | سجل الغياب | QF-C71-5-2 |
| تكرار غياب ≥ 5 مرات (trigger) | `counselor_referrals` | تحويل للمرشد | QF-C71-5-3 |
| تسجيل حالة صحية | `medical_cases` | متابعة الحالة | QF-70-j-4-1/2 |
| حالة طارئة تستوجب تحويل | `notifications` + `generated_forms` | تحويل للمركز الصحي | QF-70-j-7 |
| تسجيل استعارة كتاب | `lrc_loans` | سجل الاستعارة | QF-H71-5-2/3 |
| إضافة حصة مكتبة في الجدول | `lrc_class_visits` (trigger) | سجل زيارات الفصول | QF-H71-4-1 |
| تثبيت تجربة مختبر | `lab_experiments` | سجل التجارب | QF-i71-4-2 |
| إكمال تقييم موظف | `staff_evaluations` (status=completed) | تقويم الأداء | QF-71-9-x |
| تسجيل طالب في نشاط | `activity_registrations` | سجل النشاط | QF-G71-3-1 |
| إغلاق عدم مطابقة | `nonconformance_reports` | الإجراء التصحيحي | QF-03-1/2 |

### السلاسل السببية الست

**السلسلة 1: الغياب → إحالة للمرشد**
`attendance_logs (INSERT)` → trigger يحسب العدد → عند 5 مرات: `counselor_referrals` + `notifications` + `generated_forms (QF-C71-5-3)`

**السلسلة 2: الحالة الطارئة → إشعار → تحويل**
`medical_cases (INSERT, severity=emergency)` → trigger → `notifications` (student_affairs_vp + school_principal) → إن كانت `requires_referral=true`: `generated_forms (QF-70-j-7)`

**السلسلة 3: الجدول الدراسي → تسجيل زيارة المصادر**
`timetable_slots (INSERT, room_type=library)` → trigger → `lrc_class_visits` + `generated_forms (QF-H71-4-1)` — أمين المصادر يرى الجدول بدون إدخال يدوي

**السلسلة 4: استعارة → تذكير → تصعيد**
`lrc_loans (INSERT)` → cron يومي 8:00 صباحاً → يوم قبل الموعد: `notifications (loan_reminder)` → 3 أيام بعد التأخر: `notifications (overdue_loan → student_affairs_vp)`

**السلسلة 5: اكتمال التقييم → PDF → إشعار**
`staff_evaluations (UPDATE status=completed)` → trigger يُحدد form code بحسب role_key → `generated_forms` → Edge Function `generate_qms_pdf` → `notifications (evaluation_ready)`

**السلسلة 6: نهاية الفصل → جرد تلقائي**
`semesters (status=closed)` → cron → يحسب الاستهلاك من `lab_experiments` + المفقود من `lrc_loans` → يُنتج تقارير الجرد لكل من المختبر والمصادر

---

## 6. الأتمتة الهجينة — سير عمل الـ Workflows

### 6.1 معالج الإجراءات التصحيحية — QF03-1/2

**المُشغِّل:** منسق الجودة يفتح المعالج من شاشته.

**المراحل:**

```
Step 1 — Wizard (منسق الجودة):
  يختار الدور المستهدف → النظام يجلب الموظفين
  يختار السبب من reason_codes_catalog → النظام يقترح الخطورة والإجراء المقترح
  يحدد الإجراء التصحيحي وتاريخ التنفيذ

Step 2 — Gate 1 (الموظف المستهدف):
  يتلقى إشعاراً + PDF مولَّد (QF03-1)
  خيارات: [قبول | اعتراض + شواهد | طلب توضيح]
  ← ISO 10.2.1 يتطلب توقيع الطرف المعني

Step 3 — Gate 2 (منسق الجودة — التحقق من الفعالية):
  يراجع الشواهد المُرفقة
  خيارات: [مغلق-فعّال | إجراء إضافي | مغلق-غير فعّال]
  ← ISO 10.2.2 يتطلب التحقق من الفعالية

Output: QF03-1 (بداية) + QF03-2 (إغلاق) + audit trail كامل
```

**الجداول المتأثرة:** `wizard_sessions` → `nonconformance_reports` ← `workflow_instances` → `approval_gates` × 2 → `generated_forms`

---

### 6.2 محاضر الاجتماعات التفاعلية — QF19-1/2

**المراحل الثلاث:**

| المرحلة | الفعل | المخرج الآلي |
|---------|-------|-------------|
| **الدعوة** | المنظم يُنشئ الاجتماع ويضيف المدعوين والأجندة | PDF QF-19-1 + إشعارات RSVP للمدعوين |
| **الانعقاد (Live)** | المقرر يكتب: مناقشات / قرارات / مهام | Supabase Realtime يبث للحاضرين فورياً. غائبون بعد 15 دقيقة يُعلَّمون تلقائياً |
| **الإنهاء** | المنظم يضغط "إنهاء" | PDF QF-19-2 → يُرسَل للتوقيع الرقمي. `meeting_action_items` تظهر في dashboard المُكلَّفين |

**الجداول المتأثرة:** `meeting_sessions` ← `meeting_invitees` + `meeting_live_notes` + `meeting_action_items` → `generated_forms` (QF-19-1/2)

---

### 6.3 HR State Machine — المساءلة المتصاعدة

**5 حالات:**
```
initiated → awaiting_employee → awaiting_manager → decided → archived
                                                           ↓
                                                       cancelled
```

**5 ممثلون بشريون:** جهاز البصمة (raw) → cron (يُجمِّع) → السكرتير (يُطلق) → الموظف (يردّ) → المدير (يُقرّر) → السكرتير (يُؤرشف)

| الخطوة | المُشغِّل | الإجراء الآلي | الإجراء البشري |
|--------|----------|--------------|----------------|
| 0 | جهاز البصمة webhook | `biometric_logs` INSERT | — |
| 1 | cron 9:00 صباحاً | يحسب `late_minutes` → `staff_attendance_logs` | — |
| 2 | عتبة التأخر (≥15 دقيقة) | إشعار للسكرتير | السكرتير يضغط "فتح تذكرة" |
| 3 | `hr_accountability_tickets` INSERT | PDF QF-A-3-1 مُولَّد | — |
| 4 | — | إشعار للموظف (مهلة 7 أيام) | الموظف يُدخل السبب + المرفقات |
| 5 | انتهاء المهلة بلا رد | escalation تلقائي للمدير | — |
| 6 | — | إشعار للمدير بانتظار القرار | المدير يختار من 6 قرارات |
| 7 (if salary_deduction) | قرار المدير | PDF QF-A-3-3 + إشعار للمالية | — |
| 8 | — | إشعار للسكرتير | السكرتير يؤرشف في Supabase Storage |

**قرارات المدير المتاحة:** `excuse_accepted` · `verbal_warning` · `written_warning` · `sick_leave_approved` · `emergency_leave_approved` · `salary_deduction`

---

### 6.4 Bulk Upload Pipeline

**نمط موحَّد** يخدم 6 أنواع من البيانات.

**مراحل التدفق:**

| المرحلة | الحالة | المُشغِّل | الإجراء |
|---------|--------|----------|---------|
| Upload | `uploaded` | المستخدم | يرفع الملف → `bulk_upload_jobs` INSERT |
| Validation | `validating` → `validated` | Edge Function (async) | يتحقق من كل صف → `bulk_upload_validations` |
| Preview | — | المستخدم | يرى ✅ صحيح / ⚠️ تحذير / ❌ خطأ |
| Approval (إن > 1000 صف أو بيانات حساسة) | `awaiting_approval` | — | إشعار للمدير → `approval_gates` |
| Execution | `processing` → `completed` | Edge Function | INSERT transactional في الجدول الهدف |
| Audit | `completed` | — | `generated_forms` (كشف الإدخال) + إشعار |

---

## 7. الدوال والـ Triggers — فهرس مرجعي

### 7.1 Triggers القائمة (Layers 1-4)

| الدالة | الجدول | يُفعَّل عند | يُنتج |
|--------|--------|------------|-------|
| `fn_check_absence_threshold` | `attendance_logs` | INSERT / UPDATE (status) | `counselor_referrals` + `notifications` + `generated_forms` |
| `fn_medical_emergency_notify` | `medical_cases` | INSERT | `notifications` (وكيل + مدير) + `generated_forms` (QF-4-x / QF-7) |
| `fn_auto_log_lrc_visit` | `timetable_slots` | INSERT (room_type=library) | `lrc_class_visits` + `generated_forms` |
| `fn_evaluation_pdf_queue` | `staff_evaluations` | UPDATE (status→completed) | `generated_forms` (QF-71-9-x) + `notifications` |

### 7.2 Triggers الجديدة (Layers 5-7) — Skeleton

| الدالة | الجدول | يُفعَّل عند | يُنتج |
|--------|--------|------------|-------|
| `fn_notify_approval_gate` | `approval_gates` | INSERT (status=pending) | `notifications` للمُكلَّف |
| `fn_queue_bulk_validation` | `bulk_upload_jobs` | INSERT (status=uploaded) | `notifications` + يُشغِّل Edge Function |

### 7.3 Edge Functions

| الدالة | المُشغِّل | الغرض |
|--------|----------|-------|
| `generate_qms_pdf` | INSERT في `generated_forms` (Supabase Realtime) | يُنتج PDF من template + يرفعه على Storage + يُحدِّث `pdf_url` |
| `daily_maintenance` | cron (8:00 صباحاً يومياً) | تذكيرات الاستعارة + اكتشاف التأخر + تشغيل جرد نهاية الفصل |
| `validate_bulk_upload` | Realtime على `bulk_upload_jobs` (status=uploaded) | يتحقق من كل صف وفق schema registry → `bulk_upload_validations` |

---

## 8. نمط RLS وتدقيق الأمان

### 8.1 القاعدة الذهبية لكل سياسة

**بعد الـ Refactor (R00):** كل سياسة RLS تستخدم:
- `get_my_school_id()` — يقرأ `school_id` من JWT مباشرة (لا استعلام DB)
- `(auth.jwt()->'app_metadata'->>'role')` — يقرأ الدور من JWT

```
system_owner → يرى الكل بلا قيد
school_id = get_my_school_id() + role IN (...) → يرى بيانات مدرسته فقط
```

> **تم استبدال:** `auth_school_id()` و`auth_role_key()` (v1 — كانتا تستعلمان `school_staff`) بنمط JWT المباشر. لا يجب استخدام الدالتين القديمتين في أي سياسة جديدة.

### 8.2 جداول أدوار مخصصة

| الجدول | الأدوار المخوَّلة للقراءة |
|--------|--------------------------|
| `health_visits`, `health_referrals` | health_coordinator, student_affairs_vp, school_principal, school_admin |
| `cases`, `interventions`, `student_risk_flags` | student_counselor, student_affairs_vp, school_principal, school_admin |
| `hr_accountability_tickets` | school_principal, school_admin, school_secretary |
| `approval_gates` | المُكلَّف فقط + school_admin |
| `staff_evaluations` | المُقيِّم + المُقيَّم + school_principal + quality_coordinator |

### 8.3 حالة تدقيق الأمان (آخر تحديث: 2026-05-28)

| البند | الوصف | الحالة | الترحيل |
|------|--------|:------:|---------|
| **C-01** | Trigger معطوب — `behavioral_referrals` مفقودة | ✅ | R02 |
| **C-02** | 23 جدول بدون RLS (relrowsecurity = false) | ✅ | **R07** |
| **C-03** | 12 سياسة بدون `school_id` isolation | ✅ | R06 |
| **C-04** | 9 دوال SECURITY DEFINER مكشوفة للـ `anon` | ✅ | R03 |
| **H-01/02** | دوال بدون `SET search_path` | ✅ | R03 |
| **H-03** | جداول بسياسات `USING (true)` | ✅ | R06 + R07 |
| **H-04** | 75+ جدول مكشوف لـ `anon` عبر PostgREST | ✅ | R08 |
| **H-05** | `action_audit_log` سياسات متعارضة | ✅ | R05 |
| **M-01** | `user_roles` legacy لا يزال موجوداً | ✅ | R04 |
| **M-02** | `hr_inquiries` غير multi-tenant | ✅ | R01 |
| **M-03** | `invites` سياسة مكررة | ✅ | R08 |
| **M-04** | `notifications.recipient_role` بدون CHECK | ✅ | R08 |

**ملاحظة H-04:** R08 نفَّذ `REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM anon` — وصول `anon` مُغلق بالكامل. R09–R12 تكمّل التقوية على الجداول الجديدة وتُضيف سياسات `INSERT/UPDATE/DELETE` الصارمة.

#### ما فعله R07 تحديداً

> **CLAUDE.md:** "There is no data to migrate" — لا backfill. لا nullable. كل عمود `school_id` يُضاف مباشرةً كـ `NOT NULL`.

**النمط الموحَّد لكل جدول (21 جدول):**
```sql
ALTER TABLE public.X DROP COLUMN IF EXISTS school_id CASCADE;  -- يُزيل كل التبعيات القديمة
ALTER TABLE public.X ADD COLUMN school_id uuid NOT NULL REFERENCES public.schools(id);
ALTER TABLE public.X ENABLE ROW LEVEL SECURITY;
-- ثم: DROP IF EXISTS + CREATE POLICY ...
```

| المجموعة | العمل | الجداول |
|---------|-------|---------|
| **21 جدول** | DROP CASCADE + ADD NOT NULL + ENABLE RLS + سياسات | attendance_scans, cases, classroom_metadata, employee_leaves, gradebook_items, health_awareness, health_referrals, health_visits, interventions, lab_bookings, lab_experiments, lab_inventory, lrc_books, lrc_loans, lrc_visit_attendance, lrc_visits, parent_notes, qa_kpis_daily, qa_observations, secretary_correspondence, student_risk_flags |
| **خاص** | user_id = auth.uid() isolation (لا school context) | action_idempotency |
| **خاص** | id = get_my_school_id() (هو الـ school) | schools |

**بوابة التحقق المدمجة في نهاية المايغريشن:**
```sql
-- تفشل الـ transaction إن وُجد nullable school_id أو جدول بدون RLS
IF v_nullable > 0 THEN RAISE EXCEPTION '...'; END IF;
```

---

## 9. ضمان الجودة ISO 9001:2015

| Clause | متطلب | كيف يُلبّيه النظام |
|--------|-------|-------------------|
| 5.3 — أدوار ومسؤوليات | تحديد المسؤول عن كل قرار | `actor_id` في `workflow_transitions` |
| 7.5 — معلومات موثقة | توثيق كل قرار مهم | `workflow_transitions` audit trail |
| 8.5.6 — ضبط التغيير | الموافقة قبل التنفيذ | `approval_gates` |
| 9.1.3 — تحليل وتقييم | مراجعة بشرية للنتائج | Approval Gate في كل workflow |
| 10.2.1 — عدم المطابقة | إقرار الطرف المعني | Gate 1 في wizard الإجراء التصحيحي |
| 10.2.2 — فعالية الإجراء | التحقق من الفعالية | Gate 2 في wizard الإجراء التصحيحي |

---

## 10. Chain of Custody الرقمية

كل عملية حساسة تنتج سلسلة لا يمكن إنكارها:

```
① حدث أصلي         → raw table  (timestamp + device_id)
② بدء workflow      → workflow_instances  (initiator_id + ip_address)
③ كل قرار بشري     → workflow_transitions  (actor_id + signature_hash + IP)
④ مخرج نهائي       → generated_forms  (مرتبط بـ workflow_instance_id)
⑤ أرشفة دائمة      → Supabase Storage  (archived_by + archived_at)
```

**استعلام Audit — استعادة كامل تاريخ أي قرار بـ query واحد:**
```sql
SELECT wt.from_state, wt.to_state, wt.action,
       ss.full_name AS actor, wt.decision_notes,
       wt.created_at, wt.signature_hash
FROM workflow_instances wi
JOIN workflow_transitions wt ON wt.workflow_instance_id = wi.id
JOIN school_staff ss ON ss.id = wt.actor_id
WHERE wi.id = $workflow_id ORDER BY wt.created_at;
```

---

## 11. خارطة الطريق الموحدة

| المرحلة | المحتوى | الحالة |
|---------|---------|--------|
| 1-2 | Schema الكامل (Layers 1-4) + RLS + استيراد البيانات | ✅ مُنجز |
| 3-4 | Triggers الأساسية × 4 + اختبار end-to-end | ✅ مُنجز |
| 5-6 | Edge Functions: generate_qms_pdf + daily_maintenance | ✅ مُنجز |
| 7-10 | UI Integration: dashboard مخصص لكل role | ✅ مُنجز جزئياً |
| **sec** | **Security Hardening R00-R12:** ENUM rename + 12 RLS + SECURITY DEFINER + anon lockdown | ✅ مُنجز |
| 11-12 | QMS Automation: quality_goals + nonconformance auto-reports | 🔄 جارٍ |
| **+1-2** | **Layer 5 Foundation:** workflow_instances + approval_gates + seed 5 workflows | ✅ Schema مُطبَّق |
| **+3-4** | **HR State Machine:** biometric webhook + cron + hr_accountability_tickets UI | ✅ Schema مُطبَّق |
| **+5-6** | **Smart Wizards:** wizard_sessions + reason_codes_catalog + QF03-1 flow | ✅ Schema مُطبَّق |
| **+7-8** | **Meeting Module:** meeting_sessions + Realtime + digital sign-off | ✅ Schema مُطبَّق |
| **+9-10** | **Bulk Upload:** schema registry + validation Edge Function + approval | ✅ Schema مُطبَّق |
| **+11-12** | **Hardening:** مهاجرة staff_evaluations لـ workflow_instances + ISO mock audit | ✅ Schema مُنجز — FK موجود في M56 + `app/staff-evaluation/` + `app/workflows/page.tsx` مبنيَّتان + Chain of Custody query موثَّق في §10 |

### مصفوفة التبعيات

```
Layer 5 (مرحلة +1-2) ──→ شرط لكل ما يليه
         ↓
  HR State Machine    Smart Wizards    Meeting Module    Bulk Upload
  (مستقل عن v1)      (يلامس v1:       (مستقل)           (يكتب في
                      nonconformance,                     v1 tables)
                      staff_evals)
```

### معايير قبول المراحل الجديدة

| المرحلة | معيار النجاح |
|---------|-------------|
| +1-2 | workflow_instance يُكمل دورة CORRECTIVE_ACTION كاملة |
| +3-4 | تذكرة مساءلة تأخر → قرار مدير → PDF QF-A-3-3 في < 5 دقائق |
| +5-6 | wizard QF03-1 يُنتج PDF مع توقيع الطرفين |
| +7-8 | اجتماع 5 مشاركين → محضر موقَّع رقمياً من الجميع |
| +9-10 | ملف 5000 صف يُتحقَّق منه ويُدخَل دون أخطاء |
| +11-12 | query واحد يُعيد كامل تاريخ أي قرار |

---

## 12. الملاحق

### ملحق أ — مبادئ تصميم الـ UI

المستخدم لا يرى كلمة "نموذج". الـ UI يُقدّم **مهام تشغيلية**. النظام يُنتج نماذج الجودة في الخلفية.

```
❌ خاطئ:  [زر: فتح نموذج QF-70-j-4-1]
✅ صحيح:  [بطاقة: تسجيل حالة صحية] ← يُولّد QF-4-1/2/7 تلقائياً
```

**Pipeline PDF:**
```
UI Action → INSERT في Layer 2 → Trigger → generated_forms
  → Supabase Realtime → generate_qms_pdf → Storage → pdf_url
  → المستخدم يرى "تحميل النموذج" — بدون أي كتابة يدوية
```

---

### ملحق ب — Schema Registry للـ Bulk Upload

| upload_type | الحقول الإلزامية | القيود |
|---|---|---|
| `lrc_resources` | title, resource_type, quantity | resource_type ∈ {book, software, educational_material, device} |
| `lab_resources` | item_name, unit, quantity | condition ∈ {good, fair, damaged} |
| `students` | noor_id, full_name, grade | noor_id فريد |
| `activity_budget` | activity_name, allocated_amount | allocated_amount رقم |
| `staff_initial` | full_name, role_key, national_id | role_key من القائمة المعتمدة |
| `timetable` | classroom, teacher_email, subject, day, period | day ∈ 0-6، period رقم صحيح |

---

### ملحق ج — Migration Path

#### `meetings` (Legacy) → `meeting_sessions`

**السبب:** الجدول القديم استخدم `attendee_ids uuid[]` (array) ولم يكن لديه state machine أو audit trail أو دعم للتوقيع الرقمي.

**خطوات الترحيل (تُنفَّذ مرة واحدة قبل تشغيل Layer 6):**
1. نقل سجلات `meetings` إلى `meeting_sessions` مع تحويل `status` وتحويل `agenda (text)` إلى `agenda (jsonb)`
2. توسيع `attendee_ids[]` إلى صفوف فردية في `meeting_invitees`
3. تحديد `rsvp_status` و`attendance_status` بحسب `meetings.status` القديم
4. التحقق من التعادل العددي قبل `DROP TABLE meetings`

**ملاحظة:** البيانات التاريخية في `meetings.minutes` (text) لا تُرحَّل مباشرة — يُنشأ لها `meeting_live_notes` واحد بـ `note_type='decision'`.

---

*Sidra-ARR-v3.4 | رجب 1446هـ | يُلغي v1 وv2 — آخر تحديث: 2026-06-02. 79 migration (M01–M76 + R00–R12). Demo mode: محذوف بالكامل. Vitest: `npm test`. NOT NULL، بلا backfill، DROP CASCADE. Notifications: NotificationsMenu.tsx مربوط. Phase +11-12: مُنجز.*
