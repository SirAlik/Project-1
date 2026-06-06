import {
    LayoutGrid,
    Users,
    GraduationCap,
    CalendarCheck,
    TriangleAlert,
    Library,
    HeartPulse,
    BarChart3,
    Bell,
    Lightbulb,
    ChevronLeft,
} from "lucide-react";

/**
 * معاينة لوحة قيادة مدرسية وهمية (Mock) داخل الـ Hero.
 * ثابتة بالكامل (Server Component) — بلا تفاعل، بلا مكتبات رسم خارجية.
 * الرسوم البيانية مبنية يدويًا بـ SVG/CSS فقط. تستوحي بنية المرجع لكن بألوان الدستور (charcoal + teal + أزرق).
 */

const SIDEBAR_ITEMS = [
    { icon: LayoutGrid, label: "الرئيسية", active: true },
    { icon: Users, label: "الطلاب", active: false },
    { icon: GraduationCap, label: "المعلمون", active: false },
    { icon: CalendarCheck, label: "الحضور", active: false },
    { icon: Library, label: "مصادر التعلم", active: false },
    { icon: HeartPulse, label: "الصحة", active: false },
];

const KPIS = [
    { icon: CalendarCheck, label: "نسبة الحضور اليوم", value: "94.7%", delta: "+1.8%", tone: "primary" },
    { icon: Users, label: "إجمالي الطلاب", value: "1,284", delta: "+12", tone: "info" },
    { icon: GraduationCap, label: "المعلمون النشطون", value: "86", delta: "حاضر", tone: "success" },
    { icon: TriangleAlert, label: "تنبيهات مفتوحة", value: "7", delta: "تحتاج إجراء", tone: "warning" },
];

const ALERTS = [
    {
        icon: TriangleAlert,
        tone: "danger",
        title: "انخفاض حضور الصف الثاني/ب",
        meta: "3 أيام متتالية تحت 80%",
        action: "فتح حالة",
    },
    {
        icon: HeartPulse,
        tone: "warning",
        title: "مراجعة سجلات العيادة",
        meta: "5 زيارات اليوم",
        action: "مراجعة",
    },
];

const RECOMMENDATION = {
    title: "اقتراح إجراء",
    body: "جدولة لقاء وليّ أمر لـ 4 طلاب متعثرين في الحضور قبل نهاية الأسبوع.",
    action: "إنشاء سير عمل",
};

// خريطة الألوان الدلالية → فئات أيقونة الخلفية/النص (token-based فقط)
const TONE_ICON: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    info: "bg-info/10 text-info",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-destructive/10 text-destructive",
};

const TONE_DELTA: Record<string, string> = {
    primary: "text-primary",
    info: "text-info",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
};

// نقاط منحنى الحضور الأسبوعي (SVG) — قيم وهمية ثابتة
const TREND_POINTS = "0,46 50,38 100,42 150,28 200,32 250,18 300,22";
const TREND_AREA = `0,46 50,38 100,42 150,28 200,32 250,18 300,22 300,72 0,72`;
const WEEK_DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];

export function HeroDashboardPreview() {
    return (
        <div className="relative">
            {/* هالة ناعمة خلف اللوحة (teal خفيف، بلا توهج زجاجي قوي) */}
            <div
                aria-hidden
                className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-accent/50 blur-2xl"
            />

            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_24px_60px_-24px_rgba(17,24,39,0.20)]">
                {/* شريط نافذة علوي */}
                <div className="flex items-center gap-2 border-b border-border bg-surface-soft px-4 py-3">
                    <span className="flex gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-destructive/40" />
                        <span className="h-2.5 w-2.5 rounded-full bg-warning/50" />
                        <span className="h-2.5 w-2.5 rounded-full bg-success/50" />
                    </span>
                    <span className="mr-2 text-xs font-bold text-muted-foreground">
                        لوحة قيادة المدرسة — لحظية
                    </span>
                    <span className="mr-auto inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold text-primary">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        مباشر
                    </span>
                </div>

                {/* إطار التطبيق: شريط جانبي (يمين في RTL) + المحتوى */}
                <div className="flex">
                    {/* الشريط الجانبي */}
                    <aside className="hidden w-40 shrink-0 border-l border-border bg-surface-soft p-3 sm:block">
                        <div className="mb-4 flex items-center gap-2 px-1">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <GraduationCap className="h-4 w-4" />
                            </span>
                            <span className="text-xs font-black text-foreground">Sidra OS</span>
                        </div>
                        <nav className="space-y-1">
                            {SIDEBAR_ITEMS.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div
                                        key={item.label}
                                        className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-bold ${
                                            item.active
                                                ? "bg-accent text-foreground"
                                                : "text-muted-foreground"
                                        }`}
                                    >
                                        <Icon
                                            className={`h-4 w-4 ${
                                                item.active ? "text-primary" : "text-muted-foreground"
                                            }`}
                                        />
                                        {item.label}
                                    </div>
                                );
                            })}
                        </nav>
                    </aside>

                    {/* المحتوى */}
                    <div className="min-w-0 flex-1 space-y-4 p-4">
                        {/* رأس المحتوى */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-black text-foreground">ثانوية سدرة النموذجية</p>
                                <p className="text-[11px] font-medium text-muted-foreground">
                                    صباح الخير، أ. خالد — العام الدراسي 2026
                                </p>
                            </div>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-bold text-foreground">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                قائد مدرسة
                            </span>
                        </div>

                        {/* بطاقات KPI */}
                        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                            {KPIS.map((kpi) => {
                                const Icon = kpi.icon;
                                return (
                                    <div
                                        key={kpi.label}
                                        className="rounded-2xl border border-border bg-card p-3"
                                    >
                                        <span
                                            className={`flex h-7 w-7 items-center justify-center rounded-lg ${TONE_ICON[kpi.tone]}`}
                                        >
                                            <Icon className="h-4 w-4" />
                                        </span>
                                        <p className="mt-2 text-lg font-black leading-none text-foreground">
                                            {kpi.value}
                                        </p>
                                        <p className="mt-1 text-[10px] font-medium text-muted-foreground">
                                            {kpi.label}
                                        </p>
                                        <p className={`mt-1 text-[10px] font-bold ${TONE_DELTA[kpi.tone]}`}>
                                            {kpi.delta}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* صف الرسوم: منحنى الحضور + الحلقة */}
                        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-3">
                            {/* منحنى الحضور */}
                            <div className="rounded-2xl border border-border bg-card p-3 lg:col-span-2">
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                        <BarChart3 className="h-3.5 w-3.5 text-primary" />
                                        اتجاه الحضور الأسبوعي
                                    </p>
                                    <span className="text-[10px] font-bold text-success">+4.2%</span>
                                </div>
                                <svg viewBox="0 0 300 80" className="h-24 w-full" preserveAspectRatio="none">
                                    <polygon points={TREND_AREA} fill="var(--primary)" opacity="0.10" />
                                    <polyline
                                        points={TREND_POINTS}
                                        fill="none"
                                        stroke="var(--primary)"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                                <div className="mt-1 flex justify-between text-[9px] font-medium text-muted-foreground">
                                    {WEEK_DAYS.map((day) => (
                                        <span key={day}>{day}</span>
                                    ))}
                                </div>
                            </div>

                            {/* حلقة توزيع الحضور */}
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-3">
                                <p className="mb-2 self-start text-xs font-bold text-foreground">توزيع الحضور</p>
                                <div
                                    className="relative flex h-20 w-20 items-center justify-center rounded-full"
                                    style={{
                                        background:
                                            "conic-gradient(var(--primary) 0% 78%, var(--chart-2) 78% 90%, var(--chart-4) 90% 96%, var(--border) 96% 100%)",
                                    }}
                                >
                                    <div className="flex h-14 w-14 flex-col items-center justify-center rounded-full bg-card">
                                        <span className="text-sm font-black text-foreground">94.7%</span>
                                        <span className="text-[8px] font-medium text-muted-foreground">حاضر</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* لوحة التنبيهات + التوصية */}
                        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
                            {/* التنبيهات */}
                            <div className="rounded-2xl border border-border bg-card p-3">
                                <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-foreground">
                                    <Bell className="h-3.5 w-3.5 text-primary" />
                                    تنبيهات تحتاج قرارًا
                                </p>
                                <div className="space-y-2">
                                    {ALERTS.map((alert) => {
                                        const Icon = alert.icon;
                                        return (
                                            <div
                                                key={alert.title}
                                                className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-soft p-2"
                                            >
                                                <span
                                                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${TONE_ICON[alert.tone]}`}
                                                >
                                                    <Icon className="h-3.5 w-3.5" />
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-[11px] font-bold text-foreground">
                                                        {alert.title}
                                                    </p>
                                                    <p className="truncate text-[10px] font-medium text-muted-foreground">
                                                        {alert.meta}
                                                    </p>
                                                </div>
                                                <span className="shrink-0 rounded-lg bg-accent px-2 py-1 text-[9px] font-bold text-primary">
                                                    {alert.action}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* التوصية الذكية */}
                            <div className="flex flex-col rounded-2xl border border-primary/30 bg-accent/60 p-3">
                                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-primary">
                                    <Lightbulb className="h-3.5 w-3.5" />
                                    {RECOMMENDATION.title}
                                </p>
                                <p className="text-[11px] font-medium leading-relaxed text-foreground">
                                    {RECOMMENDATION.body}
                                </p>
                                <button
                                    type="button"
                                    className="mt-auto inline-flex w-fit items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[10px] font-bold text-primary-foreground"
                                >
                                    {RECOMMENDATION.action}
                                    <ChevronLeft className="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
