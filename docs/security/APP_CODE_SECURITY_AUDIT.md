# تدقيق أمن كود التطبيق — Application Code Security Audit (Phase 3E-5)

> **النوع:** تدقيق أمني قراءة-فقط (Part B · Agent 1).
> **التاريخ:** 2026-06-13 · **HEAD:** `8c1e39a` · **المشروع:** SIDRA OS (PRE-LAUNCH، مستأجر واحد: الفلاح).
> **النطاق:** `app/` · `components/` · `lib/` · `hooks/` · `proxy.ts` · `supabase/functions/` · `db/` (مرجعياً) · ملفات الإعداد. **مُستثنى:** `node_modules/` · `.next/` · build/cache/artifacts.
> **الحالة:** لم يُعدَّل أي كود. قراءة فقط.

---

## 0) تحديث الحالة — Security Hardening Sprint (2026-06-13) ✅

> أُصلحت بنود هذا التقرير من الجذر بعد التدقيق. (هذا التقرير الآن **تاريخي + حالة الإصلاح**.)

| البند | كان | الحالة |
| --- | --- | --- |
| `generateInvite` عزل مستأجر (High) | غير مُصلَح | ✅ **مُصلَح** — `targetSchoolId` يُشتقّ من `ctx.user` (غير system_owner مُثبَّت على مدرسته) + حارس `createSafeAction` المركزي صار يكشف `school_id` (snake_case) أيضاً. |
| `generate-qms-pdf` fail-open (High) | غير مُصلَح | ✅ **مُصلَح** — fail-closed: 503 إن غاب `CRON_SECRET`، 401 إن لم يطابق. |
| QMS PDF رابط عام (High) | غير مُصلَح | ✅ **مُصلَح** — `getPublicUrl` أُزيل · bucket خاص · `pdf_url=null` · signed URL server-side عند الطلب (`lib/quality/qms-pdf.ts`). |
| موافقة الرحلة عبر anon (Medium) | غير مُصلَح | ✅ **مُصلَح** — server actions مُقيَّدة بالتوكن (`_actions.ts`) + مسار عام مُتحكَّم في `proxy.ts` + حقول دنيا. |
| proxy logs + CSP (Low) | غير مُصلَح | ✅ logs محصورة بـ dev. CSP الكامل (nonce) يبقى عملاً منفصلاً (يتطلّب تكامل nonce في Next). |
| `validate-bulk-upload` ربط مدرسة (Low) | غير مُصلَح | ⏳ دفاع متعمّق مؤجَّل (خطر منخفض — تحقّق فقط، مُستدعى خادمياً من route يفرض الدور). |

---

## 1) الحُكم العام

البنية الأمنية لكود التطبيق **قوية ومتّسقة** مع معمارية المشروع المُعلنة:
- **نواة المصادقة سليمة:** `getActivePersona()` ([lib/auth/context-service.ts](../../lib/auth/context-service.ts)) يشتقّ السلطة حصراً من `app_metadata`، fail-closed عند عدم تطابق `school_id`، ويسمح بالـ masquerade لـ `system_owner` الحقيقي فقط عبر cookie موقّع HMAC مُتحقَّق من `user_personas`.
- **`createSafeAction`** ([lib/safe-action.ts](../../lib/safe-action.ts)) يطبّق Zod + فحوص PBAC/الدور + فرض المستأجر + rate limiting + idempotency + سجل تدقيق.
- **`supabaseAdmin`/service_role مركزي ولا يُشحَن للعميل** (متصفّح = anon key)؛ والإجراءات المستخدِمة له تُعيد اشتقاق `school_id` من السياق وتضيف `.eq('school_id', …)`.
- **Cron** محميّ بـ `CRON_SECRET` (fail-closed) · webhook البصمة محميّ بسرّ مشترك · حُرّاس layout fail-closed بتحقّق UUID. `next.config.mjs` يثبّت `ignoreBuildErrors:false` + رؤوس أمان أساسية. **لا أسرار مُثبَّتة · لا scripts خطيرة.**

> **لا ثغرة Critical.** أهمّ بند **High**: تجاوز عزل مستأجر في `generateInvite` (مُخفَّف حالياً: PRE-LAUNCH مستأجر واحد + بلا مُستدعٍ UI). كل البنود أدناه **سابقة لـ 3E-2** (كائنات الجودة في 3E-2 نظيفة).

---

## 2) النتائج

### 🔴 High — تجاوز عزل المستأجر في `generateInvite`
- **الموقع:** [app/_actions/invite.ts:88](../../app/_actions/invite.ts) (حقل schema `school_id`) + المعالج 146/163/195؛ الحارس [lib/safe-action.ts:225-228](../../lib/safe-action.ts) يفحص `schoolId` (camelCase) فقط.
- **السبب الجذري:** حارس حقن المستأجر في `createSafeAction` يفحص `inputObj.schoolId`؛ لكن schema الإجراء يسمّي الحقل `school_id` (snake_case) ويستخدم `input.school_id` مباشرةً (target_school_id) بدل `ctx.user.schoolId` → لا يُتحقَّق منه أبداً. باقي الإجراءات تستخدم `schoolId` (camelCase) ومحميّة صحيحاً.
- **الأثر:** `school_admin`/`school_principal` مصادَق قد يُنشئ دعوة بصلاحيات لمدرسة **أخرى** ويتلقّى الـ token (الإجراءات المُصدَّرة قابلة للاستدعاء مباشرة رغم غياب مُستدعٍ UI).
- **الإصلاح:** إعادة تسمية الحقل إلى `schoolId` (ليعمل الحارس) + ضبط `target_school_id = ctx.user.schoolId` لغير system_owner، **أو** فحص صريح `if (!ctx.user.isSystemOwner && input.school_id !== ctx.user.schoolId) return error`؛ وتقوية الحارس المركزي ليتعرّف على `school_id` أيضاً.
- **قبل الإطلاق:** **نعم.**

### 🔴 High — `generate-qms-pdf`: fail-OPEN عند غياب السرّ + bucket عام بمسارات متوقّعة
- **الموقع:** [supabase/functions/generate-qms-pdf/index.ts:170](../../supabase/functions/generate-qms-pdf/index.ts) (`if (CRON_SECRET && auth !== …)`) + 228/242-246 (مسار `${school_id}/${form_code}/${form.id}.pdf` + `getPublicUrl` على bucket `qms-forms`).
- **السبب الجذري:** فحص التفويض **يُتخطّى كلياً** إذا كان `CRON_SECRET` فارغاً (fail-open، بخلاف webhook البصمة الذي يردّ 503)؛ وPDFات الجودة الرسمية (قد تحوي PII طلابي) تُنشَر عبر `getPublicUrl` بمسارات UUID قابلة للتخمين، ويُخزَّن الرابط العام في `generated_forms.pdf_url`.
- **الإصلاح:** اجعل التفويض fail-closed (401/503 عند غياب السرّ) + `verify_jwt` كدفاع متعمّق؛ استخدم **bucket خاص** + `createSignedUrl` (TTL قصير) بدل `getPublicUrl`.
- **قبل الإطلاق:** **نعم.**

### 🟠 Medium — صفحة موافقة الرحلة العامة: كتابة/قراءة PII عبر عميل المتصفّح (anon)
- **الموقع:** [app/activity/consent/[uniqueLink]/page.tsx:31-54](../../app/activity/consent/[uniqueLink]/page.tsx).
- **السبب الجذري:** صفحة `'use client'` تقرأ `trip_consents` + `student_profiles(name)` وتُحدِّث `parent_consent` عبر عميل المتصفّح anon، بمفتاح `unique_link` من العميل فقط — يخالف قاعدة منع كتابة المتصفّح للبيانات المحمية ويُحمّل الإنفاذ كلَّه على RLS. كما أنّ المسار ليس في `PUBLIC_ROUTES` في `proxy.ts` (تدفّق عام مكسور أو مُقيَّد بـ unique_link فقط للمسجَّلين).
- **الإصلاح:** نقل القراءة/الكتابة إلى server action/route handler يتحقّق من `unique_link` خادمياً ويُعيد الحد الأدنى؛ وتأكيد RLS على `trip_consents` يقصر anon بـ unique_link. إن لزم البقاء عاماً: allowlist عام مُتحكَّم + إيقاف كتابة المتصفّح.
- **قبل الإطلاق:** **نعم** (يُعالَج كـ High-ميل عند تفعيل تعدّد المستأجرين).

### 🟡 Low — `validate-bulk-upload` لا يربط المُستدعي بـ `school_id`
- **الموقع:** [supabase/functions/validate-bulk-upload/index.ts:62-93](../../supabase/functions/validate-bulk-upload/index.ts).
- **السبب:** يتحقّق من JWT لكن لا يتحقّق أنّ المستخدم ينتمي لـ `school_id` المُرسَل أو يملك دور رفع. **خطر منخفض** (تحقّق فقط بلا كتابة، ويُستدعى خادمياً من route يفرض الدور/المدرسة).
- **الإصلاح:** دفاع متعمّق — تحقّق من وجود `user_personas` للمستخدم بـ `school_id` ودور رفع.
- **قبل الإطلاق:** لا.

### 🟡 Low — تسجيل مُسهب في proxy + غياب CSP
- **الموقع:** [proxy.ts](../../proxy.ts) (console.log لكل طلب) + [next.config.mjs:11-22](../../next.config.mjs) (بلا Content-Security-Policy).
- **السبب:** تسجيل كل مسار/توقيت/فرع لكل طلب (ضجيج/كشف معلومات طفيف؛ **لا أسرار تُسجَّل** — مُتحقَّق)؛ الرؤوس تضبط X-Content-Type-Options/X-Frame-Options/Referrer-Policy بلا CSP.
- **الإصلاح:** تقييد الـlogs بـ `NODE_ENV==='development'` + إضافة رأس CSP.
- **قبل الإطلاق:** لا.

---

## 3) ما تأكّد نظافته
- لا أسرار/service-role key مُثبَّتة في الكود · service_role لا يُشحَن للعميل · المتصفّح anon فقط.
- الإجراءات المستخدِمة لـ `supabaseAdmin` تُعيد اشتقاق `school_id` خادمياً + قيد صريح.
- حُرّاس layout fail-closed (school/[id] · parent/[studentId]) بتحقّق UUID وعزل مستأجر.
- خدمات الجودة (3E-2) تشتقّ `school_id` من `getActivePersona`، مُبوّبة بالسجلّ، fail-closed؛ planned لا يُولّد.
- لا كتابة مباشرة في `generated_forms`/`quality_evidence` تتجاوز الخدمات المعتمدة (grep = صفر).
- `next.config.mjs`: `ignoreBuildErrors:false` + `ignoreDuringBuilds` غير مُفعَّل.

---

## 4) ترتيب الإصلاح المقترح (مرحلة لاحقة — لا يُنفَّذ الآن)
1. `generateInvite` عزل المستأجر (High).
2. `generate-qms-pdf` fail-closed + bucket خاص + signed URL (High).
3. صفحة موافقة الرحلة → server action (Medium/High-ميل).
4. `validate-bulk-upload` ربط بالمدرسة (Low) · proxy logs + CSP (Low).
