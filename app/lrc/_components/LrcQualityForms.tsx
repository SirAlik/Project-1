'use client';

import React from 'react';
import { FileText, Download, Workflow, FileCheck2 } from 'lucide-react';
import { LRC_QUALITY_FORMS, type QualityFormDef } from '@/lib/quality/quality-forms';
import { generateLRCCertificate } from './CertificateGenerator';

interface LrcQualityFormsProps {
    /** اسم الطالب الأكثر استعارة (لتفعيل تصدير شهادة التميّز) — من بيانات حقيقية */
    topStudentName?: string;
}

export function LrcQualityForms({ topStudentName }: LrcQualityFormsProps) {
    return (
        <div className="space-y-6">
            {/* مفهوم محرّك التعبئة التلقائية — توضيح معماري صادق */}
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h2 className="mb-2 flex items-center gap-2 text-base font-black text-foreground">
                    <Workflow className="h-4 w-4 text-primary" />
                    محرّك الأتمتة وتعبئة النماذج
                </h2>
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                    مسار العمل في سِدرة: <span className="font-bold text-foreground">إجراء تشغيلي → سجل سير عمل تلقائي → بيانات نموذج الجودة → تصدير PDF رسمي</span>.
                    في مركز المصادر: عند موافقة أمين المصادر على حجز معلم، تُسجَّل زيارة الفصل وتُعبَّأ كشوف الحضور من قائمة الفصل تلقائياً،
                    لتغذّي «كشف زيارة الفصل والحضور اليومي».
                </p>
                <p className="mt-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[12px] font-bold leading-relaxed text-foreground">
                    الحالة الفعلية: تعبئة قائمة طلاب الفصل تلقائياً <span className="text-blue-700">مفعّلة</span>.
                    استبعاد الغياب/المأذونين وربط موافقة الحجز بإنشاء الزيارة آلياً <span className="text-blue-700">قيد التخطيط</span> (يتطلب ربط مصدر الحضور — مرحلة لاحقة).
                </p>
            </section>

            {/* سجل نماذج الجودة */}
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h2 className="mb-1 flex items-center gap-2 text-base font-black text-foreground">
                    <FileCheck2 className="h-4 w-4 text-primary" />
                    نماذج الجودة والتصدير
                </h2>
                <p className="mb-4 text-[12px] text-muted-foreground">
                    النماذج الجاهزة قابلة للتصدير الآن. البقية بياناتها متوفّرة وقوالب PDF الرسمية تُبنى في مرحلة لاحقة — تُعرض «قريباً» بلا أي تصدير وهمي.
                </p>

                <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {LRC_QUALITY_FORMS.map((form) => (
                        <QualityFormRow key={form.key} form={form} topStudentName={topStudentName} />
                    ))}
                </ul>
            </section>
        </div>
    );
}

function QualityFormRow({ form, topStudentName }: { form: QualityFormDef; topStudentName?: string }) {
    const isCertificate = form.key === 'excellence_certificate';
    const canExportCertificate = isCertificate && !!topStudentName;

    if (form.status === 'available' && isCertificate) {
        return (
            <li className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-soft px-3.5 py-3">
                <span className="flex min-w-0 items-center gap-2.5">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate text-sm font-bold text-foreground">{form.title}</span>
                </span>
                <button
                    type="button"
                    onClick={() => topStudentName && generateLRCCertificate(topStudentName)}
                    disabled={!canExportCertificate}
                    title={canExportCertificate ? undefined : 'يتطلب بيانات إعارة لتحديد الأكثر استعارة'}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-black text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Download className="h-3.5 w-3.5" />
                    تصدير PDF
                </button>
            </li>
        );
    }

    // مخطّط — يُعرض «قريباً» معطّلاً (بلا تصدير وهمي)
    return (
        <li className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-soft px-3.5 py-3 opacity-80">
            <span className="flex min-w-0 items-center gap-2.5">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                <span className="truncate text-sm font-bold text-muted-foreground">{form.title}</span>
            </span>
            <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[9px] font-black text-muted-foreground">قريباً</span>
        </li>
    );
}
