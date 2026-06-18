'use client';

import { BookOpen, BookMarked, Calendar, AlertTriangle, FileCheck2, Workflow } from 'lucide-react';
import { AIInsightCard } from '@/components/ai/AIInsightCard';
import { DashboardGrid, MetricCard, ActionCard } from '@/components/dashboard';

interface LrcOverviewProps {
    stats: { totalBooks: number; activeLoansCount: number; overdueCount: number } | null;
    pendingBookings: number;
    onNavigate: (view: 'quality' | 'reports') => void;
}

export function LrcOverview({ stats, pendingBookings, onNavigate }: LrcOverviewProps) {
    return (
        <div className="space-y-6">
            {/* مؤشرات حقيقية */}
            <DashboardGrid cols={4}>
                <MetricCard label="إجمالي الكتب" value={(stats?.totalBooks ?? 0).toLocaleString('en-US')} icon={BookOpen} tone="primary" />
                <MetricCard label="إعارات نشطة" value={(stats?.activeLoansCount ?? 0).toLocaleString('en-US')} icon={BookMarked} tone="info" />
                <MetricCard label="طلبات حجز معلّقة" value={pendingBookings.toLocaleString('en-US')} icon={Calendar} tone="primary" />
                <MetricCard label="متأخرات" value={(stats?.overdueCount ?? 0).toLocaleString('en-US')} icon={AlertTriangle} tone="warning" />
            </DashboardGrid>

            {/* طبقة الذكاء — رؤية حقيقية من Claude (حالة فارغة/خطأ صادقة عند غياب المفتاح/البيانات) */}
            <AIInsightCard contextType="lrc_usage" title="الرؤية الذكية — مركز مصادر التعلم" />

            {/* تلميح نماذج الجودة + محرّك التعبئة */}
            <DashboardGrid cols={2}>
                <ActionCard
                    icon={FileCheck2}
                    title="نماذج الجودة والتصدير"
                    description="حوّل سجلات الإعارة والزيارات والحجوزات إلى نماذج جودة رسمية قابلة للتصدير PDF."
                    onClick={() => onNavigate('quality')}
                />
                <ActionCard
                    icon={Workflow}
                    title="التقارير والتحليلات"
                    description="مؤشرات الإعارة والإعادة والتأخير وأكثر الطلاب/الكتب — من بيانات حقيقية."
                    onClick={() => onNavigate('reports')}
                />
            </DashboardGrid>
        </div>
    );
}
