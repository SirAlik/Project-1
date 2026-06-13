import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { supabaseAdmin } from '@/lib/db/supabase-admin';
import { getActivePersona } from '@/lib/auth/context-service';

/**
 * ============================================================================
 * QMS PDF Access (signed URLs) — Security Hardening
 * ============================================================================
 *
 * ملفات QMS PDF تُخزَّن في bucket **خاص** (`qms-forms`، public=false). لا روابط عامة.
 * الوصول يكون عبر **signed URL قصير الأجل يُولَّد server-side عند الطلب فقط** بعد التحقق
 * من صلاحية المستخدم للسجل:
 *   1) القراءة عبر العميل المُقيَّد بـ RLS (gf_select): المستخدم لا يرى إلا generated_forms
 *      لمدرسته (أو system_owner) → عزل المستأجر مفروض على مستوى الصف.
 *   2) بعد اجتياز RLS، يُولَّد signed URL عبر service_role (bucket خاص) بمدّة قصيرة.
 *
 * لا يُخزَّن رابط دائم في generated_forms.pdf_url (يبقى null)؛ storage_path هو المصدر المعتمد.
 */

const QMS_BUCKET = 'qms-forms';
const SIGNED_URL_TTL_SECONDS = 120; // دقيقتان — قصير عمداً

export type QmsPdfUrlResult =
    | { ok: true; url: string }
    | {
          ok: false;
          reason: 'unauthenticated' | 'no_school_context' | 'not_found' | 'not_ready' | 'sign_error';
      };

/**
 * يُولّد signed URL لملف PDF لنموذج مُولَّد، بعد التحقق من وصول المستخدم للسجل عبر RLS.
 */
export async function getQmsPdfSignedUrl(formId: string): Promise<QmsPdfUrlResult> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, reason: 'unauthenticated' };
    if (!persona.schoolId && !persona.isSystemOwner) {
        return { ok: false, reason: 'no_school_context' };
    }

    // قراءة مُقيَّدة بـ RLS — تفرض عزل المستأجر (نفس المدرسة أو system_owner) على السجل.
    const supabase = await createSupabaseServerClient();
    const { data: form } = await supabase
        .from('generated_forms')
        .select('id, storage_path, is_ready')
        .eq('id', formId)
        .maybeSingle();

    if (!form || !form.storage_path) return { ok: false, reason: 'not_found' };
    if (!form.is_ready) return { ok: false, reason: 'not_ready' };

    // توليد signed URL عبر service_role (bucket خاص). الوصول للسجل تحقّق أعلاه عبر RLS.
    const { data, error } = await supabaseAdmin.storage
        .from(QMS_BUCKET)
        .createSignedUrl(form.storage_path as string, SIGNED_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) return { ok: false, reason: 'sign_error' };
    return { ok: true, url: data.signedUrl };
}
