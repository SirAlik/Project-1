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

## 4) الصفحات غير المُغيَّرة ولماذا (3)

| الصفحة | السبب |
| --- | --- |
| `/student-affairs` | **خطر عالٍ.** تبني نظاماً بصرياً كاملاً خاصاً (ترويسة sticky + مُتنقّل عائم) **داخل** الصدفة، مع شجرة مكوّنات ضخمة (`StudentAffairsDashboard` + 5+ مكوّنات تبويب) مربوطة ببيانات حيّة (`useStudentAffairs` + 9 إجراءات + recharts). التوحيد الآمن يتطلّب إعادة هيكلة الشجرة كاملة — دفعة مخصّصة. (`student_affairs_vp` مُستثنى من ملكية نماذج الجودة — لا يُضاف `QualityOwnerPanel`.) |
| `/lrc` | **حاجز معماري (انظر §7).** الصفحة على-العلامة بالفعل لكنها **تبني صدفتها الخاصة** يدوياً بدل `RoleDashboardShell`. تبديل الصدفة محفوف بالخطر لأن حالة العرض داخل-الصفحة (`useState<LrcView>`) لا تتوافق مع التنقّل المسارِي للصدفة. |
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
- **glassmorphism متبقٍّ** في: `app/student-affairs/page.tsx` · `app/classroom/analytics` · `app/classroom/[grade]/[section]` ·
  `app/classroom/_components/*` · `app/meetings/*` · `app/qa/corrective-action/new/CorrectiveActionWizard.tsx` ·
  `app/school/[id]/{setup,classroom,classroom/new}` · `app/counselor/_components/QualityFormWrapper.tsx` · ملفات `loading.tsx`.
- **`app/platform/automation/*`** ما زال على `surface-block`/`text-text-*` (منطقة المنصّة — خارج نطاق صفحات الأدوار).

---

## 7) صفحات منعت بنيتُها التوحيد الآمن (Blockers)

| الحاجز | المسار الدقيق | السبب |
| --- | --- | --- |
| **صدفة `/lrc` يدوية** | `app/lrc/_components/LrcWorkspace.tsx` | يبني شريطاً جانبياً + علوياً + `NotificationsMenu`/`UserMenu` يدوياً (≈150 سطراً + درج جوال) بدل `RoleDashboardShell`، رغم إدراج `/lrc` ضمن `SHELL_EXACT` (`lib/navigation/shell-routes.ts:26`) مثل `/activity` و`/classroom` اللذين يُصيّران الصدفة. التبديل يتطلّب مواءمة حالة العرض داخل-الصفحة (`useState<LrcView>`: overview/books/lending/bookings/visits/reports/quality) مع تنقّل الصدفة المسارِي دون كسر `useLRC` ولا بوّابة الجودة ولا مولّد الشهادة → خطر عالٍ، دفعة مخصّصة. |
| **شجرة `/student-affairs`** | `app/student-affairs/page.tsx` + `app/student-affairs/_components/*` | نظام بصري بديل كامل (glass + مُتنقّل عائم + أرقام عرض italic) مربوط ببيانات حيّة عبر الصفحة و`StudentAffairsDashboard` و5+ مكوّنات تبويب؛ إعادة التصميم تتطلّب لمس الشجرة كاملةً مع حفظ التدفّقات الحيّة. |
| **مرجع `/school/[id]/dashboard`** | `app/school/[id]/dashboard/page.tsx` | 487 سطراً من المكوّنات الخادمية المضمّنة الصحيحة؛ تحويلها لاستيراد المكوّنات المشتركة كبير الحجم (يُفضَّل بعد استقرار الـ kit) ويجب إبقاء عائلتي الصدفة (`SchoolDashboardShell` vs `RoleDashboardShell`) متّسقتين. |

---

## 8) الدفعة التالية الموصى بها (Batch 2)

1. **`/lrc`**: استبدال الصدفة اليدوية بـ `RoleDashboardShell role="school_librarian"` + مواءمة حالة العرض مع التنقّل.
2. **`/student-affairs`**: إعادة تصميم الشجرة كاملةً على الـ kit (PageHeader/MetricCard/DashboardSection/EmptyState) مع حفظ `useStudentAffairs`/الإجراءات/recharts.
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
| صفحات تتجاوز `RoleDashboardShell` خطأً | لا جديد. الوحيد المعروف: `/lrc` (صدفة يدوية — موثّق §7). |
| تكرار أنماط بطاقات محلية | مُجمَّعة في `components/dashboard/*`؛ المتبقّي في الأبناء/المؤجَّلات (§6). |
| DB/RLS/migration/auth/persona/role-key/dependency | **بلا أي تغيير** — التعديلات في `app/**/page.tsx` (10) + `components/dashboard/` + `lib/dashboard/` فقط. |

**تأكيد:** الاختلافات بين الأدوار صارت تُدار عبر **المحتوى/الودجِت/الإعداد** (`role-dashboard.ts` + props
المكوّنات المشتركة + لوحات الجودة المُبوّبة بالمستأجر) — لا عبر أنظمة بصرية منفصلة.
