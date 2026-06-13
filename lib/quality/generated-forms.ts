import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { getActivePersona } from '@/lib/auth/context-service';
import { getTemplateByCode } from '@/lib/quality/tenant-templates';
import type { AutoFillPayload } from '@/lib/quality/autofill';

/**
 * ============================================================================
 * Generated Forms Service (سجلّ النماذج المُولَّدة) — Phase 3E
 * ============================================================================
 *
 * وحدة **خادمية فقط** (تستخدم createSupabaseServerClient + getActivePersona).
 * تُنشئ سجل `generated_forms` لقالب **مُنفَّذ** فقط، بسياق مستأجر موثوق server-side.
 *
 * الضمانات:
 *   - `school_id` يأتي حصراً من `getActivePersona()` — **لا يُقبَل من العميل**.
 *   - بوّابة السجلّ: القالب يجب أن يكون مُسجَّلاً + `implemented:true` لهذه المدرسة؛
 *     planned/مجهول → fail-closed (لا سجل، لا توليد).
 *   - منع التكرار عبر (`school_id`, `form_code`, `source_record_id`).
 *   - لا تُولّد PDF هنا — التوليد عبر Edge `generate-qms-pdf` عند `is_ready` (طبقة منفصلة).
 *
 * ملاحظة: `generated_forms.source_record_id` هو `uuid NOT NULL` — فالخدمة لنماذج **سجل-واحد**
 * (تقرير عدم مطابقة، محضر اجتماع، جلسة فردية…)، لا للسجلات التجميعية متعدّدة المصادر.
 */

export interface CreateGeneratedFormInput {
    /** رمز القالب — يجب أن يكون قالباً مُنفَّذاً في سجلّ المستأجر (TENANT_QUALITY_REGISTRY) */
    formCode: string;
    /** الجدول المصدر للإجراء التشغيلي */
    sourceTable: string;
    /** معرّف السجل المصدر (uuid) */
    sourceRecordId: string;
    /** حمولة التعبئة المنظَّمة */
    formData?: AutoFillPayload | Record<string, unknown>;
    /** ربط بسير عمل إن وُجد */
    workflowInstanceId?: string;
    /** هل السجل جاهز لتوليد PDF فوراً (افتراضي false) */
    isReady?: boolean;
}

export type CreateGeneratedFormResult =
    | { ok: true; id: string; deduped: boolean }
    | {
          ok: false;
          reason:
              | 'unauthenticated'
              | 'no_school_context'
              | 'template_not_registered_or_planned'
              | 'db_error';
          message?: string;
      };

export async function createGeneratedForm(
    input: CreateGeneratedFormInput,
): Promise<CreateGeneratedFormResult> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, reason: 'unauthenticated' };
    if (!persona.schoolId) return { ok: false, reason: 'no_school_context' };
    const schoolId = persona.schoolId;

    // بوّابة المستأجر: قالب مُنفَّذ فقط (planned/مجهول → fail-closed)
    const template = getTemplateByCode(schoolId, input.formCode);
    if (!template || !template.implemented) {
        return { ok: false, reason: 'template_not_registered_or_planned' };
    }

    const supabase = await createSupabaseServerClient();

    // منع التكرار — نفس النموذج لنفس السجل المصدر في نفس المدرسة
    const { data: existing } = await supabase
        .from('generated_forms')
        .select('id')
        .eq('school_id', schoolId)
        .eq('form_code', input.formCode)
        .eq('source_record_id', input.sourceRecordId)
        .limit(1)
        .maybeSingle();

    if (existing?.id) return { ok: true, id: existing.id as string, deduped: true };

    const { data, error } = await supabase
        .from('generated_forms')
        .insert({
            school_id: schoolId,
            form_code: input.formCode,
            source_table: input.sourceTable,
            source_record_id: input.sourceRecordId,
            workflow_instance_id: input.workflowInstanceId ?? null,
            form_data: input.formData ?? null,
            is_ready: input.isReady ?? false,
        })
        .select('id')
        .single();

    if (error || !data) {
        return { ok: false, reason: 'db_error', message: error?.message };
    }
    return { ok: true, id: data.id as string, deduped: false };
}
