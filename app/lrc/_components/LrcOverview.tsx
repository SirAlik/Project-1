'use client';

import React from 'react';
import { BookOpen, BookMarked, Calendar, AlertTriangle, FileCheck2, Workflow, ArrowLeft, type LucideIcon } from 'lucide-react';
import { AIInsightCard } from '@/components/ai/AIInsightCard';

interface LrcOverviewProps {
    stats: { totalBooks: number; activeLoansCount: number; overdueCount: number } | null;
    pendingBookings: number;
    onNavigate: (view: 'quality' | 'reports') => void;
}

export function LrcOverview({ stats, pendingBookings, onNavigate }: LrcOverviewProps) {
    return (
        <div className="space-y-6">
            {/* مؤشرات حقيقية */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <KpiCard label="إجمالي الكتب" value={stats?.totalBooks ?? 0} icon={BookOpen} tone="teal" />
                <KpiCard label="إعارات نشطة" value={stats?.activeLoansCount ?? 0} icon={BookMarked} tone="blue" />
                <KpiCard label="طلبات حجز معلّقة" value={pendingBookings} icon={Calendar} tone="teal" />
                <KpiCard label="متأخرات" value={stats?.overdueCount ?? 0} icon={AlertTriangle} tone="amber" />
            </div>

            {/* طبقة الذكاء — رؤية حقيقية من Claude (حالة فارغة/خطأ صادقة عند غياب المفتاح/البيانات) */}
            <AIInsightCard contextType="lrc_usage" title="الرؤية الذكية — مركز مصادر التعلم" />

            {/* تلميح نماذج الجودة + محرّك التعبئة */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <TeaserCard
                    icon={FileCheck2}
                    title="نماذج الجودة والتصدير"
                    body="حوّل سجلات الإعارة والزيارات والحجوزات إلى نماذج جودة رسمية قابلة للتصدير PDF."
                    cta="فتح النماذج"
                    onClick={() => onNavigate('quality')}
                />
                <TeaserCard
                    icon={Workflow}
                    title="التقارير والتحليلات"
                    body="مؤشرات الإعارة والإعادة والتأخير وأكثر الطلاب/الكتب — من بيانات حقيقية."
                    cta="فتح التقارير"
                    onClick={() => onNavigate('reports')}
                />
            </div>
        </div>
    );
}

type Tone = 'teal' | 'blue' | 'amber';

function KpiCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: LucideIcon; tone: Tone }) {
    const toneClasses =
        tone === 'teal' ? 'bg-primary/10 text-primary'
            : tone === 'blue' ? 'bg-blue-50 text-blue-600'
                : 'bg-amber-50 text-amber-600';
    return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${toneClasses}`}>
                <Icon className="h-5 w-5" />
            </div>
            <p className="text-3xl font-black tabular-nums text-foreground">{value.toLocaleString('en-US')}</p>
            <p className="mt-1 text-xs font-bold text-muted-foreground">{label}</p>
        </div>
    );
}

function TeaserCard({ icon: Icon, title, body, cta, onClick }: { icon: LucideIcon; title: string; body: string; cta: string; onClick: () => void }) {
    return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                </span>
                <h3 className="text-sm font-black text-foreground">{title}</h3>
            </div>
            <p className="text-[13px] leading-relaxed text-muted-foreground">{body}</p>
            <button
                type="button"
                onClick={onClick}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-primary hover:underline"
            >
                {cta}
                <ArrowLeft className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}
