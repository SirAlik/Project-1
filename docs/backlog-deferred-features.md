# Backlog — ميزات مؤجلة (محذوفة من UI بانتظار schema جديد)

تاريخ الإزالة: 2026-06-05

الميزات التالية أُزيلت من واجهة المستخدم لأن جداول قاعدة البيانات التي كانت تعتمد عليها
حُذفت في migration `r01_drop_legacy_tables`. لا توجد جداول بديلة محددة حتى الآن.
كل ميزة منها مشروعة كفكرة منتج وتستحق إعادة البناء من الصفر على schema جديد.

---

## 1. طلبات التوريد (Procurement Requests)
**الجدول المحذوف:** `procurement_requests`
**الملفات المحذوفة:**
- `app/secretary/_components/ProcurementForm.tsx`
- action: `submitProcurementAction` في `app/secretary/_actions.ts`

**ما يحتاجه الإعادة:**
- جدول `procurement_requests` جديد مع `school_id NOT NULL` + RLS
- نموذج إضافة/عرض مرتبط بـ Server Action حقيقي
- صلاحيات: secretary و school_principal فقط

---

## 2. خطابات التكليف (Assignment Letters)
**الجدول المحذوف:** `assignment_letters`
**الملفات المحذوفة:**
- action: `addAssignmentAction` في `app/secretary/_actions.ts`

**ما يحتاجه الإعادة:**
- جدول `assignment_letters` جديد مع `school_id NOT NULL` + RLS
- واجهة إنشاء/طباعة/أرشفة خطابات التكليف
- دمج مع `workflow_instances` لمسار الموافقة

---

## 3. تقارير نظافة الفصول (Classroom Cleaning Reports)
**الجدول المحذوف:** `cleaning_reports`
**الملفات المحذوفة:**
- `app/classroom/_components/CleaningModal.tsx`
- action: `submitCleaningReportAction` في `app/classroom/_actions.ts`

**ملاحظة مهمة:** `hygiene_logs` موجود لكنه يتتبع نظافة الطالب الشخصية (شعر، أظافر، زي)
— وليس نظافة الفصل. لا تُستخدم كبديل.

**ما يحتاجه الإعادة:**
- جدول `classroom_cleaning_reports` مستقل مع `school_id NOT NULL` + `class_id` + RLS
- نموذج تقييم + إشعار للإدارة

---

## 4. جدولة الاجتماعات من السكرتارية (Secretary Meeting Scheduler)
**الجدول الموجود:** `meeting_sessions` (موجود لكن schema مختلف)
**الملفات المحذوفة:**
- `app/secretary/_components/MeetingScheduler.tsx`
- action: `scheduleMeetingAction` في `app/secretary/_actions.ts` (محذوف)

**البديل الحالي:** رابط مباشر لـ `/meetings` في dashboard السكرتارية

**ما يحتاجه الإعادة:**
- تكييف نموذج الجدولة مع schema الجديد لـ `meeting_sessions`
- ربط السكرتارية بصلاحية إنشاء اجتماعات
- إشعارات للمدعوين عبر `notification-service`
