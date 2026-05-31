# SYSTEM CONTEXT — SCHOOL-OS / SIDRA OS

## Project Status: PRE-LAUNCH — RADICAL RESTRUCTURING PHASE

This project has **never been deployed to production**.  
There are **zero real users**. There is **zero live data**.  
Do NOT treat this codebase as a running system.

---

## Engineering Mandate

You are operating as a **Senior Software Architect** performing a
**ground-up structural overhaul** — not a maintenance engineer
protecting a live system.

### What this means in practice

| ❌ FORBIDDEN assumptions | ✅ CORRECT assumptions |
| --- | --- |
| "This might break existing users" | There are no users. Break what must be broken. |
| "Let's patch this temporarily" | No patches. Fix from the root. |
| "Add a nullable column for now" | No nullable tenant columns. Ever. |
| "We can migrate data carefully" | There is no data to migrate. |
| "Let's keep backward compat" | Backward compat with nothing is irrelevant. |

---

## Permissions Granted (Explicit)

- `DROP TABLE ... CASCADE` — **fully permitted**
- `DROP COLUMN` — **fully permitted**
- `DROP POLICY` — **fully permitted**
- Breaking schema changes — **fully permitted and encouraged**
- Destroying and rebuilding any migration — **fully permitted**
- Rewriting any file from scratch — **fully permitted**

---

## Anti-Patterns — Hard Reject

- Workarounds labeled "for now" or "temporary"
- `ALTER COLUMN ... DROP NOT NULL` on tenant columns
- Nullable `school_id` on any active table
- `-- TODO: add RLS later` comments
- Any logic that assumes real data exists in the DB

---

## Architecture North Star

- **Multi-tenant SaaS** — strict tenant isolation via `school_id NOT NULL`
- **RLS-first** — every active table must have Row Level Security enabled
- **JWT-based auth** — policies use `auth.jwt() -> 'app_metadata'`
- **Single Source of Truth** — no duplicate/legacy table coexistence

---

## Current Dependency Baseline & Upgrade Policy

The following versions are the approved architectural baseline for this project:

- Node.js: 24.x
- npm: 11.x
- Next.js: 16.2.6
- React: 19.2.6
- TypeScript: 6.x
- Zod: 4.x
- jose: 6.x
- lucide-react: 1.x
- react-dropzone: 15.x
- ESLint: 9.x — temporarily pinned because ESLint 10 is not yet compatible with the current Next.js / eslint-config-next ecosystem.

ESLint 10 must not be adopted until `eslint-config-next` and related plugins officially support it.

### Dependency Rules

- Do not downgrade dependencies unless there is a documented architectural reason.
- Do not downgrade dependencies because of AI tooling limitations, outdated examples, or personal preference.
- Any dependency upgrade must be validated against Next.js, React, TypeScript, and project build requirements.
- Significant dependency changes must be documented.
- Prefer stable releases over beta, alpha, RC, or experimental versions.
- Do not use `npm audit fix --force`.
- Do not downgrade Next.js to satisfy `npm audit`.
- Keep `package-lock.json` synchronized through `npm install`; do not manually edit it unless there is a clearly documented reason.

---

## When in doubt

Destroy and rebuild correctly.  
There is nothing to protect.  
Use the approved dependency baseline unless a documented architectural decision explicitly replaces it.

---

## التقنيات الأساسية

- **Frontend**: Next.js 16.2.6 (App Router), React 19.2.6, Tailwind CSS 4
- **Runtime**: Node.js 24.x, npm 11.x
- **Backend**: Supabase (Auth + Database + RLS)
- **Forms/Validation**: Zod 4.x, next-safe-action
- **Auth/Crypto/JWT**: jose 6.x
- **Icons**: lucide-react 1.x
- **File Upload UI**: react-dropzone 15.x
- **Type System**: TypeScript 6.x
- **Linting**: ESLint 9.x temporarily pinned
- **Animation**: Framer Motion, GSAP

---

## بنية المشروع

- `app/` — صفحات وراوتر Next.js App Router
- `lib/` — خدمات مشتركة مثل Supabase client وPBAC وcontext services
- `components/` — مكونات React
- `db/migrations/` — ترحيلات قاعدة البيانات
- `proxy.ts` — حماية المسارات (تمّت المهاجرة من `middleware.ts` لاصطلاح Next.js 16)

---

## قواعد العمل

- لا تعدّل ملفات `.env.local` أبداً
- الترحيلات في `/db/migrations` مرتبة بأرقام تسلسلية
- نمط الصلاحيات: PBAC في `lib/pbac.ts`
- لا تستخدم `git push --force` أبداً
- لغة الكود: English
- لغة التعليقات: Arabic
- لا تغيّر scripts في `package.json` لإخفاء أخطاء build أو lint
- لا تُضعف قواعد TypeScript أو ESLint من أجل تمرير الفحص شكلياً

---

## حالة تنظيف الكود (Lint Cleanup Phases)

> **الحالة الراهنة:** جميع المراحل (1–5) مكتملة بالكامل. `npm run lint` يعطي **صفر أخطاء وصفر تحذيرات**. `npm run build` ينجح بـ **61/61 صفحة** بدون أي خطأ TypeScript أو تحذيرات. اصطلاح `proxy.ts` مُطبَّق. تحذير Recharts مُصلَح معمارياً.

### ✅ المرحلة الأولى — مكتملة

- حُذف ~363 تحذير `@typescript-eslint/no-unused-vars` من 130+ ملف
- أُصلحت 3 أخطاء TypeScript مخفية كانت تمنع البناء الإنتاجي
- البناء يعمل: `npm run build` → **61/61 صفحة**، صفر أخطاء TypeScript

### ✅ المرحلة الثانية — مكتملة

- أُصلحت جميع حالات `react/no-unescaped-entities`
- أُصلحت جميع حالات `jsx-a11y/alt-text`
- أُصلحت حالات `react-hooks/exhaustive-deps` الآمنة

### ✅ المرحلة الثالثة — مكتملة

- **صفر** حالات `@typescript-eslint/no-explicit-any` متبقية
- جميع `catch (error: any)` → `catch (error: unknown)` مع `error instanceof Error ? error.message : String(error)`
- جميع نتائج Supabase JOIN مُعرَّفة بـ interfaces محلية حقيقية أو `as unknown as MyType[]`
- جميع `as any` في الكود استُبدلت بأنواع دقيقة أو `as const` أو `as unknown as TargetType`

### الأنماط المعتمدة في المرحلة الثالثة (للرجوع إليها)

```typescript
// نتائج Supabase JOIN
type JoinRow = BaseType & { joined_field: RelatedType | null };
const rows = (data ?? []) as unknown as JoinRow[];

// catch blocks
catch (error: unknown) {
    setError(error instanceof Error ? error.message : String(error));
}

// string literals → union types
type TabType = "a" | "b";
onClick={() => setTab(id as TabType)}
// أو: أضف as const على كل عنصر في المصفوفة

// props لا تُستخدم فعلياً في الجسم
user?: unknown;  // بدلاً من Record<string, unknown> أو any

// ReactNode مقابل ComponentType
icon: React.ReactNode          // للعناصر الجاهزة مثل <Icon />
icon: React.ComponentType<...> // للمكونات التي تُنشئ داخلياً مثل const I = icon; <I />
```

### ✅ المرحلة الرابعة — مكتملة

- جميع analytics hooks تستخدم نمط `startTransition(async () => { await loadData(); })` المتوافق مع React 19
- الحالة تبدأ بـ `loading: true` مباشرةً من `useState(true)` بدون `setLoading(true)` في بداية كل fetch
- لا حالات `set-state-in-effect` متبقية

### ✅ المرحلة الخامسة — مكتملة

- لا حالات `react-hooks/exhaustive-deps` متبقية
- `npm run lint` → **صفر أخطاء، صفر تحذيرات**

---

## ملاحظة أمنية — PostCSS داخل Next.js

`npm audit` قد يُظهر ثغرة في `postcss` مُدرجة كاعتمادية داخلية لـ Next.js. هذه الثغرة:

- لا يمكن إصلاحها بـ `npm audit fix --force` — سيكسر البناء.
- المسار الصحيح: انتظار تحديث رسمي من فريق Next.js.
- **ممنوع تماماً:** `npm audit fix --force` أو downgrade أي dependency بسببها.

---

## المرحلة الرابعة — set-state-in-effect (~10 أخطاء)

- تحليل كل hook على حدة — لا حل موحّد أعمى.
- State مشتقة بالكامل من props/state أخرى → استخدم `useMemo`.
- بيانات يمكن جلبها من الخادم → انقلها إلى Server Component أو server action عند ملاءمة ذلك.
- Async client fetch الضروري → أعد هيكلة الـ hook بطريقة متوافقة مع React 19 وNext.js 16 دون إخفاء الخطأ.
- لا تستخدم `void loadData()` كحل.
- لا تستخدم `eslint-disable`.
- لا تستخدم `useState(() => typeof window !== 'undefined')` لتجاوز mounted/hydration.

---

## المرحلة الخامسة — exhaustive-deps

- أضف dependencies المفقودة فقط عندما يكون ذلك آمناً.
- لا تضف dependency تسبب حلقة لا نهائية بدون إعادة هيكلة السبب.
- ثبّت الدوال بـ `useCallback` عند الحاجة.
- لا تستخدم disable comments لإسكات القاعدة.

---

## قواعد صارمة لجميع المراحل — لا استثناءات

```text
❌ eslint-disable داخل أي ملف
❌ // @ts-ignore أو // @ts-expect-error
❌ as any كحل مؤقت
❌ تضعيف قواعد ESLint في الإعداد
❌ تحويل أخطاء إلى تحذيرات لإخفائها
❌ تجاهل مجلدات كاملة من lint
❌ تعديل npm scripts لإخفاء الأخطاء
❌ void loadData() كحل لـ react-hooks/set-state-in-effect
❌ useState(() => typeof window !== 'undefined') — خطر hydration mismatch
❌ Record<string, unknown> كبديل عشوائي لنتائج JOIN — استخدم interfaces حقيقية
❌ npm audit fix --force
❌ downgrade لأي dependency بدون قرار معماري موثق
