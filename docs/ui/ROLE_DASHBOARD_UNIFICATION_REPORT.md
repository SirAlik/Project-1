# تقرير توحيد لوحات الأدوار الإدارية — UI Unification Sprint 1

> **التاريخ:** 2026-06-18 · **commit:** `e913cc6` (feat: unify administrative dashboard design system) · **الحالة:** PRE-LAUNCH (لا مستخدمون · لا بيانات إنتاجية)
> **المبدأ:** نظام تصميم واحد + صدفة واحدة عبر صفحات الأدوار الإدارية. الاختلافات بين الأدوار في
> **الودجِت/الوحدات/الصلاحيات/البيانات/الإجراءات/لوحات الجودة** — لا في تخطيطات أو بطاقات أو ترويسات
> أو أزرار متعدّدة. سِدرة نظام واحد احترافي، لا تطبيقات مصغّرة متفرّقة.

---

## 0) ملخّص تنفيذي

- أُنشئت **مجموعة مكوّنات موحّدة** في `components/dashboard/` + **طبقة إعداد** في `lib/dashboard/role-dashboard.ts`.
- وُحِّدت **8 صفحات بالكامل** و**صفحتان جزئياً** من أصل 13 صفحة مُدقَّقة.
- أُزيل استيراد `KPICard` القديم (surface-block/dark) من **6 صفحات هبوط**، واستُبدل بـ `MetricCard` المعتمد.
- **بلا أي تغيير** في DB/RLS/migrations/auth/persona/مفاتيح الأدوار/التبعيات/Edge Functions.
- `npm run lint` = صفر · `npm run build` = **63/63 صفحة** · لا تسريب علامة قديمة في الملفات المعدّلة.

---

## ✅ UI Unification Sprint 2 — ترحيل صدفة LRC (2026-06-18)

> **الهدف:** نقل `/lrc` من صدفته اليدوية إلى الصدفة الموحّدة `RoleDashboardShell` مع **الحفاظ على كامل وظائف LRC**. هذا الحاجز كان البند الأول في §8 وقد **أُغلق الآن**. النتائج: `npm run lint` صفر · `npm run build` **63/63** · بلا تغيير DB/RLS/migrations/Edge/auth/persona/مفاتيح الأدوار/التبعيات.

### ما تغيّر
- **`app/lrc/_components/LrcWorkspace.tsx`** أُعيدت كتابته: حُذفت الصدفة اليدوية بالكامل (الشريط الجانبي + الشريط العلوي + `NotificationsMenu`/`UserMenu` + درج الجوال + كتلة العلامة) — صارت كلها من `RoleDashboardShell role={role}`. تبديل العروض السبعة (overview · books · lending · bookings · visits · reports · quality) صار عبر **`SegmentedTabs`** داخل الصفحة + **`PageHeader`** للعنوان السياقي — مطابقاً لنمط `/activity` · `/science` · `/secretary`.
- **`lib/navigation/role-nav.ts`**: أُضيفت حالة `school_librarian` (كانت غائبة → سقوط إلى `default` = شريط فارغ). الآن: «الرئيسية» (`/lrc`) + مجموعة «قريباً» بثلاثة عناصر مُعطّلة (`comingSoon`: الفهرسة الذكية · الفهرس العام · الإعدادات) — حُفِظت إشارة الميزات المخطّطة في الشريط الموحّد بدل فقدانها.
- **`app/lrc/_components/LrcOverview.tsx`**: استُبدلت بطاقتا `KpiCard`/`TeaserCard` المحليّتان (تكرار) بـ `MetricCard` + `ActionCard` + `DashboardGrid` من الـ kit.
- **`app/lrc/page.tsx`**: أُزيل جلب `getCachedSchoolStats` لـ`schoolName` (يقرؤه الشريط من `useAuth`) + إسقاط prop `schoolName` — تبسيط بلا فقد وظيفة.

### الصدفة اليدوية المُزالة
شريط جانبي يدوي (`NAV_GROUPS` + `SOON_ITEMS`) · شريط علوي يدوي (`NotificationsMenu`/`UserMenu` + زر القائمة) · درج جوال (`mobileOpen`/`Menu`/`X`) · كتلة علامة «سِدرة» مكرّرة · `getRoleInfo`/`roleLabel` المحلي. كلها مسؤوليات الصدفة الموحّدة الآن.

### وظائف LRC المحفوظة (بلا كسر)
خطّاف `useLRC` (الحالة + الإجراءات) كما هو · العروض السبعة وكل props مكوّناتها: `LrcOverview` · `BookList` (الفهرس + إضافة) · `LendingDesk` (إعارة/إرجاع) · `BookingManager` (الحجوزات + تحديث الحالة) · `ClassVisitManager` (زيارات الفصول + كشف الحضور) · `LrcDashboard` (التقارير + توليد الشهادة `generateLRCCertificate`) · `LrcQualityForms` (بوّابة الجودة المُبوّبة بالمستأجر + `topStudentName`) · رسالة العملية (`state.msg`) · حالات التحميل/الفارغة داخل المكوّنات · استعلامات Supabase وServer Actions في `_actions.ts` (غير مُمسوسة).

### قيود متبقية
- العروض السبعة تبقى **تبويبات داخل الصفحة** (تشترك في حالة `useLRC` الواحدة) لا مسارات منفصلة — قرار مقصود (تجزئتها لمسارات يكرّر الجلب ويخاطر بالحالة؛ يطابق نمط الأخوة). نقر «الرئيسية» في الشريط الجانبي يبقى على `/lrc`.
- مكوّنات أبناء LRC (`BookList`/`LendingDesk`/`BookingManager`/`ClassVisitManager`/`LrcDashboard`) ما زالت تستورد `components/ui/Card` القديمة داخلياً — على-العلامة بصرياً، تُرقَّى لاحقاً (§6/§8).

---

## ✅ UI Unification Sprint 3 — مواءمة شؤون الطلاب (2026-06-18)

> **الهدف:** مواءمة `/student-affairs` مع نظام التصميم الموحّد مع **الحفاظ على كل التدفّقات الحيّة والخطّافات والإجراءات والرسوم البيانية**. النتائج: `npm run lint` صفر · `npm run build` **63/63** · `tsc --noEmit` نظيف · بلا تغيير DB/RLS/migrations/Edge/auth/persona/مفاتيح الأدوار/التبعيات.

### البنية قبل التعديل (الحاجز الفعلي = صدفة مزدوجة)
الـ`layout.tsx` كان **يغلّف الأبناء بـ`RoleDashboardShell` مسبقاً**، لكن `page.tsx` كان يبني **صدفة ثانية كاملة بداخلها**: ترويسة sticky زجاجية (شعار بتوهّج متدرّج + علامة + زر فرسان الانضباط + مبدّل وكيل/مرشد + جرس) + **مُتنقّل عائم سفلي ثابت**. فكانت `/student-affairs` تعرض **ترويستين ونظامي تنقّل متنافسين**. الجسم كان كثيف الزجاج (`glass-panel`/`glass-card`/`var(--glass-*)`/`var(--text)`/`var(--primary)`/`rounded-[2.5rem]`/[3rem]/أرقام `italic`).

### ما تغيّر
- **`app/student-affairs/page.tsx`**: حُذفت الصدفة الثانية بالكامل (الترويسة الزجاجية sticky + المُتنقّل العائم الثابت + الجرس + غلاف `glass-panel rounded-[2.5rem]`). صار: `PageHeader` (العنوان + إجراءات = مبدّل وكيل/مرشد + زر فرسان الانضباط) + `SegmentedTabs` للتبويبات الداخلية (الرئيسية · العهد · السجلات · التوقيعات + الإحالات للمرشد) + تنبيه `state.msg` برموز التصميم. تبويبا «السجلات»/«التوقيعات» أُعيد تصميمهما (`DashboardSection` لدليل الطلاب + `EmptyState` صادقة بدل الحالات الزجاجية المنقّطة).
- **`app/student-affairs/_components/StudentAffairsDashboard.tsx`**: المؤشّر المتناوب (rotating hero) أُزيل منه التدرّج/التوهّج/`italic`/`rounded-[3rem]` وبقي سلوك التناوب وقيمه الحقيقية في بطاقة token نظيفة. بطاقات KPI الأربع (`KPICard` المحلّي المكرّر) → `MetricCard` + `DashboardGrid`. ألواح الأقسام الأربعة (طابور التأخّر · اتجاهات الانضباط · رادار الخطر · مجرى الإجراءات) → `DashboardSection`. **الرسم البياني Recharts (`BarChart`/`ChartContainer`) وأزرار `DeepDiveModal` والاشتقاقات بقيت حرفياً.**

### الصدفة/التكرار المُزال
ترويسة sticky يدوية · مُتنقّل عائم ثابت (`NavBtn`) · جرس زخرفي · غلاف `glass-panel rounded-[2.5rem]` · بطاقتا `KPICard` المحلّيتان (تكرار لـ`MetricCard`) · أصناف `var(--glass-*)`/`glass-panel`/`glass-card`/`var(--text)`/التدرّجات/`italic`/الأنصاف القطرية المفرطة.

### الوظائف الحيّة المحفوظة (بلا كسر)
`useStudentAffairs` (كل الحالة + الإجراءات) كما هو · مبدّل منظور الدور (vp/counselor) + `canonicalRole` + تأثير إخفاء «الإحالات» عن الوكيل · لوحة المؤشّرات + الرسوم (Recharts) + `DeepDiveModal` · ملخّصات الحضور والغياب والتأخّر · الإحالات السلوكية (`CounselorWorkbench`) · رادار الخطر/المخاطر · العهد (`AssetTracker`) · ملفات الطلاب (`StudentProfileCard`) · التوقيعات (`ContractSigner`) · لوحة الحضور (`AttendanceBoard`) · `AIInsightCard` · `DisciplineKnightsModal` · كل Server Actions وSupabase queries في `_actions.ts`/الخطّاف (غير مُمسوسة) · حارس الدور `student_affairs_vp` في `layout.tsx` (غير مُمسوس).

### ما تُرك دون تغيير ولماذا
مكوّنات التبويبات العميقة (`AttendanceBoard` · `AssetTracker` · `CounselorWorkbench`/`ReferralInbox` · `StudentProfileCard` · `ContractSigner` + المودالات `AbsenceModal`/`LeaveModal`/`StudentExitModal`/`ActionRecorder`/`BulkUploadModal`) ما زالت تستخدم بعض الزجاج داخلياً — تعمل وعلى-العلامة بصرياً؛ توحيدها العميق دفعة لاحقة (نطاق Sprint 3 = إزالة الصدفة المزدوجة + توحيد اللوحة الرئيسية، لا إعادة كتابة الوحدة كاملةً). **ملاحظة ملكية الجودة (تصحيح):** `student_affairs_vp` **دور مالك لنماذج الجودة** — مُدرَج في `QUALITY_FORM_OWNER_ROLES` (`lib/quality/quality-forms.ts`)، وقوالبه (`student_affairs` · أكواد `QF71-C-*`) مُسجَّلة وسطحه مربوط منذ **Phase 3D-3**. الأدوار المُستثناة من ملكية نماذج الجودة هي فقط: `school_affairs_vp` · `teacher` · `student` · `parent`. لكن **الصفحة الرئيسية لشؤون الطلاب لم تكن تعرض سطح الجودة كتبويب** — لا قبل هذا التعديل ولا بعده: مكوّنات `_components/quality` و`_components/reports` (مثل `StudentAffairsReports`/`QualityForms`) **غير مستوردة في `page.tsx`** (تحقّق: صفر مستورِد). لذلك هذا الـSprint **لم يُضِف ولم يُخفِ** أي سطح جودة، ولم يُحقَن `QualityOwnerPanel` (تجنّباً لسطح وهمي). توحيد سطح جودة شؤون الطلاب وربطه بالصفحة = عمل لاحق منفصل.

---

## 1) الصفحات المُدقَّقة (13)

`/principal` · `/educational` · `/student-affairs` · `/secretary` · `/qa` · `/health` · `/science` ·
`/activity` · `/counselor` · `/lrc` · `/staff-evaluation` · `/classroom` · `/school/[id]/dashboard`.

أداة التدقيق: قراءة متوازية (13 وكيل) لكل صفحة + تخطيطها، لتحديد: استخدام الصدفة · أنماط البطاقات
المتكرّرة · الأصناف القديمة/خارج العلامة · تسريبات العلامة · منطق الأعمال الواجب الحفاظ عليه · مستوى
خطر إعادة الهيكلة.

**اكتشاف رئيسي:** الصدفة الموحّدة (`RoleDashboardShell`/`SchoolDashboardShell`) **مُطبَّقة مسبقاً**
على كل هذه المسارات (عبر `layout.tsx` أو داخل الصفحة لمسارات `SHELL_EXACT`). الفجوة الحقيقية كانت في
**جسم الصفحات**: ثلاثة أنظمة بصرية متعايشة — (أ) `KPICard`/`Card` قديمة (`surface-block`/`text-text-*`)
في `/principal`؛ (ب) glassmorphism + ألوان خارج العلامة (`cyan`/`emerald`/`sky`) في science/qa/activity/
health/secretary/counselor؛ (ج) نمط فاتح نظيف في `/educational` و`/school/[id]/dashboard` (المرجع).

---

## 2) الصفحات المُوحَّدة بالكامل (8)

| الصفحة | ما تمّ | منطق الأعمال المحفوظ كما هو |
| --- | --- | --- |
| `/educational` | جسم كامل → `PageHeader` (حالة فارغة صادقة) + `DashboardGrid` + `ActionCard` + `QualityOwnerPanel`. أُزيل `border-stone-200`/`bg-white/85`/`rounded-[2rem]`. | حارس `layout` (academic_vp) · `QualityOwnerPanel module="academic"` · روابط الوحدات. |
| `/staff-evaluation` | `PageHeader` + `DashboardGrid`/`MetricCard` (4 مؤشّرات) + `EmptyState`. CTA → primary teal. | استعلام `staff_evaluations` (school_id) · حارس persona · حارس 42P01 · `canCreate` · قواميس الحالة/المستوى. |
| `/science` | جسم كامل → `PageHeader` + `SegmentedTabs` + `DashboardSection` + `MetricCard` + تنبيه token. cyan→teal. أُزيل حقل بحث وهمي معطّل. | `useScience` · `RequestModal`/`BookingList`/`InventoryList` · `QualityOwnerPanel module="science"`. |
| `/qa` | `PageHeader` + `DashboardGrid`/`MetricCard` + `DashboardSection` + `EmptyState`. sky/emerald/glass → tokens. مخطّط الأعمدة `.qa-bar` محفوظ. | `useQA` · مشتقّات الإحصاء · `AIInsightCard` · `ObservationList` · `DisciplineKnightsModal` · روابط corrective-action. |
| `/secretary` | `PageHeader` + `MetricCard` + `SegmentedTabs` + `ActionCard` + `DashboardSection`. | `useSecretary` + الإجراءات الخمسة · `CorrespondenceTable`/`LeaveRequestForm`. |
| `/activity` | جسم كامل داخل `RoleDashboardShell` (SHELL_EXACT محفوظ) → `PageHeader` + `SegmentedTabs` + `MetricCard` + تنبيه token. | `useActivities` + المكوّنات الخمسة + التبويبات. |
| `/counselor` | `PageHeader` + `MetricCard` + `SegmentedTabs` (3 تبويبات). أُزيل `TabBtn` (zinc-800 داكن) وtokens خام. | `useCounselor` · `CaseList`/`SessionList`/`QualityForms` (بوّابة المستأجر) · `AIInsightCard` · المودال. |
| `/health` | `PageHeader` + `SegmentedTabs` + `MetricCard` + `DashboardSection` (استبدلت `Card` القديمة). glass/`var(--text)` → tokens. | `useHealth` (8 جداول) + 8 إجراءات · `LogVisitModal` · `ExportButtons` (PDF QF-70-j) · تدفّق التبويبات. |

**ملاحظات صدق البيانات أثناء التوحيد (بلا تزوير جديد):**
- `/secretary`: حُذفت شارة «متصل» الوهمية الدائمة + بطاقتا «تحديثات ذكية» الوهميّتان + بطاقة «14 نموذج QF»
  ذات الزر المعطّل؛ واستُبدلت بطاقة النماذج بـ **`QualityOwnerPanel module="secretary"` الحقيقي**
  (مُبوّب بسجلّ المستأجر · fail-closed).

---

## 3) الصفحات المُوحَّدة جزئياً (2)

| الصفحة | ما تمّ | ما تبقّى / السبب |
| --- | --- | --- |
| `/principal` | `PageHeader` + **شبكة مؤشّرات حقيقية** (6 مقاييس من `usePrincipalKPIs`) + شبكة `ActionCard` للهيكل التنظيمي (تنقّل حقيقي) + `DashboardSection`. أُزيلت بطاقات `surface-block`/التوهّج القديمة وتغليف `<main>` المزدوج. | حُذفت أقسام **التحليلات الوهمية** المُثبَّتة مسبقاً (خرائط حرارية · سجل نشاط حي · تحصيل أكاديمي · تفاعل 88%) واستُبدلت بـ `EmptyState` صادقة — التزاماً بقاعدة صدق البيانات. الربط بمصادر حقيقية = دفعة لاحقة. حُفظ: `usePrincipalKPIs` · جلب `classes` · `AIInsightCard` · `QualityOwnerPanel` · `SentinelDashboard` · المودالان. |
| `/classroom` | `PageHeader` (متوسّط) + `ActionCard` لبطاقات الفصول + `EmptyState`. أُزيلت الأنصاف القُطرية المفرطة والتأثيرات الزخرفية (blur-in/gradient-sweep/animate-pulse). | `GlassSkeleton` (محمّل) أُبقي (يعمل فاتحاً · إعادة تسميته دفعة لاحقة). حُفظت استعلامات Supabase وكشف الحصّة المباشرة وروابط `/classroom/{id}` وحارس المعلم. |

---

## 4) الصفحات غير المُغيَّرة ولماذا (الآن 1 — بعد إغلاق `/lrc` (S2) و`/student-affairs` (S3))

| الصفحة | السبب |
| --- | --- |
| ~~`/student-affairs`~~ | ✅ **مُنجز في Sprint 3** — أُزيلت الصدفة المزدوجة، ووُحِّدت اللوحة الرئيسية على الـ kit (انظر قسم Sprint 3 أعلاه). مكوّنات التبويبات العميقة دفعة لاحقة. |
| ~~`/lrc`~~ | ✅ **مُنجز في Sprint 2** — رُحِّل إلى `RoleDashboardShell` (انظر قسم Sprint 2 أعلاه). |
| `/school/[id]/dashboard` | **المرجع المعتمد.** هو أنظف تعبير عن النمط الفاتح (مكوّنات خادمية مضمّنة سليمة على tokens). بُنيت مكوّناتي المشتركة **على غراره**؛ تحويله لاستيرادها (إزالة التكرار) آمن لكنه كبير (487 سطراً، مكوّنات خادمية) → دفعة لاحقة. يستخدم `SchoolDashboardShell` (صدفة المستأجر) لا `RoleDashboardShell` — وهذا صحيح معمارياً. |

---

## 5) المكوّنات المشتركة المُنشأة/المُحدَّثة

**جديدة — `components/dashboard/`:**

| المكوّن | الدور |
| --- | --- |
| `PageHeader` | ترويسة موحّدة (أيقونة/kicker/عنوان/فرعي/إجراءات/trailing · متغيّر مُوسّط). |
| `DashboardSection` | حاوية قسم معنونة (تستبدل glass-card/surface-block/rounded-[2.5rem]). |
| `MetricCard` | بطاقة مؤشّر (تستبدل `KPICard` القديمة) · 6 نغمات tokens · رابط اختياري. |
| `ActionCard` | بطاقة إجراء/تنقّل (href/onClick/comingSoon) · سهم RTL. |
| `EmptyState` | حالة فارغة/غير-مفعّلة صادقة (قاعدة صدق البيانات). |
| `DashboardGrid` | شبكة استجابية (2/3/4 أعمدة). |
| `RoleWelcomeCard` | ترويسة ترحيب مدفوعة بإعداد الدور (فوق `PageHeader`). |
| `SegmentedTabs` | مبدّل تبويبات شريطي (يستبدل أشرطة glass-panel/bg-white في science/health/secretary/activity/counselor). |
| `tones.ts` | نغمات موحّدة (primary/info/success/warning/danger/muted) → tokens فقط. |
| `index.ts` | برميل تصدير. |

**جديدة — `lib/dashboard/role-dashboard.ts`:** طبقة إعداد لكل دور (العنوان · الفرعي · وحدة الجودة المملوكة)
— تنقل الاختلافات إلى بيانات بدل `if role === ...`. تحترم ملكية الأدوار (`QUALITY_FORM_OWNER_ROLES`)
وتستثني `school_affairs_vp`/teacher/student/parent من ملكية نماذج الجودة (qualityModule: null).

**مُعاد استخدامها (consolidate لا تكرار):** `components/ui/StatusBadge.tsx` + `components/ui/Pill.tsx`
(مُوائمتان مع tokens مسبقاً) للشارات/الحالات · `components/quality/QualityOwnerPanel.tsx` لسطح نماذج الجودة.

---

## 6) الأنماط المفردة المتبقّية (للدفعة التالية)

- **`KPICard` (legacy)** ما زال مستخدَماً في صفحتين مؤجَّلتين فقط: `app/classroom/analytics/page.tsx`
  و`app/student-affairs/_components/StudentAffairsDashboard.tsx`. (أُزيل من 6 صفحات هبوط.) لا يُحذف بعد لأنه ما زال مستخدَماً.
- **`components/ui/Card.tsx` (legacy `surface-block`)** ما زال مستخدَماً داخل مكوّنات أبناء (ليست أجسام
  الصفحات): `app/health/_components/*` · `app/lrc/_components/*` · `app/qa/_components/ObservationList.tsx` ·
  `app/science/_components/InventoryList.tsx` · `app/secretary/_components/*` · `app/principal/analytics/_components/SentinelDashboard.tsx` ·
  `app/parent/[studentId]` · `app/platform/schools/*` · `app/platform/verify-phase2`.
- **glassmorphism متبقٍّ** في: `app/student-affairs/_components/*` (مكوّنات التبويبات العميقة — `page.tsx` و`StudentAffairsDashboard.tsx` وُحِّدا في Sprint 3) · `app/classroom/analytics` · `app/classroom/[grade]/[section]` ·
  `app/classroom/_components/*` · `app/meetings/*` · `app/qa/corrective-action/new/CorrectiveActionWizard.tsx` ·
  `app/school/[id]/{setup,classroom,classroom/new}` · `app/counselor/_components/QualityFormWrapper.tsx` · ملفات `loading.tsx`.
- **`app/platform/automation/*`** ما زال على `surface-block`/`text-text-*` (منطقة المنصّة — خارج نطاق صفحات الأدوار).

---

## 7) صفحات منعت بنيتُها التوحيد الآمن (Blockers)

| الحاجز | المسار الدقيق | السبب |
| --- | --- | --- |
| ~~**صدفة `/lrc` يدوية**~~ | `app/lrc/_components/LrcWorkspace.tsx` | ✅ **حُلّ في Sprint 2.** أُزيلت الصدفة اليدوية ورُحِّلت إلى `RoleDashboardShell`؛ العروض السبعة صارت `SegmentedTabs` داخل الصفحة (تشترك في حالة `useLRC`) — دون كسر الخطّاف ولا بوّابة الجودة ولا مولّد الشهادة. |
| ~~**شجرة `/student-affairs`**~~ | `app/student-affairs/page.tsx` + `StudentAffairsDashboard.tsx` | ✅ **حُلّ في Sprint 3.** أُزيلت الصدفة المزدوجة (ترويسة + مُتنقّل عائم) ووُحِّدت اللوحة الرئيسية (`PageHeader`/`SegmentedTabs`/`MetricCard`/`DashboardSection`) مع حفظ Recharts والخطّاف والإجراءات. مكوّنات التبويبات العميقة (`AttendanceBoard`/`AssetTracker`/`CounselorWorkbench`/...) دفعة لاحقة. |
| **مرجع `/school/[id]/dashboard`** | `app/school/[id]/dashboard/page.tsx` | 487 سطراً من المكوّنات الخادمية المضمّنة الصحيحة؛ تحويلها لاستيراد المكوّنات المشتركة كبير الحجم (يُفضَّل بعد استقرار الـ kit) ويجب إبقاء عائلتي الصدفة (`SchoolDashboardShell` vs `RoleDashboardShell`) متّسقتين. |

---

## 8) الدفعة التالية الموصى بها

1. ✅ **`/lrc`** — **مُنجز (Sprint 2):** رُحِّل إلى `RoleDashboardShell` + `SegmentedTabs`.
2. ✅ **`/student-affairs`** — **مُنجز (Sprint 3):** إزالة الصدفة المزدوجة + توحيد اللوحة الرئيسية مع حفظ التدفّقات الحيّة.
3. **UI Unification Sprint 4 — مكوّنات تبويبات شؤون الطلاب العميقة:** توحيد `AttendanceBoard`/`AssetTracker`/`CounselorWorkbench`/`ReferralInbox`/`StudentProfileCard`/`ContractSigner` + مودالاتها على الـ kit (إزالة بقايا الزجاج). **(التالي المُوصى به.)**
3. **`/school/[id]/dashboard`**: تحويل مكوّناته المضمّنة لاستيراد الـ kit المشترك (إزالة التكرار).
4. **مكوّنات الأبناء على `ui/Card` القديمة**: ترقية `health/_components` · `lrc/_components` · `qa/ObservationList` · `science/InventoryList` · `secretary/_components` إلى `DashboardSection`/tokens.
5. **`/classroom/analytics` و`/classroom/[grade]/[section]`** و**`/meetings/*`** و**`qa/corrective-action` wizard**: إزالة glassmorphism المتبقّي.
6. **`/platform/automation`**: ترحيل عن `surface-block`/`text-text-*` (ضمن توحيد منطقة المنصّة).
7. حذف `KPICard` و`Card` القديمتين بعد إخلاء آخر مستهلكيهما.

---

## 9) التحقّق

| الفحص | النتيجة |
| --- | --- |
| `npm run lint` | **صفر** أخطاء/تحذيرات. |
| `npm run build` | **نجح — 63/63 صفحة**، صفر أخطاء TypeScript. |
| تسريب علامة قديمة في الملفات المعدّلة | **صفر** (`School OS`/`Sidra OS`/`SMART SCHOOL OS`/`Antigravity`/`سِدرة OS`). العلامة المرئية «سِدرة» فقط. |
| صفحات تتجاوز `RoleDashboardShell` خطأً | **لا يوجد.** `/lrc` (S2) و`/student-affairs` (S3) صارا على الصدفة الموحّدة؛ لم تَعُد أي صفحة تكرّر مسؤوليات الصدفة. |
| تكرار أنماط بطاقات محلية | مُجمَّعة في `components/dashboard/*`؛ المتبقّي في الأبناء/المؤجَّلات (§6). |
| DB/RLS/migration/auth/persona/role-key/dependency | **بلا أي تغيير** — التعديلات في `app/**/page.tsx` (10) + `components/dashboard/` + `lib/dashboard/` فقط. |

**تأكيد:** الاختلافات بين الأدوار صارت تُدار عبر **المحتوى/الودجِت/الإعداد** (`role-dashboard.ts` + props
المكوّنات المشتركة + لوحات الجودة المُبوّبة بالمستأجر) — لا عبر أنظمة بصرية منفصلة.
