"use client";

import React from 'react';
import { FileCheck2, Clock } from 'lucide-react';
import { useAuth } from '@/app/_context/AuthContext';
import { getQualityTemplates, isQualityEnabled, type QualityModule } from '@/lib/quality/tenant-templates';
import { QualityDisabledNotice } from './QualityDisabledNotice';

/**
 * لوحة حالة نماذج الجودة لدور مالك — مُبوّبة بسجلّ المستأجر (fail-closed).
 *
 * - مدرسة غير مُسجَّلة/جودة غير مفعّلة → `QualityDisabledNotice` (لا تُعرض قوالب الفلاح لمستأجر مجهول).
 * - القوالب المخطّطة (`implemented:false`) تُعرض كـ«قيد الاعتماد» **بلا أزرار تصدير ولا توليد PDF**،
 *   مع رسالة صادقة حتى تُعتمد القوالب الرسمية من مالك المنتج. القوالب المتوفّرة تُعرض كـ«متوفّر»
 *   (حالة فقط — التصدير الفعلي يعيش في مكوّنات الوحدة المختصّة).
 * - لا أكواد QF مُختلَقة ولا PDF وهمي.
 */
export function QualityOwnerPanel({ module, moduleLabel }: { module: QualityModule; moduleLabel: string }) {
    const { schoolId, isLoading } = useAuth();
    if (isLoading) return null;
    if (!isQualityEnabled(schoolId)) return <QualityDisabledNotice moduleLabel={moduleLabel} />;

    const templates = getQualityTemplates(schoolId, module);
    if (templates.length === 0) return <QualityDisabledNotice moduleLabel={moduleLabel} />;

    const ready = templates.filter((t) => t.implemented);
    const planned = templates.filter((t) => !t.implemented);

    return (
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm" dir="rtl">
            <h2 className="mb-1 flex items-center gap-2 text-base font-black text-foreground">
                <FileCheck2 className="h-4 w-4 text-primary" />
                نماذج الجودة — {moduleLabel}
            </h2>

            {planned.length > 0 && (
                <p className="mb-4 mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    نماذج الجودة الخاصة بهذا الدور مخططة، وسيتم تفعيلها بعد اعتماد القوالب الرسمية.
                </p>
            )}

            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {ready.map((t) => (
                    <li key={t.key} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-soft px-3.5 py-3">
                        <span className="flex min-w-0 items-center gap-2.5">
                            <FileCheck2 className="h-4 w-4 shrink-0 text-primary" />
                            <span className="truncate text-sm font-bold text-foreground">{t.title}</span>
                        </span>
                        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[9px] font-black text-primary">متوفّر</span>
                    </li>
                ))}
                {planned.map((t) => (
                    <li key={t.key} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-soft px-3.5 py-3 opacity-80">
                        <span className="flex min-w-0 items-center gap-2.5">
                            <Clock className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                            <span className="truncate text-sm font-bold text-muted-foreground">{t.title}</span>
                        </span>
                        <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[9px] font-black text-muted-foreground">قيد الاعتماد</span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
