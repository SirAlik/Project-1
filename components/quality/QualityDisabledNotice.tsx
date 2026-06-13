import React from 'react';
import { FileWarning } from 'lucide-react';

/**
 * حالة فارغة صادقة: المدرسة الحالية لا تملك برنامج جودة مُفعَّلاً لهذه الوحدة.
 * تُعرض بدل قوالب مستأجر آخر (fail-closed) — لا تُعرض قوالب الفلاح لمستأجر غير مُسجَّل.
 * تُستخدم عندما يُرجع سجلّ المستأجرين (lib/quality/tenant-templates.ts) قائمة فارغة.
 */
export function QualityDisabledNotice({ moduleLabel }: { moduleLabel?: string }) {
    return (
        <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm" dir="rtl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <FileWarning className="h-6 w-6" />
            </div>
            <h3 className="text-base font-black text-foreground">نماذج الجودة غير مفعّلة لهذه المدرسة</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                لا يوجد برنامج جودة مُسجَّل لمدرستك{moduleLabel ? ` لوحدة ${moduleLabel}` : ''}.
                تُفعَّل نماذج الجودة الرسمية لكل مدرسة على حدة.
            </p>
        </div>
    );
}
