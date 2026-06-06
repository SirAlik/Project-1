# Sidra OS — School Management System

نظام إدارة مدرسي متعدد المستأجرين (**Multi-Tenant SaaS**) مبني على تقنيات حديثة وعالية الأداء (**Next.js + Supabase**).

---

## 📌 نظرة عامة

**Sidra OS** هو نظام إدارة مدرسي متكامل يهدف إلى أتمتة وتنظيم العمليات التشغيلية واليومية داخل البيئة التعليمية. يتميز النظام بتقديم لوحات عمل متخصصة ومصممة بدقة بناءً على الدور الوظيفي للمستخدم لضمان كفاءة الأداء وسهولة الوصول إلى البيانات.

تم تصميم المعمارية البرمجية لتكون **متعددة المستأجرين (Multi-Tenant)**، مما يضمن عزل بيانات كل مدرسة بشكل كامل وآمن داخل بيئتها الخاصة دون أي تداخل مع المدارس الأخرى في النظام.

---

## 👥 لمن هذا الملف؟

هذا الملف مخصص للعنصر البشري بشكل أساسي، وتحديداً:

* **المطورين الجدد** المنضمين لفريق العمل بالمشروع.
* **مهندسي البرمجيات** المسؤولين عن مراجعة بنية وتصميم النظام.
* **المطورين** الراغبين في تشغيل المشروع وإعداده في بيئة التطوير المحلية.
* **المحللين** الراغبين في فهم البنية التقنية وقواعد العمل التشغيلية قبل إجراء أي تعديلات.

> 💡 **ملاحظة:** تعليمات الذكاء الاصطناعي أو المساعدين البرمجيين مثل (Claude / GitHub Copilot) يجب أن تُعزل وتوضع في ملف مستقل وخاص بها مثل `CLAUDE.md`.

---

## 🚀 حالة المشروع الحالية (Current Status)

* **المرحلة:** ما قبل الإطلاق (**PRE-LAUNCH**) — البنية التحتية والأساسية للنظام مكتملة تماماً.
* **المستخدمون:** لا يوجد مستخدمون حقيقيون حالياً، ولا توجد بيانات إنتاجية (Production Data) نشطة.
* **قاعدة البيانات:** ترحيلات من (`M01–M77 + R00–R12`) بإجمالي **80 ترحيل** — بنية البيانات مكتملة.
* **واجهات المستخدم (UI):** **الدستور البصري المعتمد (Phase 3B) مُطبَّق** (خلفية vanilla · نص charcoal · أكسنت teal/أزرق · خط IBM Plex Sans Arabic · Light-only · بلا ذهبي/داكن/زجاج)، و**الصفحة الرئيسية العامة (Landing) أُعيد تصميمها بالكامل** عليه. **لوحات الأدوار الداخلية لم يُعَد تصميمها بعد** (Phase 3C لاحقاً) — راجع قسم «الهوية البصرية» أدناه.
* **جودة الكود:** اكتملت مراحل تنظيف الكود الأساسية 1–5 — راجع القسم أدناه.
* **التوجيه وعزل المستأجر (Routing & Tenancy):** اكتملت **Phase 1 + Phase 2A → 2F** (مواءمة توجيه الأدوار · حارس مستأجر لـ `app/school/[id]/*` · عزل بيانات tenant-safe لـ `classroom/[classId]` · تصحيح ملكية المجالات بين `academic_vp`/`school_affairs_vp` · إغلاق DB hardening لـ `classes.school_id`). المشروع **PRE-LAUNCH** — لا مستخدمون ولا بيانات إنتاجية.

---

## 🧹 حالة جودة الكود (Code Quality Status)

> **الحالة الراهنة:** جميع المراحل (1–5) مكتملة. `npm run lint` → **صفر أخطاء وصفر تحذيرات**. `npm run build` → **77/77 صفحة** بدون أي خطأ TypeScript. **Virtual-Swimming-Wave (2026-06-03): 100% مكتمل** — تأمين 9 نقاط أمنية + M77 compound unique + layout guards (lrc/qa/science/student-affairs/educational/staff-evaluation/metaverse/admin) + Phase 6 browser hooks → Server Actions + Phase 8c/8e/8f hardening. **Edge Functions + LRC Maintenance (2026-06-03): مُنجز** — `validate-bulk-upload` + `generate-qms-pdf` + `daily-maintenance` + `lrc-maintenance-service`. commit `c05b95a`.

### ✅ المرحلة الأولى — مكتملة

حُذفت ~363 مشكلة من نوع `@typescript-eslint/no-unused-vars` من أكثر من 130 ملفاً، وأُصلحت 3 أخطاء TypeScript مخفية كانت تمنع البناء.

### ✅ المرحلة الثانية — مكتملة

أُصلحت جميع حالات `react/no-unescaped-entities` و `jsx-a11y/alt-text` وحالات `react-hooks/exhaustive-deps` الآمنة.

### ✅ المرحلة الثالثة — مكتملة

أُزيلت جميع حالات `@typescript-eslint/no-explicit-any` من كامل الكود باستخدام interfaces محلية حقيقية وأنواع TypeScript دقيقة.

| المقياس | القيمة |
| ------- | ------ |
| إجمالي المشاكل عند البداية | ~700 |
| `npm run lint` الآن | **0 أخطاء · 0 تحذيرات** |
| `npm run build` الآن | ✅ **63/63 صفحة** · صفر أخطاء TypeScript · `ƒ Proxy (Middleware)` |
| `@typescript-eslint/no-explicit-any` المتبقية | **صفر** |

### ✅ المرحلة الرابعة — مكتملة

جميع analytics hooks تستخدم نمط `startTransition(async () => { await loadData(); })` المتوافق مع React 19. لا حالات `react-hooks/set-state-in-effect` متبقية.

### ✅ المرحلة الخامسة — مكتملة

لا حالات `react-hooks/exhaustive-deps` متبقية. `npm run lint` → **صفر أخطاء، صفر تحذيرات**.

### ⚠️ ملاحظة — ثغرة PostCSS

`npm audit` قد يُظهر ثغرة في `postcss` كاعتمادية داخلية لـ Next.js. لا يمكن إصلاحها بـ `npm audit fix --force` دون كسر البناء. الحل الصحيح هو انتظار تحديث رسمي من فريق Next.js. يُمنع تماماً استخدام `npm audit fix --force` أو تخفيض إصدار أي dependency بسببها.

---

## 🛠️ التقنيات والمكتبات المستخدمة (Tech Stack)

يعتمد مشروع **Sidra OS** على حزمة برمجية متطورة وموحدة لضمان الأداء والجمالية والاستقرار:

| الطبقة التقنية (Layer) | التقنيات والمكتبات المعتمدة (Technologies) |
| :--- | :--- |
| **الواجهة الأمامية (Frontend)** | Next.js 16 (App Router) · React 19 · Tailwind CSS 4 |
| **الواجهة الخلفية (Backend)** | Supabase (Auth + PostgreSQL + RLS Policies) |
| **إدارة النماذج والتحقق (Forms)** | Zod · next-safe-action |
| **مكونات الواجهة (UI Components)** | shadcn/ui · Radix UI (للمكونات التفاعلية منخفضة المستوى) |
| **الجداول المتقدمة (Tables)** | TanStack Table |
| **الرسوم والتحليلات (Charts)** | Recharts |
| **الحركة والتفاعل (Animation)** | Framer Motion · GSAP |
| **الأيقونات (Icons)** | Lucide React |
| **الخطوط (Fonts)** | IBM Plex Sans Arabic (الخط الأساسي للواجهة عبر `next/font/google`) |
| **الوضع البصري (Theme)** | Light-only — نظام الوضع الداكن محذوف بالكامل |

---

## 📐 مبادئ تصميم الواجهة (UI Design Principles)

يجب أن تلتزم واجهات **Sidra OS** بشكل صارم بالمبادئ التصميمية التالية لضمان تجربة مستخدم موحدة واحترافية:

1. **الالتزام بالمكونات القياسية:** استخدام مكونات `shadcn/ui` كخيار أول وأساسي قدر الإمكان.
2. **التفاعلية منخفضة المستوى:** الاعتماد على `Radix UI` عند الحاجة لبناء أو تخصيص مكونات تفاعلية معقدة.
3. **البيانات والجداول:** استخدام `TanStack Table` حصراً لجميع الجداول المتقدمة والذكية في النظام.
4. **لوحات المؤشرات:** الاعتماد على `Recharts` لبناء الرسوم البيانية الإحصائية ولوحات التحليل.
5. **التحريك الهادف:** استخدام `Framer Motion` للحركات الخفيفة والذكية التي تخدم تجربة المستخدم، وتجنب الإفراط.
6. **الهوية البصرية للأيقونات:** استخدام مكتبة `Lucide React` كالمصدر الافتراضي والوحيد للأيقونات.
7. **النقاء والاتساق:** الحفاظ على تصميم نظيف (Clean Layout)، حديث، متجاوب بالكامل مع مختلف الشاشات، ومتسق في توزيع العناصر والمسافات.
8. **إعادة الاستخدام قبل الإنشاء:** ابحث دائماً في المكونات المشتركة الحالية وأعد استخدامها قبل الشروع في بناء مكون جديد لمنع تكرار الكود.
9. **ترشيد الحزم:** يُمنع تماماً إضافة أي مكتبات واجهة، أو أيقونات، أو جداول، أو أدوات تحريك جديدة إلا بوجود مبرر تقني وعملي صارم وموافقة الفريق.

### قواعد الواجهة المعتمدة

- الواجهة المعتمدة هي **Light UI فقط**.
- يمنع استخدام `dark:` أو بناء صفحات حول خلفيات داكنة قسرية.
- يمنع استخدام `bg-black` أو `bg-zinc-950` أو `bg-slate-950` أو `bg-neutral-950` في مسارات الإنتاج.
- استخدم خلفيات دافئة ناعمة، بطاقات بيضاء أو off-white، حدوداً خفيفة، ونصوصاً محايدة مقروءة.
- لا تضف مكتبات UI جديدة دون موافقة معمارية صريحة.

### قواعد البيانات التجريبية والـ Sandbox

- يمنع وجود mock/demo/fake data داخل مسارات الإنتاج.
- يمنع إبقاء ملفات `.bak` داخل `app/`.
- لا توضع مسارات sandbox أو demo داخل production app routes إلا إذا كانت معزولة ومذكورة صراحة في الوثائق.
- إذا لم تكن الميزة متصلة ببيانات حقيقية، اعرض حالة فارغة واضحة ولا تعرض مؤشرات تبدو إنتاجية.

### قواعد المعمارية والتنفيذ

- لا تقبل `schoolId` من العميل للعمليات الحساسة؛ مصدر tenant يجب أن يكون server-side persona/context.
- يمنع استخدام Supabase browser client للكتابة على بيانات محمية.
- يمنع استخدام `supabaseAdmin` أو `service_role` في user-facing flows.
- يجب أن تستخدم Server Actions تحقق مدخلات وصلاحيات قبل أي mutation.
- بعد أي تنظيف أو تعديل تشغيلي، شغّل `npm run lint` ثم `npm run build`.

---

## 🎨 الهوية البصرية ونظام التصميم (Visual Constitution)

> **الحالة (2026-06-06):** الأساس البصري المعتمد (**Phase 3B**) مُطبَّق بالكامل، و**الصفحة الرئيسية العامة (Landing)** أُعيد تصميمها عليه. **لوحات الأدوار الداخلية لم يُعَد تصميمها بعد.**

### الـ Design Tokens المعتمدة (في `app/globals.css`)

| الرمز | القيمة | الاستخدام |
| --- | --- | --- |
| `--background` | `#FBF7EF` (vanilla) | خلفية الصفحة — **يمنع `bg-white` كخلفية رئيسية** |
| `--foreground` | `#111827` (charcoal) | النص المهم |
| `--card` / `--surface-soft` | `#FFFFFF` / `#FFFDF8` | أسطح البطاقات الدافئة |
| `--primary` | `#0D9488` (teal) | الأكسنت الأساسي |
| `--color-info` / `--chart-2` | `#3B6FE0` (أزرق) | الأكسنت الثانوي |
| `--border` | `#E8E1D4` | حدود هادئة |
| `--muted-foreground` | `#6B7280` | تعليقات صغيرة/بيانات ثانوية **فقط** (لا للنص المهم) |
| `--radius` | `1rem` (~16px) | نصف قطر موحّد |
| الرسوم (charts) | teal · أزرق · lavender · amber · soft-red | ألوان لوحات التحليل |

- **Light UI فقط** — لا `dark:`، لا خلفيات داكنة، لا زجاج/holographic/antigravity، **لا ذهبي legacy** (حُيِّد إلى teal للتوافق الخلفي).
- **أسماء tokens الخاصة بـ shadcn/ui محفوظة كما هي** — القيم فقط هي التي تغيّرت.

### الخط

- الخط الأساسي للواجهة العربية: **IBM Plex Sans Arabic** عبر `next/font/google` (`--font-sans` في `lib/fonts.ts`).
- أُزيلت خطوط Saudi (localFont) وTajawal وGeist من سلسلة الخط الأساسية؛ `--font-saudi` مُعاد توجيهه إلى `var(--font-sans)`.

### الصفحة الرئيسية العامة (Landing)

- `app/page.tsx`: **Server Component رفيع** (يقرأ الجلسة فقط لتوجيه CTA: مسجّل → `/portal` · غير مسجّل → `/login`) يركّب أقسامًا معيارية في `components/landing/`:
  `LandingHeader` · `HeroSection` (+ `HeroDashboardPreview` لوحة معاينة وهمية بـ SVG/CSS) · `SchoolPulseSection` · `RoleIntelligenceSection` · `DataToActionSection` · `WorkflowSection` · `TrustSection` · `StudentRoomSection` · `FinalCTASection` · `LandingFooter`.
- التموضع: **نظام تشغيل مدرسي مدفوع بالبيانات** (بيانات → رؤى → تنبيهات → مخاطر → توصيات → سير عمل → قرار). عنوان الـ Hero: «مدرستي» + «من البيانات إلى القرارات».
- الرسوم في الـ Hero مبنية بـ **SVG/CSS فقط** — **بلا أي تبعية جديدة** (لا Recharts على صفحة الهبوط).
- `components/layout/GlobalHeader.tsx`: ترويسة التطبيق **مُخفاة على `/`** — الهبوط يستخدم `LandingHeader` الخاص به.

### الـ Metadata (عناوين التبويب)

- `app/layout.tsx`: `title: { default: "Sidra OS | نظام تشغيل مدرسي", template: "%s | Sidra OS" }`.
- `app/page.tsx`: «الرئيسية | Sidra OS» (نصّ مطلق — القالب لا ينطبق على نفس الـ segment الجذر في Next.js).
- `app/(auth)/login`: «تسجيل الدخول | Sidra OS».
- أُزيل «أداة فلاح» نهائياً من كل metadata نشط.

### تنظيف مكوّنات الهبوط القديمة

- **حُذفت 8 ملفات** غير مستخدمة (صفر استيراد، تحقّق grep شامل): `HighlightTile` · `KPIStatCard` · `LivePulse` · `PublicFeed` · `SkeletonLoaders` (في `components/landing/`) + `HolographicCard` · `AntigravityMagneticText` · `AntigravityParticlesCanvas` (في `components/ui/`).
- **أُبقيت:** `LoginCard` (تستخدمها صفحة الدخول) · `GlassSkeleton` (تستخدمها صفحات `loading.tsx`).

> `npm run lint` → صفر أخطاء/تحذيرات · `npm run build` → **63/63 صفحة** · لا تبعيات جديدة.

---

## 📁 بنية ومجلدات المشروع (Project Architecture)

تم تنظيم المشروع ليعكس الهيكل الإداري والأكاديمي للمنشآت التعليمية من خلال مسارات واضحة:

```text
app/                         — صفحات واجهة المستخدم بناءً على الصلاحيات والأدوار (Next.js App Router)
├── admin/
│   ├── automation/          — قواعد الأتمتة البرمجية للنظام (automation_rules)
│   ├── bulk-upload/         — نظام الرفع المجمّع للملفات وإدارتها (bulk_upload_jobs)
│   ├── dashboard/           — لوحة المؤشرات والإحصاءات العامة للنظام
│   ├── setup/               — الإعداد الأكاديمي الأساسي (المراحل الأكاديمية + الترمات + الحصص الزمنية)
│   └── timetable/           — إدارة وإعداد الجدول الدراسي العام
├── principal/               — لوحة عمل مدير المدرسة (وتشمل 9 صفحات تحليلات بيانية متقدمة)
├── student-affairs/         — لوحة وكيل شؤون الطلاب (الغياب + الإحالات السلوكية + رصد السلوك)
├── secretary/               — لوحة عمل سكرتير المدرسة والمهام الإدارية
├── qa/                      — قسم ضمان الجودة وأدوات الملاحظة الصفية والتقييم
├── lrc/                     — مركز مصادر التعلم (إدارة الزيارات + الإعارات للكتب + حجوزات القاعات)
├── health/                  — العيادة والصحة المدرسية (سجل الزيارات الصحية + الإحالات الطبية + إدارة المستلزمات)
├── classroom/               — لوحة إدارة الفصل الخاصة بالمعلم ورصد درجات الطلاب
├── counselor/               — لوحة المرشد الطلابي (المعاملات الإرشادية + الجلسات الخاصة + بلاغات الحالات)
├── meetings/                — نظام الاجتماعات التفاعلية (الملاحظات الحية Live Notes + التوقيع الرقمي)
├── period-attendance/       — النظام اللحظي لتسجيل حضور وغياب الحصص الدراسية
├── notifications/           — مركز إدارة وإرسال الإشعارات الشامل
├── workflows/               — تتبع تدفقات العمل وبوابات الاعتماد والموافقات (Approval Gates)
├── staff-evaluation/        — تقويم وتتبع الأداء الوظيفي للكادر التعليمي والإداري
├── activity/                — إدارة برامج الأنشطة الطلابية والفعاليات المدرسية
├── science/                 — إدارة وتتبع المختبرات العلمية والتجارب
├── educational/             — إدارة الوحدات والمناهج الأكاديمية والخطط الدراسية
└── portal/                  — بوابة أولياء الأمور لمتابعة الأبناء

components/
├── landing/                 — أقسام الصفحة الرئيسية العامة المعيارية (Hero · SchoolPulse · RoleIntelligence · DataToAction · Workflow · Trust · StudentRoom · FinalCTA · Header/Footer)
├── ui/chart-container.tsx   — مكوّن موحَّد ومخصص لـ Recharts (يقوم بتغليف ResponsiveContainer)
└── ui/...                   — المكونات الأساسية للنظام المستمدة من وثائق shadcn/ui

lib/
├── auth/                    — خدمات الصلاحيات والأمان (pbac.ts · roles.ts · context-service.ts)
├── db/                      — إعدادات الاتصال بقاعدة البيانات (supabase-browser.ts · supabase-admin.ts)
├── services/                — الخدمات المشتركة (audit-service.ts لتدقيق الحسابات · dashboard-data.ts لجلب التحليلات)
├── jobs/                    — المهام المجدولة والتشغيل التلقائي الخلفي (مثل ملف التغذية اليومي daily-feed)
└── types/                   — ملفات تعريف الأنواع والـ TypeScript (academic · lrc · health · qa · ai ...)

db/
└── migrations/              — السجل التاريخي والترجيلات الخاصة بقاعدة البيانات (M01–M77 + R00–R12 بإجمالي 80 ترحيل)

```

---

## ⚙️ تشغيل المشروع محلياً (Getting Started)

لتشغيل المشروع في بيئة التطوير المحلية، نفذ الأوامر التالية بالتسلسل:

```bash
# 1. تثبيت الاعتمادات والمكتبات البرمجية
npm install

# 2. إنشاء ملف متغيرات البيئة من القالب (ثم أضف القيم الفعلية)
cp .env.example .env.local

# 3. تشغيل خادم التطوير المحلي
npm run dev

# 4. تشغيل مجموعة الاختبارات (اختياري)
npm test

```

بعد التشغيل، يمكنك فتح الرابط التالي في متصفحك: [http://localhost:3000](http://localhost:3000)

### 🛠️ أوامر مفيدة للمطورين

**لفحص إصدارات الحزم الأساسية والتأكد من مطابقتها للمعايير:**

```bash
npm list next typescript tailwindcss @tanstack/react-table recharts framer-motion lucide-react
```

**لفحص جودة الكود وبناء المشروع واكتشاف الأخطاء قبل الرفع:**

```bash
npm run lint
npm run build
```

**لإضافة مكونات واجهة جديدة من حزمة `shadcn/ui` عند الحاجة القصوى:**

```bash
npx shadcn@latest add button card table dialog dropdown-menu tabs input select textarea badge sheet tooltip
```

> ⚠️ **ملاحظة:** لا تقم بإنشاء أو إضافة مكونات جديدة إلا إذا دعت الحاجة الفعلية لذلك، وتأكد أولاً من إمكانية إعادة استخدام المكونات الموجودة فعلياً داخل مسار `components/ui`.

---

## 🗄️ معمارية قاعدة البيانات والتحكم (Database & Architecture)

تعتبر المجلدات والملفات داخل المسار `db/migrations/` هي **المصدر الوحيد للحقيقة (Single Source of Truth)** لكل ما يتعلق ببنية ومخططات قاعدة البيانات. يرجى مراجعة ملف `db/README.md` للاطلاع على القائمة التفصيلية لكافة الترحيلات وترتيب تطبيقها الزمني.

### 📐 المبادئ المعمارية الحاكمة لتطوير قاعدة البيانات

| المبدأ المعماري | آلية التطبيق البرمجية في النظام |
| --- | --- |
| **عزل المستأجرين (Multi-Tenancy)** | إدراج حقل `school_id uuid NOT NULL` بشكل إجباري على كل جدول نشط في قاعدة البيانات. |
| **المصادقة والتحقق (Authentication)** | الاعتماد الكلي على نظام `Supabase Auth` وقراءة الـ JWT عبر دالة: `auth.jwt() -> 'app_metadata'` |
| **التحكم في الوصول والأمان** | تفعيل سياسات أمان مستوى الصف (**RLS Policies**) على كل جدول يتم إنشاؤه بلا أي استثناءات. |
| **إدارة الأدوار والصلاحيات** | الاعتماد على معمارية التحكم بالوصول المستند إلى الصلاحيات والأدوار المتقدمة (**PBAC**)، وتوصيف 16 دوراً رسمياً في ملف `lib/auth/pbac.ts`. |

---

## 🎭 الأدوار الرسمية المعتمدة في النظام (Official System Roles)

يحتوي نظام **Sidra OS** على **16 دوراً رسمياً ومحدداً** يمنع تعديل مسمياتها أو صلاحياتها إلا بعد الرجوع لهندسة النظام وإجراء مراجعة شاملة للأثر الكلي:

1. `system_owner` (مالك النظام)
2. `school_admin` (مدير النظام بالمدرسة)
3. `school_principal` (مدير المدرسة)
4. `school_affairs_vp` (وكيل الشؤون المدرسية)
5. `student_affairs_vp` (وكيل شؤون الطلاب)
6. `academic_vp` (وكيل الشؤون التعليمية)
7. `school_librarian` (أمين مصادر التعلم)
8. `school_secretary` (سكرتير المدرسة)
9. `activity_leader` (رائد النشاط الطلابي)
10. `student_counselor` (الموجه الطلابي)
11. `quality_coordinator` (منسق الجودة)
12. `health_coordinator` (الموجه الصحي)
13. `lab_technician` (محضر المختبر)
14. `teacher` (المعلم)
15. `student` (الطالب)
16. `parent` (ولي الأمر)

---

## 🔒 آخر التغييرات الأمنية المنفّذة

| التغيير | التفاصيل |
| ------- | -------- |
| حذف Demo Mode بالكامل | لا `lib/mock-data/`، لا `NEXT_PUBLIC_DEMO_MODE`، لا زر دخول تجريبي |
| تفعيل `proxy.ts` كـ Middleware | Next.js 16 يستخدم `proxy.ts` مباشرةً — الحماية تعمل الآن فعلياً |
| إصلاح JWT verification | استُبدل فك base64 اليدوي بـ `jose.jwtVerify` مع تحقق من التوقيع |
| إصلاح `BulkUploadModal` | الكتابة المباشرة من المتصفح استُبدلت بـ Server Action مع `school_id` |
| M77 — compound unique constraint | `student_profiles`: حُذف `national_id` unique عالمي، أُضيف `UNIQUE(school_id, national_id)` + index |
| تأمين bulk-upload route | `app/api/bulk-upload/process/[jobId]/route.ts` يضم `school_id` في كل record + `onConflict: 'school_id,national_id'` |
| تأمين automation actions | `app/admin/automation/_actions.ts`: toggle/delete يفلتران بـ `school_id` + create يأخذ schoolId من persona |
| تأمين assignTeacherToSlot | `app/_actions/coordinator-classroom.ts`: فحص ملكية المعلم للمدرسة + `school_id` filter على timetable_slots |
| تأمين AI service | `lib/services/ai-service.ts`: فحص ملكية الطالب للمدرسة قبل بناء payload + `school_id` في analytics query |
| إزالة Mock ID | `app/classroom/[grade]/[section]/page.tsx`: حُذف fallback `"TCH123"` — يُوقَف عند غياب user.id |
| إزالة system_role من invite | `app/_actions/invite.ts`: حُذف `system_role: 'system_user'` من upsert لحماية قيمة system_owner |
| إصلاح activity_leader path | `lib/auth/roles.ts`: `ROLE_DASHBOARD_MAP` صُحِّح من `/activities` إلى `/activity` |
| Layout guards جديدة | `app/lrc/layout.tsx` (school_librarian) · `app/qa/layout.tsx` (quality_coordinator) · `app/science/layout.tsx` (lab_technician) |
| Phase 6 — 8 browser hooks → Server Actions | `app/{qa,science,health,lrc,activity,classroom,secretary}/_actions.ts` منشأة + `app/student-affairs/_actions.ts` مُوسَّع — كل mutation تضيف `school_id: persona.schoolId` من server-side عبر `createSupabaseServerClient()` + `getActivePersona()`. لا browser writes لبيانات محمية. |
| Admin layout guard | `app/admin/layout.tsx` — role: `system_owner` يغطي جميع مسارات `/admin/*` التي كانت مكشوفة. commit `0bf76d8`. |
| Phase 7b — layout guards إضافية | `app/student-affairs/layout.tsx` · `app/educational/layout.tsx` · `app/staff-evaluation/layout.tsx` · `app/student/metaverse/layout.tsx` — أدوار: student_affairs_vp / academic_vp / school_principal / student. commits `fc1748b` + `3b44d1b`. |
| Phase 8c — timetable Server Component | `app/admin/timetable/page.tsx` → async Server Component + `TimetableClient.tsx`. يُصلح query legacy `profiles.role='teacher'` → `user_personas!inner(full_name)`. commit `3b44d1b`. |
| Phase 8e/8f — school_id hardening | `period-attendance-service.ts` + `meeting-service.ts`: explicit `.eq('school_id', persona.schoolId)` defense-in-depth على جميع UPDATE queries. commit `0bf76d8`. |
| Supabase Audit Phase 3 — role cleanup | `db/migrations/20260604_harden_legacy_rpc_and_roles.sql`: REVOKE anon من dangerous RPCs · DROP `get_my_role()` · DROP policy `"Assigned Role Update Cases"` · تحويل `invites.target_role` + `cases.assigned_to_role` من `user_role` → `school_role_type` (super_admin → system_owner) · DROP TYPE `user_role` · CREATE `rate_limit_tracker` + `increment_rate_limit`. يُطبَّق يدوياً. |
| Supabase Audit Phase 4 — ledger infrastructure | `db/migrations/20260604_rebuild_gamification_ledger_infrastructure.sql` v2: CREATE `app_private` schema + `app_private.secrets` (بديل vault) · `system_config` + RLS · partial index `unique_student_source_event` · `rpc_process_transaction` v2 (null school_id guard) · `rpc_complete_quest(uuid, uuid)` · REVOKE anon من scan/furniture. يُطبَّق يدوياً. |
| Phase 1 — مواءمة توجيه الأدوار | `lib/auth/roles.ts`: مواءمة `ROLE_DASHBOARD_MAP` + `ROLE_ACCESS_MAP` مع شجرة `app/` الفعلية (5 أدوار كانت توجَّه لمسارات مفقودة) · `activity_leader` ACCESS صُحِّح `/activities`→`/activity` · `app/student/page.tsx` + `app/parent/page.tsx` صفحتا هبوط فارغة آمنة (بلا mock) · `CommandPalette` لم يعد يفترض `system_owner` ويقرأ الدور من `AuthContext` + light tokens · `lib/routes.ts` mojibake مُصلَح. lint + build + test نجحت. |
| Phase 2A — حارس مستأجر `/school/[id]` | `app/school/[id]/layout.tsx` (جديد): تحقق `schoolId` (UUID) + persona موثوقة + دور ∈ {`system_owner`, `school_admin`, `school_affairs_vp`} + تطابق المدرسة لغير `system_owner` — **فشل مغلق** · `lib/routes.ts` حذف إدخال `/school/:id/setup` المعطوب · `lib/auth/roles.ts` حذف بادئة `/school-ops` الميتة. lint + build + test نجحت. |
| Phase 2B — عزل بيانات `classroom/[classId]` | قيد `school_id` على استعلام `classes` (admin client يتجاوز RLS) + `notFound()` فشل-مغلق + `validateSchoolAccess` · تحصين `getClassTimetable` بـ `schoolId`. فحص Supabase حي: `classes`/`timetable_slots` `school_id NOT NULL` وRLS سليمة — بلا migration. |
| Phase 2C — توحيد + تضييق | حذف 7 دوال مكررة ميتة من `app/_actions/staff.ts` (المصدر `coordinator-classroom.ts`) · حُرّاس متداخلة `school/[id]/{staff,classroom}` (admin-only) عبر `lib/auth/school-page-guard.ts` · تحقق tenant لـ `class_id`/`academic_year_id`+`school_id` في admin-import. |
| Phase 2D — تصحيح ملكية الأدوار | `school_affairs_vp` (تشغيلي) ضُيِّق إلى `['/school','/portal']` ومحصور بصفحة `school-affairs` عبر حُرّاس admin-only على `dashboard`/`setup`/`academic-setup` · `academic_vp` (تعليمي) أُبقي على نطاقه · إزالة `student_affairs_vp` من إدارة الفصول · مصفوفة أدوار-مجالات موثّقة. |
| Phase 2E — تنظيف ما قبل UX | **Student Metaverse ميزة مقصودة** — `app/student/metaverse/page.tsx` صفحة فهرس بروابط لأبنائها (إصلاح 404، بلا حذف) + إعادة إدراجها في routeMetadata · إنشاء `db/migrations/20260606_drop_classes_school_id_default.sql`. lint + build + test نجحت. |
| Phase 2F — إغلاق DB hardening | ✅ **تم تطبيق** `db/migrations/20260606_drop_classes_school_id_default.sql` على Supabase الحي والتحقق: `classes.school_id` = `uuid NOT NULL` · `default = NULL` (أُزيل الصفري) · 0 صفوف · RLS مفعّلة (3 سياسات). lint + build (63/63) + test نجحت. |

---

## 🚫 قواعد العمل الصارمة وتوجيهات التطوير (Strict Business Rules)

يجب على جميع المطورين الالتزام التام بالقواعد التالية أثناء العمل على المشروع، ومخالفتها قد تؤدي إلى كسر معمارية النظام:

* ❌ **ملفات البيئة:** لا تقم بتعديل أو رفع ملف `.env.local` إطلاقاً تحت أي ظرف.
* ❌ **إدارة المستودع:** يمنع منعاً باتاً استخدام أمر الدفع القسري `git push --force` للحفاظ على سلامة شجرة التغييرات.
* 📝 **لغة الكود والتعليقات:** تُكتب الشيفرة البرمجية (Code) بالكامل باللغة **الإنجليزية**، بينما تُكتب التعليقات التوضيحية (Comments) وشرح الدوال باللغة **العربية**.
* 🔒 **الجداول الجديدة والأمان:** أي جدول جديد يتم إنشاؤه يجب أن يحتوي على حقل `school_id NOT NULL` ويتم تفعيل سياسة الـ `RLS` الخاصة به في **نفس ملف الترحيل** الذي أنشأ الجدول.
* 📁 **قراءة المعمارية:** اقرأ وافهم بنية المجلدات الحالية جيداً قبل إضافة أي ملفات أو مسارات جديدة.
* 🔍 **منع التكرار المظهري:** لا تنشئ مكونات واجهة مكررة إذا كان هناك مكوّن حالي يؤدي نفس الغرض أو قريب منه.
* 🛑 **مسميات الأدوار:** لا تقم بتغيير مسميات الأدوار الرسمية الـ 16 بأي شكل من الأشكال دون عمل مراجعة أثر شاملة (Impact Analysis).
* 🛡️ **سياسات RLS:** لا تقم بتعديل أو تحديث سياسات RLS دون فهم كامل وعميق لأثرها على آلية عزل المدارس ومستأجري النظام لحماية البيانات من التسريب.
* 📊 **الرسوم البيانية المشتركة:** عند بناء الرسوم البيانية والإحصائية، استخدم مكوّن `components/ui/chart-container.tsx` الموحد لضمان التوافقية والسمات الموحدة.
* 🧬 **الاستدامة:** حافظ دائماً على كتابة كود نظيف قابل للصيانة والتوسع المستقبلي على المدى الطويل (Maintainability & Scalability).

---

## 🚨 ملاحظات هامة جداً قبل الإطلاق (Pre-Launch Checkpoints)

نظراً لأن المشروع يمر حالياً بمرحلة **ما قبل الإطلاق (Pre-Launch)**، يجب أخذ النقاط الحيوية التالية بعين الاعتبار والتركيز عليها أثناء التطوير:

1. **عزل البيانات:** لا توجد أي بيانات إنتاجية حقيقية حالياً، لذا استغل هذه الفترة في اختبار وفحص بنية الجداول بمرونة.
2. **إعادة الهيكلة المظهرية:** من الممكن والمسموح إعادة تصميم أو هيكلة بعض واجهات المستخدم الحالية قبل إتاحة النظام للاستخدام الفعلي.
3. **أمن الـ RLS:** يجب إجراء اختبارات أمان واختراق مكثفة وصارمة لسياسات `RLS` للتأكد التام من استحالة تداخل أو تسريب البيانات بين المدارس قبل تسجيل أي مستخدم حقيقي.
4. **تدفقات الصلاحيات:** يجب التحقق واختبار كافة تدفقات الأدوار والصلاحيات والتأكد من أن كل مستخدم يرى فقط ما يناسب دوره الوظيفي.
5. **تجربة المستخدم (UX Review):** يجب مراجعة تجربة المستخدم والأداء الفعلي لكل لوحة تحكم بشكل منفصل بناءً على طبيعة عمل كل دور وظيفي.
6. **الخدمات والبيانات الحقيقية:** تأكد تماماً من أن كل صفحة أو لوحة تحكم تقوم باستدعاء وجلب بياناتها من الخدمات المخصصة لها والموجودة داخل مسار `lib/services/` أو ما يعادلها. **لا توجد بيانات وهمية (Mock Data) في التطبيق** — تم حذف `lib/mock-data/` بالكامل.

---

## 🎯 الهدف العام للنظام (Ultimate Goal)

إن الهدف الأسمى من بناء وتطوير نظام **Sidra OS** هو تقديم منظومة برمجية مدرسية فائقة التنظيم، آمنة للغاية، وقابلة للتوسع اللانهائي، تساعد المؤسسات التعليمية على إدارة وتسيير عملياتها اليومية بسلاسة تامة، بالإضافة إلى تحويل البيانات التشغيلية والمدرسية الخام إلى مؤشرات إحصائية واضحة ورسوم بيانية ذكية تدعم صناع القرار الإداري والتربوي داخل المدرسة.
