# ملخّص الانتقال للمحادثة الجديدة (Conversation Handoff) — Sidra / School OS

**التاريخ:** 2026-06-27 · **آخر commit:** `cd6c6f4` · **الفرع:** `main` · **الحالة:** PRE-LAUNCH
**الغرض:** تمكين متابعة العمل بأمان في محادثة جديدة دون فقدان السياق. **توثيق فقط — لا كود/DB.**

> الحالات في هذا المستند: **مكتمل** ✅ · **جزئي** ◐ · **محجوب** ⛔ · **مقترح** ▶. كل ادّعاء «مُطبَّق» مُتحقَّق من الكود/الترحيلات/git/سجلّات السبرنت أو فحص DB حيّ.

---

## 1) حالة المشروع الحالية
- **العلامة المرئية للمستخدم:** «سِدرة» دائماً. **ممنوع في الواجهة:** `School OS` · `Sidra OS` · `Smart School OS` · `Antigravity` · `سِدرة OS` («Sidra OS» اسم المستودع الداخلي فقط).
- **التقنيات:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Auth + PostgreSQL + RLS).
- **PRE-LAUNCH:** لا مستخدمون حقيقيون · لا بيانات إنتاجية. DB حيّة وقت الكتابة: **1 مدرسة · 0 فصول · 0 طلاب · 0 تكليفات · 0 وحدات/دروس منهج**.
- **متعدّد المستأجرين:** عزل صارم عبر `school_id NOT NULL` + RLS على كل جدول نشط؛ نطاق المدرسة من JWT عبر `get_my_school_id()` (يقرأ `app_metadata.school_id` من توكن المُستدعي).
- **التحقّق المعتمد لكل تغيير مهم:** `npm run lint` (صفر) · `npm run build` (**63/63**) · `npx tsc --noEmit` (نظيف) · `npm test` (**26/26**) · security advisors (**0 ERROR**).

## 2) مصطلح الأدوار الرسمي
- **«الموجه الطلابي»** هو المصطلح المعتمد في الواجهات/التقارير/التعليقات البشرية. **ممنوع «المرشد الطلابي»** في أي سطح مرئي (مُتحقَّق: صفر في `app/components/lib`).
- **مفتاح الدور الرسمي بلا تغيير:** `student_counselor` (في `lib/auth/roles.ts`) · المسارات `/counselor` · `app/counselor` · `useCounselor` · `CounselorWorkbench` — تسمية عربية فقط، لا تغيير مفاتيح.
- مفاتيح الأدوار الرسمية الـ16 ثابتة؛ **ممنوع** تغييرها.

## 3) ما أُنجِز عبر السبرنتات الأخيرة
| العنصر | الحالة | المرجع |
|---|---|---|
| توحيد أصداف اللوحات (UI Unification S1) — 8 لوحات كاملة | ✅ | `components/dashboard/` · `lib/dashboard/role-dashboard.ts` |
| ترحيل صدفة LRC إلى `RoleDashboardShell` | ✅ | `app/lrc/_components/LrcWorkspace.tsx` |
| مواءمة لوحة شؤون الطلاب مع المكوّنات الموحّدة | ◐ | `app/student-affairs/*` (تستخدم `components/dashboard`) |
| إصلاحات تشغيل شؤون الطلاب + رسائل آمنة | ✅ | `app/student-affairs/_hooks/useStudentAffairs.ts` |
| رسالة الذكاء الآمنة الموحّدة | ✅ | `AI_UNAVAILABLE='الرؤى الذكية غير مفعّلة حاليًا.'` في `lib/services/ai-service.ts` |
| استخدام `student_profiles(...)` بدل `students(...)` في كل embed | ✅ | صفر `.from('students')`/`students(name` في الكود |
| إزالة كتابة PII من المتصفّح | ✅ | حُذف `components/parent/HealthSocialModal.tsx` |
| تصحيح مسار الفصل إلى `/classroom/[classId]` الحقيقي | ✅ | `app/classroom/[classId]/page.tsx` (يحرس UUID + الفصل-في-المدرسة + تكليف المعلّم) |
| إصلاح enum أحداث الفصل (`events.type` 7 قيم) | ✅ | `mapToDbEventType` في `lib/types/classroom.ts` |
| خروج/عودة الطالب عبر `classroom_exits` | ✅ | `start/endClassExitAction` في `app/classroom/_actions.ts` |
| مكافآت الفصل عبر `classroom_rewards` | ✅ | `awardClassroomRewardsAction` (نجوم/نقاط/أوسمة) |
| سطح حفظ مخطّط المقاعد | ✅ | `saveSeatingMapAction` → `classroom_metadata.seating_map` |
| سطح حفظ أدوار الطلاب | ✅ | `saveStudentRolesAction` → `classroom_metadata.student_roles` |
| سجلّ مكافآت/أوسمة الطالب (قراءة فقط) | ✅ | `getStudentRewardsHistoryAction` + `StudentRewardsHistory.tsx` |
| رسائل أخطاء آمنة على مستوى المنصّة (`toSafeError`) | ✅ | خدمات + hooks + `_actions` (راجع §7 للمتبقّي) |
| ميزة تقدّم/توزيع المنهج للمعلّم | ✅ | §6 |
| تصحيح المنهج من admin-authored إلى **teacher-authored** «توزيع المنهج» | ✅ | Sprint 8 (§4 · §5) |

## 4) حالة قاعدة البيانات والترحيلات (مُتحقَّقة حياً 2026-06-27)
- **99 ملف ترحيل محلي** · **15 إدخالاً متتبَّعاً** في `supabase_migrations.schema_migrations` · **118 جدول** كلها RLS · **314 سياسة** · **0 كائن مطلوب مفقود**.
- الترحيلات الأبرز حديثاً:
  - `20260629_drop_legacy_economy_rpc_overloads` + `20260629_gate_economy_rpcs_to_operators` — بوّابة دور المشغّل داخل RPCs الاقتصاد (الطلاب roster بلا `auth.uid()`؛ الاقتصاد مُشغَّل من الطاقم).
  - `20260629_biometric_device_registry` — `biometric_devices` + RLS (webhook بصمة fail-closed).
  - `20260630_classroom_rewards` — مكافآت الفصل (star/positive_point/badge).
  - `20260701_curriculum_progress` (Sprint 7) — أنشأ جداول المنهج بنموذج **خاطئ** (عالمي/admin-authored) — **صُحِّح في Sprint 8**.
  - `20260702_curriculum_distribution_correction` (Sprint 8) — **النموذج المعتمد الحالي** (teacher-authored، §5).
- **انحراف تتبّع الترحيلات (bookkeeping):** عدد الملفات المحلية (99) أكبر من المتتبَّع حياً (15) لأن الترحيلات التاريخية طُبِّقت بـSQL مباشر، والأحدث (S2/S3/S7/S8) عبر `apply_migration` الذي يسجّلها. المخطط مُجسَّد بالكامل. **المصالحة:** baseline (`supabase db pull`) ثم repair محدَّد — **ممنوع** `supabase db reset`/`db push` على الحيّة.

## 5) قرارات الأمن وRLS
- **عزل المستأجر:** `school_id = get_my_school_id()` على كل صف؛ `get_my_school_id()` تقرأ مدرسة توكن المُستدعي → **لا وصول عبر-المدارس**.
- **لا `USING(true)`** على أي جدول مستأجر (مُتحقَّق للمنهج: `any_permissive_true = null`).
- **توزيع المنهج (Sprint 8):**
  - **التأليف (INSERT/UPDATE/DELETE على `curriculum_units`/`curriculum_lessons`):** المعلّم المُسنَد فقط، عبر دالتين SECURITY DEFINER (search_path=public · EXECUTE لـ authenticated): `is_assigned_subject_teacher(class_id, subject_id)` · `is_unit_owner_teacher(unit_id)`.
  - **لا سياسة كتابة للإدارة** (`admin_write_policies = null` حياً) — **الإدارة متابعة فقط** (SELECT): `school_admin`/`school_principal`/`academic_vp`.
  - `system_owner`: قراءة فقط (لا تأليف).
  - تحقّق عدائي حيّ: الدالتان تُعيدان `false` لغير المُسنَد/المالك (fail-closed).
- **الاقتصاد الطلابي:** كل كتابة لـ `transaction_logs`/`student_wallet` حصراً عبر `rpc_process_transaction` (append-only؛ المنح المباشرة مسحوبة). RPCs الاقتصاد ببوّابة دور مشغّل داخل الجسم.
- **سرّية:** QMS PDF عبر bucket خاص + signed URLs؛ cron + `generate-qms-pdf` **fail-closed** عند غياب `CRON_SECRET`.

## 6) حالة الفصل الحالية (`/classroom/[classId]`)
- **`classId` حقيقي** = `classes.id` (UUID)؛ الصفحة Server Component تحرس: UUID صالح + الفصل ضمن مدرسة المُستدعي (RLS) + المعلّم مُسنَد (`teacher_assignments`) → `notFound()` فشل-مغلق.
- **حفظ المقاعد:** زر «حفظ المقاعد» (تبديل حقيقي بلا drag library) → `classroom_metadata.seating_map`.
- **حفظ الأدوار:** رقائق أدوار → `classroom_metadata.student_roles`.
- **المكافآت/الأوسمة:** `classroom_rewards` (نجوم/نقاط إيجابية/أوسمة)؛ النقاط اليومية: إيجابي من `classroom_rewards` + سلبي من مخالفات `events` (`metadata.app_type`).
- **سجلّ مكافآت الطالب:** قراءة فقط من `classroom_rewards` (حالة فارغة صادقة).
- **توزيع المنهج:** يؤلّفه **المعلّم المُسنَد** (وحدات/دروس/تاريخ مخطّط/حالة/ملاحظات) لكل مادة في الفصل.
- **معادلة التقدّم (حقيقية فقط):** `completed_lessons / total_active_lessons * 100`؛ `total=0` → 0% + حالة فارغة «لم يضف المعلم توزيع المنهج لهذا الفصل بعد.» **لا نسبة وهمية.**

## 7) ما بقي مفتوحاً
- **◐ واجهة متابعة الإدارة** للمنهج/التقدّم (RLS تسمح بقراءة admin/principal/academic_vp، لكن لا سطح UI بعد).
- **◐ إعادة ترتيب الوحدات/الدروس يدوياً** (`sort_order` يُضبط تلقائياً عند الإضافة فقط).
- **◐ ربط `academic_year_id`/`term_id`** بتوزيع المنهج عند الحاجة (غير مُضمَّن حالياً).
- **⛔ التحقّق الحيّ بالمتصفّح** لمسارات الفصل/المنهج محجوب — DB الحية 0 فصول/طلاب/تكليفات، لا آلية seed/demo معتمدة (إنشاء بيانات في المدرسة الحيّة = بيانات إنتاجية وهمية ممنوعة). القوائم: `docs/audits/CLASSROOM_LIVE_VERIFICATION_CHECKLIST.md` + `CURRICULUM_PROGRESS_FEATURE_AUDIT.md` (Phase 6).
- **⛔ إجراءات مالك تشغيلية (لا عيب كود):** `CRON_SECRET` · `cron_site_url` · `ANTHROPIC_API_KEY` · نشر Edge Functions (`list_edge_functions=[]`).
- **◐ كنس الأخطاء الخام:** أُغلق في الخدمات/الإجراءات المُسمّاة عبر S5/S6. أي سطح جديد يجب أن يستخدم `toSafeError` (لا `error.message`/`serverError` خام للمستخدم).
- **◐ تحليلات المدير القديمة** (`app/principal/analytics/teachers/*`) فيها placeholders ميتة غير مرئية (عالقة على spinner) — تُنظَّف/تُربَط عند بناء واجهة المتابعة.

## 8) السبرنت المقترح التالي — Sprint 9 (مقترح ▶، لم يبدأ)
**Sprint 9 — Admin Curriculum Monitoring + Distribution Enhancements:**
1. **سطح متابعة قراءة-فقط** للإدارة (`school_admin`/`school_principal`/`academic_vp`) لعرض توزيع/تقدّم المنهج عبر فصول المدرسة (RLS للقراءة جاهزة؛ يلزم UI + إجراء قراءة tenant-scoped).
2. **إعادة ترتيب الوحدات/الدروس يدوياً** (تحديث `sort_order` عبر إجراء للمعلّم المُسنَد).
3. **ربط `academic_year_id`/`term_id`** بالتوزيع إن لزم (migration إضافي صغير).
4. **خطة بيانات demo/test** معتمدة (مادة + فصل + تكليف + وحدات + دروس) — موسومة demo/test، خارج مدرسة الإنتاج.
5. **تنفيذ قائمة التحقّق الحيّ بالمتصفّح** لمسار التأليف والحالة بعد توفّر البيانات.
> **قاعدة إلزامية للجلسة القادمة:** الإدارة **لا تؤلّف** المنهج — تُسند وتتابع فقط؛ المعلّم المُسنَد **يؤلّف** التوزيع. لا نِسب تقدّم وهمية، لا مكافآت وهمية. شغّل `npm run build` بعد أي تغيير مهم.
