"use client";

import React from "react";
import { DisciplineKnightsModal } from "@/components/operations/DisciplineKnightsModal";
import { ClassNavigatorModal } from "./analytics/_components/ClassNavigatorModal";
import { SentinelDashboard } from "./analytics/_components/SentinelDashboard";
import {
    Trophy,
    Shield,
    TrendingUp,
    UserX,
    Clock,
    AlertTriangle,
    Stethoscope,
    BookOpen,
    Layers,
} from "lucide-react";
import { supabase } from "@/lib/db/supabase";
import { usePrincipalKPIs } from "./_hooks/usePrincipalKPIs";
import { AIInsightCard } from "@/components/ai/AIInsightCard";
import { QualityOwnerPanel } from "@/components/quality/QualityOwnerPanel";
import {
    PageHeader,
    DashboardGrid,
    MetricCard,
    DashboardSection,
    ActionCard,
    EmptyState,
} from "@/components/dashboard";

// روابط التنقّل التشغيلي — مسارات حقيقية فقط (لا مؤشّرات وهمية)
const ORG_HUB = [
    { href: "/principal/analytics/secretary", title: "السكرتارية", desc: "المعاملات والإجازات والطلبات." },
    { href: "/principal/analytics/student-affairs", title: "شؤون الطلاب", desc: "الغياب، السلوك، والقضايا." },
    { href: "/principal/analytics/academic", title: "الشؤون التعليمية", desc: "المنهج والتحصيل الأكاديمي." },
    { href: "/qa", title: "منسق الجودة", desc: "مؤشرات الأداء والتدقيق." },
    { href: "/meetings", title: "الاجتماعات", desc: "جدولة الاجتماعات وتوقيع المحاضر الرسمية." },
    { href: "/workflows", title: "الموافقات المعلّقة", desc: "مسارات العمل وبوابات الموافقة المُسنَدة إليك." },
    { href: "/staff-evaluation", title: "تقييمات الأداء", desc: "تقييم وتطوير الكفاءات — ISO 9.1.3." },
    { href: "/period-attendance", title: "حضور الحصص", desc: "تسجيل الحضور على مستوى كل حصة دراسية." },
    { href: "/student-affairs/attendance", title: "الحضور اليومي", desc: "تسجيل الحضور اليومي للطلاب والغيابات." },
    { href: "/principal/analytics/lrc", title: "رادار المكتبة", desc: "حركة الاستعارة ونشاط القراءة." },
    { href: "/principal/analytics/lab", title: "مراقبة المختبر", desc: "التجارب المنفذة وإشغال المعامل." },
    { href: "/principal/analytics/health", title: "المؤشرات الصحية", desc: "سجل العيادة والبيئة المدرسية." },
    { href: "/principal/analytics/counselor", title: "التوجيه الطلابي", desc: "تحليل الحالات والمعالجات." },
];

export default function PrincipalPage() {
    const [isKnightsOpen, setIsKnightsOpen] = React.useState(false);
    const [isClassNavigatorOpen, setIsClassNavigatorOpen] = React.useState(false);
    const [classes, setClasses] = React.useState<{ id: string; name: string; grade_level: number }[]>([]);
    const { kpis, loading: kpisLoading, date: kpisDate } = usePrincipalKPIs();

    React.useEffect(() => {
        async function fetchClasses() {
            const { data } = await supabase
                .from("classes")
                .select("id, name, grade_level")
                .in("grade_level", [4, 5, 6]);
            if (data) setClasses(data);
        }
        fetchClasses();
    }, []);

    // عرض القيم بصدق: «…» أثناء التحميل، «—» عند غياب القيمة (لا أرقام مُختلَقة)
    const num = (v: number | null | undefined) => (kpisLoading ? "…" : v != null ? v : "—");
    const attendance = kpisLoading ? "…" : kpis?.attendance_rate != null ? `%${kpis.attendance_rate}` : "—";

    return (
        <div className="space-y-8" dir="rtl">
            <PageHeader
                icon={Shield}
                title="مكتب مدير المدرسة"
                subtitle="غرفة القيادة: المؤشّرات التشغيلية الحقيقية والتنقّل عبر مجالات المدرسة."
                actions={
                    <button
                        onClick={() => setIsKnightsOpen(true)}
                        className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-muted"
                    >
                        <Trophy className="h-4 w-4 text-primary" /> فرسان الانضباط
                    </button>
                }
            />

            {/* مؤشّرات تشغيلية حقيقية من ذاكرة التحليلات (usePrincipalKPIs) */}
            <DashboardGrid cols={3}>
                <MetricCard label="الحضور العام" value={attendance} icon={TrendingUp} tone="primary" />
                <MetricCard label="غائبون اليوم" value={num(kpis?.absent_count)} icon={UserX} tone="danger" />
                <MetricCard label="متأخرون" value={num(kpis?.late_count)} icon={Clock} tone="warning" />
                <MetricCard label="بلاغات سلوكية" value={num(kpis?.behavioral_today)} icon={AlertTriangle} tone="danger" />
                <MetricCard label="زيارات العيادة" value={num(kpis?.health_cases_today)} icon={Stethoscope} tone="info" />
                <MetricCard label="زيارات المكتبة" value={num(kpis?.lrc_visits_today)} icon={BookOpen} tone="info" />
            </DashboardGrid>
            {!kpisLoading && kpisDate && (
                <p className="-mt-4 text-xs font-medium text-muted-foreground">آخر تحديث للمؤشّرات: {kpisDate}</p>
            )}

            {/* الرؤية الذكية */}
            <AIInsightCard contextType="school_overview" title="الرؤية الذكية — نظرة عامة على المدرسة" />

            {/* نماذج الجودة (مالك: مدير المدرسة) — مُبوّبة بسجلّ المستأجر */}
            <QualityOwnerPanel module="principal" moduleLabel="القيادة المدرسية" />

            {/* الهيكل التنظيمي والتشغيل الرقمي — تنقّل حقيقي */}
            <DashboardSection title="الهيكل التنظيمي والتشغيل الرقمي" icon={Layers}>
                <DashboardGrid cols={4}>
                    {ORG_HUB.map((item) => (
                        <ActionCard key={item.href} href={item.href} title={item.title} description={item.desc} />
                    ))}
                    <ActionCard
                        onClick={() => setIsClassNavigatorOpen(true)}
                        title="إدارة الفصول (4-6)"
                        description="تحليل شخصية الفصل وتوافق المعلمين."
                    />
                </DashboardGrid>
            </DashboardSection>

            {/* رادار النزاهة (طبقة التحصين) */}
            <SentinelDashboard />

            {/* حالة فارغة صادقة بدل التحليلات الوهمية المحذوفة (خرائط حرارية/سجل حي/تحصيل) */}
            <EmptyState
                icon={TrendingUp}
                title="التحليلات التشغيلية المتقدمة قيد الربط"
                hint="الخرائط الحرارية للفصول، وسجل النشاط الحي، ومؤشّرات التحصيل تُعرض هنا بعد ربطها بمصادر بيانات حقيقية — لا تُعرض أرقام تقديرية."
            />

            <DisciplineKnightsModal
                isOpen={isKnightsOpen}
                onClose={() => setIsKnightsOpen(false)}
                userRole="school_principal"
            />
            <ClassNavigatorModal
                isOpen={isClassNavigatorOpen}
                onClose={() => setIsClassNavigatorOpen(false)}
                classes={classes}
            />
        </div>
    );
}
