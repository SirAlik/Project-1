// ════════════════════════════════════════════════════════════════════════════
// toSafeError — رسالة خطأ عربية آمنة موحّدة للمستخدم
// ════════════════════════════════════════════════════════════════════════════
// يمنع تسريب رسائل Postgres/Supabase الخام (أسماء جداول/أعمدة/قيود/RLS/SQL) إلى
// الواجهة. التفاصيل التقنية تُسجَّل خادمياً فقط عبر console.error، ويُعاد للمستخدم
// رسالة مجال عربية آمنة. ليس إطاراً ضخماً — دالة واحدة صغيرة لإعادة الاستخدام.
//
// الاستخدام:
//   if (error) return { ok: false, error: toSafeError('[activity] createClub', error) };
//   if (error) return { ok: false, error: toSafeError('[lrc] createVisit', error, 'فشل إنشاء الزيارة') };

const DEFAULT_SAFE_MESSAGE = 'تعذّر إتمام العملية، يرجى المحاولة لاحقاً';

/**
 * يُسجّل تفاصيل الخطأ التقنية خادمياً ويُعيد رسالة عربية آمنة فقط.
 * @param context وسم السياق للسجلّ الخادمي (مثل '[health] recordVisit').
 * @param error الخطأ الخام (Error أو كائن خطأ Supabase أو غيره) — لا يُعرض للمستخدم.
 * @param userMessage رسالة المجال العربية الآمنة المُعادة للمستخدم.
 */
export function toSafeError(
    context: string,
    error: unknown,
    userMessage: string = DEFAULT_SAFE_MESSAGE,
): string {
    let detail: string;
    if (error instanceof Error) {
        detail = error.message;
    } else if (error && typeof error === 'object' && 'message' in error) {
        // كائنات أخطاء Supabase: { message, details, hint, code }
        detail = String((error as { message: unknown }).message);
    } else if (typeof error === 'string') {
        detail = error;
    } else {
        try { detail = JSON.stringify(error); } catch { detail = String(error); }
    }
    console.error(`${context}:`, detail);
    return userMessage;
}
