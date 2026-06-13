import { getTemplateByCode } from '@/lib/quality/tenant-templates';

/**
 * ============================================================================
 * Quality Auto-Fill — أدوات مشتركة (Phase 3E)
 * ============================================================================
 *
 * سلسلة الدستور:
 *   إجراء تشغيلي → بيانات منظَّمة → حمولة تعبئة تلقائية → سجل generated_forms
 *   → (لاحقاً) دليل quality_evidence → تحليلات/ذكاء.
 *
 * هذا الملف **نقي** (بلا وصول DB) — حارس سجلّ المستأجر + نوع الحمولة فقط — فيصحّ استيراده
 * من الخادم والعميل. الإنشاء الفعلي للسجلات في `generated-forms.ts` و`quality-evidence.ts`
 * (وحدتان خادميّتان فقط).
 */

/**
 * هل القالب مُنفَّذ فعلياً لهذه المدرسة (يحقّ له توليد سجل/دليل رسمي)؟
 * planned (`implemented:false`) أو مدرسة غير مُسجَّلة/مجهولة → false (fail-closed).
 * لا تُولَّد سجلات/أدلة رسمية إلا لقالب مُنفَّذ.
 */
export function isImplementedTemplate(schoolId: string | null | undefined, code: string): boolean {
    const template = getTemplateByCode(schoolId, code);
    return !!template && template.implemented;
}

/** حمولة التعبئة التلقائية المنظَّمة — تُخزَّن في `generated_forms.form_data`. */
export type AutoFillPayload = Record<string, string | number | boolean | null>;
