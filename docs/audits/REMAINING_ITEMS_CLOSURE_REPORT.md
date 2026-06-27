# تقرير إغلاق البنود المتبقية — Sidra / School OS

**التاريخ:** 2026-06-27 · **الحالة:** PRE-LAUNCH (لا مستخدمون · لا بيانات إنتاجية) · **العلامة المرئية:** «سِدرة»

---

## Sprint 1 — إصلاحات الكتابة الحرجة وقت التشغيل (2026-06-28)

> إصلاح أعطال الكتابة التي تفشل/تفشل صامتاً/تدّعي نجاحاً. **app-code فقط** عدا **migration واحد غير مُطبَّق** (تشخيصي). النتائج: lint صفر · build 63/63 · tsc نظيف · **test 26/26**. **بلا** تغيير على DB الحيّة/RLS/auth/persona/مفاتيح الأدوار/تبعيات/`.env`.

- **enum أحداث الفصل:** enum `public.event_type` يقبل 7 قيم فقط؛ كانت الواجهة تُدرج `غائب`/`متأخر`/`نجم الحصة`/`وسام:`/`دورة مياه` (يرفضها Postgres) **ويُخفي الفشل كـ«حفظ محلي»**. الحل: مصدر حقيقة واحد + `mapToDbEventType` خادمي (`غائب→غياب`·`متأخر→تأخر`·المخالفات→`مخالفة` مع حفظ الأصل في note/metadata·عيادة→`زيارة عيادة`)؛ الأنواع غير القابلة للتمثيل (مكافآت/نجوم/أوسمة/دورة مياه) **تُرفض بصدق** لا تُدرَج. الـoffline يقتصر على فشل الشبكة الحقيقي (`catch`)؛ رفض الخادم يُظهر خطأً صريحاً. `saveStars`/`awardBadge` مُعطَّلان بصدق. migration مقترح غير مُطبَّق: `db/migrations/20260628_classroom_event_types_expansion.sql`.
- **حضور شؤون الطلاب:** `markAttendanceAction` كان يُغفل `term_id` (NOT NULL) فيفشل دائماً. الحل: حلّ `term_id`/`academic_year_id`/`recorded_by_*` خادمياً + `onConflict:'student_id,attendance_date,school_id'` (القيد الفعلي) + رسالة آمنة + لا نشر metadata غير معروفة.
- **حفظ المقاعد/الأدوار:** `classroom_metadata.class_id` فريد؛ الـupsert كان بلا `onConflict` ويمرّر `undefined`→NULL. الحل: رفض `!classId` + `onConflict:'class_id'`؛ وتعطيل سحب `SeatingChart` الوهمي (لم يكن يحفظ) مع توضيح مرئي.
- **استيراد المنصّة:** صفحتا staff/onboarding كانتا تُظهران `alert('محاكاة')` وتُسجّلان PII بـ`console.log` بلا حفظ. الحل: إزالتهما + إشعار صادق «هذه العملية غير مفعّلة بعد — استخدم /platform/setup».
- **إعادة تعيين الفصول:** إجراء مدمّر بنقرة واحدة بلا تأكيد/نتيجة. الحل: `ResetClassesButton` بعبارة تأكيد مكتوبة + إظهار النتيجة + منطقة خطر معزولة + إزالة `JSON.stringify(validationErrors)` الخام.
- **متبقٍّ (Sprint 2+):** تنظيف `error.message` الخام في الإجراءات غير المعنيّة بهذا السبرنت (referrals/assets/contracts وغيرها — بند التدقيق Low)؛ تفعيل enum المكافآت/الخروج عبر migration معتمد؛ ربط الفصل (class_id) في تدفّق `useClassroom` لتفعيل حفظ المقاعد/الأدوار والخروج الكامل (`classroom_exits`).

---

> هذا السبرنت يُغلق البنود المفتوحة التي أكّدها التدقيق العابر للوثائق (مقابل الكود الحيّ وقاعدة البيانات الحيّة). جميع التعديلات **app-code فقط**؛ **بلا** تغيير DB/RLS/migrations/Edge Functions/auth/persona/مفاتيح الأدوار/التبعيات/`.env`. النتائج: `npm run lint` صفر · `npm run build` **63/63** · `npx tsc --noEmit` نظيف · `npm test` **25/25**.

---

## 1) ما تم إصلاحه (app-code)

### أ. علاقات الطالب المكسورة في QA/الموجه الطلابي (embeds `students(name)`)
علاقة `students` محذوفة؛ الـ FK تشير إلى `student_profiles`. صُحِّحت ثلاثة embeds إلى `student_profiles(...)` مع تحديث الأنواع والوصول ومعالجة null:
- `app/qa/_hooks/useQA.ts` (`student_risk_flags` + `interventions`).
- `app/student-affairs/_components/quality/FormC53_CounselorReferral.tsx` (`attendance_scans`).
- إصلاح null-safety إضافي: `app/student-affairs/_components/AttendanceBoard.tsx` (`(s.student_id ?? "").includes(...)`).
- **بلا جدول/علاقة `students` جديدة · بلا migration.** `student_profiles.id` = هدف الـ FK · `national_id` = معرّف العرض.

### ب. نقل كتابات الموجه الطلابي الحسّاسة إلى Server Actions
أُنشئ `app/counselor/_actions.ts`: كل كتابة (`cases` · `parent_reports` · `case_actions` · `counseling_sessions`) تمرّ خادمياً عبر `createSupabaseServerClient()` + `getActivePersona()`. `school_id` والدور وهوية الفاعل تُشتق **server-side** (حارس `student_counselor` fail-closed). الـ hook `useCounselor.ts` صار حالة UI + استدعاءات فقط، وحُذف فرع `.from('students')` الميت. رسائل عربية آمنة للمستخدم؛ التفاصيل التقنية في سجلّ الخادم فقط.
- **عيوب كامنة اكتُشفت وأُصلحت ضمناً:** الجداول الأربعة عليها `school_id NOT NULL` ولم تكن الكتابات السابقة تضبطه (كانت ستفشل على بيانات حقيقية)؛ `case_actions` لا يحوي `actor_name/actor_role` (يحوي `actor_id`)؛ قيمة `category="بلاغ ولي أمر"` لم تكن ضمن enum `case_category` — تُحوَّل الآن إلى قيمة صالحة (`أخرى`) دون اختلاق.

### ج. مولّدات payload للذكاء (الثلاثة الناقصة)
نُفِّذت مولّدات **حقيقية** في `lib/services/ai-service.ts` بدل `buildEmptyPayload`:
- `class_report` ← `class_weekly_summary` + عدد طلاب الفصل.
- `behavior_pattern` ← `behavioral_referrals` + `student_risk_flags` + الحالات السلوكية المفتوحة.
- `quality_summary` ← `quality_indicators` + `quality_evidence` + متوسط `qa_observations` + حالات عدم المطابقة المفتوحة.
- **لا محتوى ذكاء وهمي:** القيم غير المتوفرة = `null` → تُعرض «غير متوفر» (صدق البيانات).
- **رسالة المستخدم الآمنة:** كل تعذّر للذكاء (مفتاح غير مضبوط · لا قالب · فشل المزوّد · فشل الحفظ) يُعيد للمستخدم **«الرؤى الذكية غير مفعّلة حاليًا.»** فقط؛ التفاصيل (اسم المزوّد/المفتاح/حالة الـAPI) في `console.error` الخادمي فقط. أُزيل عرض `model_version` من بطاقة الذكاء (كان يكشف اسم المزوّد).

### د. سلسلة LRC: الحجز → الزيارة → الحضور
`app/lrc/_actions.ts`:
- `startClassVisitAction`: الحضور يُعبَّأ من **سجلّ الحضور اليومي الحقيقي** (`student_daily_attendance`) بدل افتراض حضور الجميع — الغائب/المأذون يُستبعد (`is_present=false`, `is_excluded=true`, سبب صادق)، والمتأخر يُعدّ حاضراً. **fallback صريح:** لا سجلّ حضور لذلك اليوم → حضور الجميع (لا بيانات لاستبعاد أحد).
- `updateLrcBookingStatusAction`: عند الاعتماد يُسجَّل `approved_at` (إثبات حدوث الموافقة).

### هـ. كلمة المرور المؤقتة في بطاقات الدخول
`components/operations/setup/ExecutionEngine.tsx`: أُزيلت `ChangeMe123!` المُثبَّتة؛ استُبدلت بعبارة مُقنّعة «تُصدر من منسق المدرسة / تُضبط عبر رابط إعادة التعيين عند أول دخول» — **بلا كلمة مرور مُثبَّتة بديلة، بلا سرّ مطبوع.**

### و. تصحيح المصطلح العربي: «الموجه الطلابي»
استُبدل **«المرشد الطلابي» → «الموجه الطلابي»** في كل الواجهات/التقارير/التعليقات البشرية المتأثرة (`QualityFormWrapper` · `StudentAffairsReports` PDF · `CounselorWorkbench` · `lib/routes.ts`). **مفتاح الدور الرسمي `student_counselor` والمسارات `/counselor`/`app/counselor`/`useCounselor`/`CounselorWorkbench` بلا تغيير** (تصحيح تسمية عربية فقط).

---

## 2) ما يبقى محجوباً على المالك (إجراء تشغيلي — ليس عيب كود)

الكود **fail-closed وآمن** في هذه البنود؛ المتبقّي هو إعداد/نشر يحتاج اعتماد/أسرار المالك:

| البند | الحالة الحيّة | الإجراء المطلوب من المالك |
|------|----------------|--------------------------|
| `CRON_SECRET` + `cron_site_url` | `app_private.secrets` = `REPLACE_BEFORE_LAUNCH` (placeholder) — مهام pg_cron تعمل لكن `cron_trigger_*` تفشل-مغلقة (no-op آمن) | ضبط سرّ قوي في `CRON_SECRET` (Vercel) + `UPDATE app_private.secrets` للقيمتين بالـ URL الحقيقي. راجع `docs/security/CRON_SECRET_RUNTIME_SETUP.md` |
| `ANTHROPIC_API_KEY` | غير مضبوط → الذكاء يعرض «الرؤى الذكية غير مفعّلة حاليًا.» | ضبطه في `.env.local`/بيئة Vercel (واختيارياً `AI_MODEL`) |
| نشر Edge Functions | `list_edge_functions` = `[]` (المصدر محلي فقط: `validate-bulk-upload` · `generate-qms-pdf` · `daily-maintenance` · `daily-feed`) | نشر `generate-qms-pdf` (لازمة لتدفّق QMS PDF) و`validate-bulk-upload` عند استخدام الرفع المجمّع. سلسلة الـ cron تنادي `/api/cron/*` في Next.js ولا تعتمد على Edge Functions |

> **لم تُنشَر Edge Functions في هذا السبرنت** (تتطلب اعتماد نشر) ولم تُلمَس الأسرار.

---

## 3) ما يبقى متعمَّداً `implemented:false` (بانتظار اعتماد المالك)

**لم تُختلق أي أكواد QF.** القوالب التالية تبقى `implemented:false`/`planned` حتى يعتمد مالك المنتج الأكواد الرسمية:
- `lib/quality/quality-forms.ts` → `LRC_QUALITY_FORMS`: 8 قوالب (`planned`) — فقط `excellence_certificate` متاح.
- `lib/quality/tenant-templates.ts` → `AL_FALAH_PLANNED`: قوالب principal/school_admin/academic/lab_technician (`implemented:false`).
- **قوالب الذكاء (`ai_prompt_templates`):** لا قوالب نشطة لـ `class_report`/`behavior_pattern`/`quality_summary` في DB الحيّة، لذا مولّداتها الجديدة **جاهزة** لكنها لا تُستدعى حتى يُزرع قالب (بذرة DB = إجراء مالك). عند توفّر القوالب: تُحدَّث الإدخالات بأكواد QF حقيقية ويُبنى المولّد/البذرة.

> **القيد:** أكواد/قوالب الجودة تُعرَّف في `lib/quality/tenant-templates.ts` والملكية في `lib/quality/quality-forms.ts` — fail-closed لأي مدرسة غير مُسجَّلة.

---

## 4) محجوب على قاعدة البيانات (خارج النطاق — لم يُلمَس DB)

**LRC → دليل جودة (`quality_evidence`):** غير مُنفَّذ لأن:
1. قيد `quality_evidence.source_module` CHECK يسمح بـ `'attendance'` فقط (LRC غير مغطّى) — توسيعه = migration.
2. لا يوجد `quality_indicator` مزروع لـ LRC، و`createQualityEvidence` **fail-closed** (يتطلب مؤشراً مزروعاً + سنة نشطة).
3. زرع مؤشر LRC يتطلب **كود QF رسمي** (ممنوع اختلاقه).

لذا **لم يُنشأ أي دليل جودة وهمي من LRC.** يُنفَّذ لاحقاً ضمن migration مُصرَّح به + اعتماد كود QF (Phase 3F/خارج هذا السبرنت).

---

## 5) تأكيدات الصدق والسلامة

- **لا fake AI** — مولّدات حقيقية + `null`→«غير متوفر»؛ رسالة آمنة موحّدة عند التعذّر.
- **لا fake PDF** — لم تُنشأ روابط PDF عامة (`getPublicUrl`)؛ بطاقات الدخول بلا سرّ مطبوع.
- **لا fake evidence** — لا دليل جودة من أحداث وهمية؛ حضور LRC من سجلّ حقيقي مع fallback صريح.
- **لا fake QF codes** — القوالب غير المعتمدة تبقى `implemented:false`.
- **لا إخفاء صامت للأخطاء** — كل خطأ يُسجَّل خادمياً (`console.error`)، والمستخدم يرى رسالة عربية آمنة.
- **بلا لمس:** DB/RLS/migrations/Edge Functions/auth/persona/مفاتيح الأدوار/التبعيات/`.env.local`.

---

## 6) المطابقات المتبقية في البحث المستهدف (كلها مقبولة)

- `lib/services/ai-service.ts` → `process.env.ANTHROPIC_API_KEY` + `console.error('... ANTHROPIC_API_KEY ...')` + تعليق `// Claude API`: **خادمية فقط، لا تظهر للمستخدم** (القراءة من البيئة + سجلّ تشخيصي + تعليق مطوّر).
- `app/layout.tsx` تعليق يذكر «Antigravity أُزيلت سابقاً»: تعليق تاريخي يوثّق الإزالة، لا مكوّن حيّ.
- `docs/`: إشارات تاريخية لـ «Sidra OS/School OS» في خطط/تدقيقات سابقة = اسم المستودع الداخلي/سجل تاريخي، ليست واجهة منتَج.

---

## 7) أهم الخطوات التالية

1. **ضبط الأسرار التشغيلية** (`CRON_SECRET` + `cron_site_url` + `ANTHROPIC_API_KEY`) قبل الإطلاق.
2. **نشر Edge Functions** (`generate-qms-pdf` أولاً) ومصالحة `list_edge_functions`.
3. **اعتماد أكواد QF الرسمية** للقوالب `implemented:false` ثم بناء مولّداتها + بذور `ai_prompt_templates` للسياقات الثلاثة.
4. **migration مُصرَّح به** لتوسيع `source_module` CHECK + زرع مؤشر LRC → تفعيل دليل الجودة من زيارات LRC.
5. **مصالحة تتبّع الترحيلات** (baseline `db pull` ثم repair محدَّد) — **بلا** `db reset/push` على الحيّة.

---

# ملحق: Sprint 2 — إصلاحات أمن/تشغيل High + استكمال تشغيل الفصل (2026-06-29)

**الحالة:** نجح. app-code + **3 migrations مُطبَّقة على DB الحية** + 1 سجلّ-قرار غير مُطبَّق. `lint` صفر · `build` 63/63 · `tsc` نظيف · `test` 26/26 · `git diff --check` نظيف.

## ما أُغلق (أمنياً)
1. **RPCs اقتصاد الطالب القديمة:** أُسقطت `rpc_purchase_furniture(uuid)` + `rpc_scan_ar_glyph(text)` (غير مستخدمتين + معطوبتان: تكتبان `student_id=auth.uid()` بينما الـFK يشير إلى `student_profiles.id` بلا ربط). migration: `20260629_drop_legacy_economy_rpc_overloads` (مُطبَّق).
2. **ربط ملكية RPCs الاقتصاد:** «الربط بـ`auth.uid()`» غير ممكن بنيوياً (لا عمود ربط في `student_profiles`) وغير صحيح دلالياً (الاقتصاد مُشغَّل من الطاقم لا الطالب). الحلّ الصحيح: **بوّابة دور المشغّل داخل** الأربع دوال SECURITY DEFINER (scan/purchase/process_transaction/complete_quest) + فحص نطاق المدرسة القائم → يُمنع student/parent/secretary/health/lab… من استدعائها، ويُحجب التعديل عبر-المستأجر. migration: `20260629_gate_economy_rpcs_to_operators` (مُطبَّق ومُتحقَّق: 4/4 تحمل البوّابة، 0 توقيع أُحادي متبقٍّ).
3. **كتابة PII من المتصفّح:** حُذف `components/parent/HealthSocialModal.tsx` (يتيم، صفر استيراد، كان يكتب `health_data/social_data` من العميل). الأشقّاء الثلاثة لا يكتبون DB.
4. **أوراكل بريد عابر للمستأجر:** `validateImportData` → `requiresSchoolContext:true` + حصر الوجود على مدرسة المُستدعي (`user_personas`)؛ `system_owner` فقط عالمي.
5. **webhook البصمة:** مقارنة سرّ ثابتة الزمن + جدول `biometric_devices` (RLS) + تحقّق device→school (fail-closed 403). migration: `20260629_biometric_device_registry` (مُطبَّق).

## ما أُغلق (Runtime)
6. **رسائل أخطاء آمنة:** `lib/safe-error.ts::toSafeError` مُطبَّق على activity/health/classroom/student-affairs/secretary/lrc/science/qa — لا `error.message` خام.
7. **حُرّاس الكتابة:** `if(!persona?.schoolId)` موحّد + تحقّق ملكية `student_id` في activity/health/student-affairs.
8. **classId حقيقي:** مسار `/classroom/[classId]` (Server Component يحلّ الفصل: UUID + RLS مدرسة + تكليف معلّم → `notFound`). `useClassroom(classId)` يربط الطلاب/الأحداث/المقاعد/الأدوار/الخروج بالفصل الحقيقي. حُذف `[grade]/[section]` المعطوب.
9. **بقايا Sprint 1:**
   - **`useClassroom` + `class_id`:** حُلَّ — classId حقيقي يُمرَّر؛ المقاعد/الأدوار تُحفظ فعلاً (تحقّق `class_id` ضمن المدرسة).
   - **النجوم/الأوسمة:** تبقى **محجوبة بصدق** (مسارها gamification مستقبلاً — لا enum مُختلَق).
   - **خروج دورة المياه:** **حُلَّ ويُحفظ صحيحاً** عبر `classroom_exits` (`exit_type` نصّي + تتبّع العودة) — أزرار `EventButtons` تُوجَّه لـ`startExit`/`endExit`. **لا توسعة enum.**
   - **النقاط اليومية:** `dailyScores` يقرأ `metadata.app_type` (لا `e.type` المُجمَّع) — متّسقة مع التخزين النهائي.

## migrations
- مُطبَّقة حياً (3): `20260629_drop_legacy_economy_rpc_overloads` · `20260629_gate_economy_rpcs_to_operators` · `20260629_biometric_device_registry`.
- سجلّ-قرار غير مُطبَّق (1): `20260628_classroom_event_types_expansion.sql` (توسعة enum **مرفوضة** — `classroom_exits` أنظف للخروج؛ المكافآت → gamification).

## مخاطر متبقية
- `alert()`/`error.message` خام في مكوّنات خارج النطاق (`coordinator/TimetableEditor` · `principal/SentinelDashboard` · `(auth)/join`).
- الأحداث الإيجابية الصفّية (شارك اليوم…) بلا مسار تخزين → محجوبة بصدق (UNSUPPORTED_EVENT) حتى طبقة gamification.
- نشر/تسجيل `biometric_devices` + ضبط `BIOMETRIC_WEBHOOK_SECRET` = إجراء مالك (حتى ذلك الحين الـwebhook fail-closed لكل الأجهزة).
- `rpc_process_transaction`/`rpc_complete_quest` ما زالتا تكتبان `student_wallet`/`transaction_logs` مباشرةً داخل الجسم (SECURITY DEFINER) بدل التوحيد عبر مسار واحد — مقبول معمارياً، توحيد مستقبلي اختياري.
