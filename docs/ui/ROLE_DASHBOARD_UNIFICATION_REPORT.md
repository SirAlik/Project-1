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

## ✅ UI Unification Sprint 4 — تنظيف مكوّنات شؤون الطلاب العميقة (2026-06-18)

> **الهدف:** مواءمة مكوّنات تبويبات `/student-affairs` العميقة مع الـ kit، **بلا تغيير منطق أعمال/بيانات/إجراءات/رسوم**. النتائج: `git diff --check` نظيف · `npm run lint` صفر · `npm run build` **63/63** · `npx tsc --noEmit` نظيف · بلا تغيير DB/RLS/migrations/Edge/auth/persona/مفاتيح الأدوار/التبعيات.

### المكوّنات المفحوصة (12) والقرار
| المكوّن | الحالة | القرار |
| --- | --- | --- |
| `AttendanceBoard` | على-العلامة جزئياً (أنصاف قطرية مفرطة + توهّج) | ✅ نُظِّف |
| `AssetTracker` | زجاج ثقيل (`white/80`·`stone`·`indigo`·`emerald`·`rose`·`divide-zinc-800` تسريب داكن) | ✅ نُظِّف |
| `CounselorWorkbench` | زجاج ثقيل (`stone-100`·`indigo`·`emerald`·`white/80`·`rounded-[3rem]`·italic) | ✅ نُظِّف |
| `ReferralInbox` | زجاج (`card/40`·`backdrop-blur`·`rounded-[2.5rem]`·italic·نصوص إنجليزية) | ✅ نُظِّف |
| `StudentProfileCard` | زجاج (`stone-100`·`indigo`·`blur`) + **عطل رؤية** `text-rose-200/60` + أثر بحث شارد | ✅ نُظِّف + إصلاح |
| `ContractSigner` | زجاج (`white/80`·`stone`·`indigo`·`emerald`·`zinc`) | ✅ نُظِّف |
| `StudentExitModal` | زجاج (`bg-white/95`·`stone-100`·`indigo`·`rounded-[3rem]`) | ✅ نُظِّف |
| `ActionRecorder` | زجاج (`bg-white/95`·`stone`·`emerald`·`rounded-[3rem]`) | ✅ نُظِّف |
| `DeepDiveModal` | زجاج (`stone-200/70`·`white`·`indigo`·`divide-zinc-800`·rose) | ✅ نُظِّف (Recharts محفوظ) |
| `AbsenceModal` · `LeaveModal` · `BulkUploadModal` | **صفر مستورِد** داخل `/student-affairs` (كود ميت) | ⏸️ تُركت دون مساس (لا تُلمس كود ميت) |

### ما تغيّر في كل مكوّن (visual فقط)
- **AttendanceBoard:** شريط الأدوات وبطاقات الطلاب → رموز التصميم (`rounded-2xl border-border bg-card/bg-surface-soft`)؛ أُزيل توهّج `blur-[80px]` و`animate-in` والأنصاف `rounded-[2.5rem]`؛ نُقل استيراد `StudentExitModal` للأعلى. أزرار الحضور الأربعة وسلوكها كما هي.
- **AssetTracker:** الترويسة → `DashboardSection` (الأيقونة + رمز `QF71-C-3-1` + بحث في فتحة الإجراء)؛ الجدول → حدود/رموز التصميم وإصلاح تسريب `divide-zinc-800/50` → `divide-border`؛ شارات الحالة والمودال → tokens؛ النصوص الإنجليزية عُرِّبت.
- **CounselorWorkbench:** بطاقتا الإحصاء → `DashboardGrid`+`MetricCard`؛ غلاف القائمة → `DashboardSection`.
- **ReferralInbox:** الترويسة → `DashboardSection` (بحث في فتحة الإجراء)؛ الحالة الفارغة → `EmptyState`؛ البطاقات → رموز التصميم؛ نُقل استيراد `ActionRecorder` للأعلى؛ عُرِّبت النصوص.
- **StudentProfileCard:** البطاقة والأقسام → رموز التصميم؛ **أُصلح عطل الرؤية** `text-rose-200/60` → `text-foreground/80`؛ **أُزيل أثر حقل بحث شارد غير وظيفي** في قسم الملاحظات الصحية؛ عُرِّبت عناوين/تسميات الأقسام (**مفاتيح حقول البيانات `keyof StudentProfile` لم تُمَس**).
- **ContractSigner:** الترويسة → `DashboardSection`؛ القوائم/التفاصيل/الفارغة → رموز التصميم/`EmptyState`.
- **StudentExitModal · ActionRecorder · DeepDiveModal:** كروم المودال → رموز التصميم (الغطاء `bg-foreground/30` بدل `bg-white/95`، اللوحة `rounded-2xl border-border bg-card`)؛ **في DeepDiveModal: Recharts (`BarChart`/`Cell`/ألوان `entry.color`) و`useMemo` و`getChartData`/`getTitle`/`FilterChip` محفوظة حرفياً**؛ أُصلح تسريب `divide-zinc-800/50`.

### الأنماط القديمة المُزالة
`glass-panel`/`glass-card`/`backdrop-blur` الزخرفي · `bg-white/80`/`bg-white/95`/`stone-100/200/500/600/700` · `indigo-500`/`emerald-500`/`rose-500`/`zinc-700/800` · `hsla(var(--accent-primary))` · `rounded-[3rem]`/`rounded-[2.5rem]`/`rounded-[2rem]` · `italic` العرض · `blur-[80px]`/`blur-[100px]` · `animate-in` · **تسريبا الوضع الداكن** `divide-zinc-800/50` (في AssetTracker وDeepDiveModal). **تحقّق:** صفر صنف قديم متبقٍّ في الملفات التسعة.

### الوظائف الحيّة المحفوظة
كل props من `page.tsx`/المكوّنات الأب · `useStudentAffairs` غير مُمَسّ · الحضور/التأخّر/الاستئذان (+ `onMark`/`onRecordExit` + `StudentExitModal`) · العهد (`onIssue`/`onReturn` + prompt + مودال) · الإحالات (`onSend`/`onResolve`/`onEscalate` + prompt + `ActionRecorder`) · ملف الطالب (`isEditing`/`formData`/`onUpdate` + `medical_notes`) · التوقيع (`onSign` + confirm) · Recharts/`ChartContainer`/`DeepDiveModal` · البحث/الفلاتر · حالات التحميل/الفارغة/الخطأ.

### ما تُرك دون تغيير ولماذا
`AbsenceModal`/`LeaveModal`/`BulkUploadModal` (صفر مستورِد — كود ميت؛ لا يُلمس لتجنّب مخاطرة بلا فائدة، يُوثَّق). فلاتر `DeepDiveModal` (7d/30d/all) **تجميلية مسبقاً** (لا تُصفّي البيانات) — أُبقيت كما هي بصدق (لم تُضَف وظيفة وهمية ولم تُحذف). استدعاءات `prompt()`/`confirm()` (UX قائم) أُبقيت كما هي (تغيير سلوكها خارج نطاق التنظيف البصري).

---

## ✅ إصلاح أعطال وقت التشغيل في شؤون الطلاب (2026-06-18 · بعد Sprint 4)

> ثلاثة أعطال متصفّح أبلغ عنها المالك — كلّها **سابقة لـ Sprint 4** (تنظيف Sprint 4 بصري فقط ولم يلمس استعلامات/ذكاء/منطق). أُصلح ما هو كود؛ ووُثّق ما هو إعداد بيئة. **بلا** تغيير DB/RLS/migrations/auth/persona/مفاتيح الأدوار/التبعيات/`.env`.

### 1) خطأ `column student_profiles_1.student_id does not exist` — مُصلَح
- **السبب الجذري (مؤكَّد من المخطّط الحيّ):** جدول `public.student_profiles` **لا يحوي عمود `student_id`** (`has_student_id_column=false`)؛ المعرّف الفعلي هو `national_id` (`has_national_id_column=true`). كان `useStudentAffairs` يطلب عموداً غير موجود في embed.
- **الإصلاح (app-code فقط، بلا لمس DB):** alias في PostgREST — `national_id` يُعرض باسم `student_id`:
  - `loadAttendance` + `loadReferrals`: `student:student_profiles(name, student_id:national_id)`.
  - `loadStudents`: `select('*, student_id:national_id')` (اتّساق العرض في القوائم والبطاقات).
- **الأثر:** نوع `StudentProfile` يبقى كما هو؛ المكوّنات تقرأ `student_id` دون تغيير. DB الحيّة = 0 صفوف (ما قبل الإطلاق) → الاستعلام المُصلَّح يُعيد `[]` (حالة فارغة صادقة)، لا خطأ.

### 2) خطأ مزوّد الذكاء «فشل توليد الرؤية من Claude API» — إعداد بيئة، لا عطل كود
- **السبب الجذري:** `AIInsightCard` المشترك (يُعرَض في 6 صفحات: counselor · health · lrc · principal · qa · student-affairs) يستدعي `generateInsight`؛ و`callClaudeAPI` يُعيد `null` حين **`ANTHROPIC_API_KEY` غير مضبوط** (`.env.example:18` يوثّقه فارغاً = «مطلوب لطبقة ai_insights»). القوالب موجودة ونشطة (تأكيد حيّ) → الفشل ليس «لا يوجد قالب» بل نداء Claude. الرسالة **صادقة** (لا ذكاء وهمي · لا إخفاء · زر إعادة محاولة).
- **التحسين (app-code، صدق الخطأ):** أُضيف حارس fail-closed في `generateInsight` + `generateInsightSystem` يُميّز **غياب المفتاح** برسالة صريحة «طبقة الذكاء غير مُفعّلة: مفتاح ANTHROPIC_API_KEY غير مضبوط في البيئة» بدل الرسالة العامة التي تُوهم بانقطاع الخدمة. إضافي بحت (لا تغيير سلوك عند وجود المفتاح).
- **الإجراء المطلوب من المالك (خارج صلاحية الوكيل — ممنوع لمس `.env`):** ضبط `ANTHROPIC_API_KEY` (واختيارياً `AI_MODEL`، الافتراضي `claude-sonnet-4-6`) في `.env.local`/بيئة Vercel.

### 3) إزالة مبدّل المنظور داخل الصفحة (وكيل الشؤون / الموجه الطلابي) — مُزال
- صفحة `/student-affairs` لوكيل شؤون الطلاب (`student_affairs_vp`). أُزيل مبدّل «وكيل الشؤون/الموجه الطلابي» من ترويسة الصفحة (كان منظوراً مزدوجاً داخل الصفحة). المنظور الآن = دور الـ persona الفعلي فقط؛ منظور الموجه له صفحته المستقلة `/counselor`.
- **التنفيذ:** `const [role] = useState<Role>("vp")` بلا مُبدِّل (يبقى ثابتاً «vp»؛ فروع المرشد محفوظة كمسار خامل دون حذف منطق، بلا أخطاء TS). `canonicalRole = student_affairs_vp`. حُذف زرّا التبديل من `PageHeader.actions` (بقي زر «فرسان الانضباط»).

### التحقّق
`npx tsc --noEmit` نظيف · `npm run lint` صفر · `npm run build` **63/63** · `git diff --check` نظيف. **تشغيل محلي:** خادم التطوير يخدم (`GET /` → 200)؛ `GET /student-affairs` → **307 إلى `/login`** (حارس المصادقة يعمل بلا انهيار). **قيد التحقّق البصري:** عرض الصفحة المُصادَق عليها يتطلّب جلسة `student_affairs_vp` وبيانات — غير متاح للوكيل (ما قبل الإطلاق · صفر مستخدمين · صفر بيانات)؛ لذا أُثبتت الإصلاحات على مستوى المخطّط الحيّ + الاستعلام + الكود بدل لقطة متصفّح مُصادَقة.

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

- **`components/ui/KPICard` (legacy) صار يتيماً (صفر مستورِد)** بعد ترحيل `StudentAffairsDashboard` إلى `MetricCard` (Sprint 3). `app/classroom/analytics/page.tsx` يستخدم **دالة `KPICard` محلّية** (ليست المشتركة). فالمشترك `components/ui/KPICard` قابل للحذف الآمن في تنظيف لاحق.
- **`components/ui/Card.tsx` (legacy `surface-block`)** ما زال مستخدَماً داخل مكوّنات أبناء (ليست أجسام
  الصفحات): `app/health/_components/*` · `app/lrc/_components/*` · `app/qa/_components/ObservationList.tsx` ·
  `app/science/_components/InventoryList.tsx` · `app/secretary/_components/*` · `app/principal/analytics/_components/SentinelDashboard.tsx` ·
  `app/parent/[studentId]` · `app/platform/schools/*` · `app/platform/verify-phase2`.
- **glassmorphism متبقٍّ** في: `app/classroom/analytics` · `app/classroom/[grade]/[section]` ·
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
2. ✅ **`/student-affairs`** (اللوحة الرئيسية) — **مُنجز (Sprint 3).**
3. ✅ **مكوّنات شؤون الطلاب العميقة** — **مُنجز (Sprint 4):** 9 مكوّنات/مودالات نُظِّفت على الـ kit.
4. **حذف `components/ui/KPICard` اليتيم** (صفر مستورِد بعد Sprint 3) — تنظيف آمن. **(التالي المُوصى به.)**
5. **`/school/[id]/dashboard`**: تحويل مكوّناته المضمّنة لاستيراد الـ kit المشترك (إزالة التكرار).
6. **مكوّنات الأبناء على `ui/Card` القديمة**: ترقية `health/_components` · `lrc/_components` · `qa/ObservationList` · `science/InventoryList` · `secretary/_components` إلى `DashboardSection`/tokens.
7. **`/classroom/analytics` و`/classroom/[grade]/[section]`** و**`/meetings/*`** و**`qa/corrective-action` wizard**: إزالة glassmorphism المتبقّي.
8. **`/platform/automation`**: ترحيل عن `surface-block`/`text-text-*` (ضمن توحيد منطقة المنصّة).

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
