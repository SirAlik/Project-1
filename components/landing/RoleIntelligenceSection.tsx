import {
    Crown,
    ClipboardList,
    GraduationCap,
    HeartPulse,
    Library,
    Trophy,
    Users,
    Bell,
    Lightbulb,
    ArrowLeft,
} from "lucide-react";

/**
 * "ذكاء حسب الدور" — كل دور يدخل إلى مساحة عمل مخصّصة:
 * مؤشّر يهمّه + تنبيه يخصّه + توصية + الإجراء التالي. ليست لوحة واحدة للجميع.
 */

interface RoleCard {
    icon: React.ComponentType<{ className?: string }>;
    role: string;
    kpiLabel: string;
    kpiValue: string;
    alert: string;
    recommendation: string;
    nextAction: string;
}

const ROLES: RoleCard[] = [
    {
        icon: Crown,
        role: "قائد المدرسة",
        kpiLabel: "صحة المدرسة العامة",
        kpiValue: "جيدة",
        alert: "3 مؤشرات تتجه للهبوط",
        recommendation: "راجع تقرير الحضور الأسبوعي",
        nextAction: "فتح اللوحة التنفيذية",
    },
    {
        icon: ClipboardList,
        role: "وكيل الشؤون التعليمية",
        kpiLabel: "تغطية المنهج",
        kpiValue: "88%",
        alert: "صفّان متأخّران عن الخطة",
        recommendation: "أعد توزيع الحصص الناقصة",
        nextAction: "إدارة الجدول",
    },
    {
        icon: GraduationCap,
        role: "المعلّم",
        kpiLabel: "حضور صفّي اليوم",
        kpiValue: "27/30",
        alert: "طالبان متكرّرا الغياب",
        recommendation: "سجّل ملاحظة سلوكية",
        nextAction: "رصد الحضور",
    },
    {
        icon: HeartPulse,
        role: "المرشد الصحي",
        kpiLabel: "زيارات العيادة",
        kpiValue: "5 اليوم",
        alert: "حالة تحتاج إشعار وليّ أمر",
        recommendation: "أنشئ تقرير حالة",
        nextAction: "سجل العيادة",
    },
    {
        icon: Library,
        role: "أمين مصادر التعلم",
        kpiLabel: "إعارات نشطة",
        kpiValue: "138",
        alert: "9 إعارات متأخرة",
        recommendation: "أرسل تذكير إرجاع",
        nextAction: "إدارة المكتبة",
    },
    {
        icon: Trophy,
        role: "قائد النشاط",
        kpiLabel: "مشاركة الأندية",
        kpiValue: "71%",
        alert: "رحلة بانتظار الموافقات",
        recommendation: "تابع أذونات أولياء الأمور",
        nextAction: "لوحة الأنشطة",
    },
    {
        icon: Users,
        role: "وكيل شؤون الطلاب",
        kpiLabel: "حالات مفتوحة",
        kpiValue: "7",
        alert: "حالتان تجاوزتا المهلة",
        recommendation: "أعد إسناد الحالات المتأخرة",
        nextAction: "إدارة الحالات",
    },
    {
        icon: GraduationCap,
        role: "الطالب وولي الأمر",
        kpiLabel: "نسبة الحضور",
        kpiValue: "96%",
        alert: "واجب مستحقّ غدًا",
        recommendation: "اطّلع على آخر الملاحظات",
        nextAction: "فضاء الطالب",
    },
];

export function RoleIntelligenceSection() {
    return (
        <section id="roles" className="mx-auto max-w-7xl px-6 py-20 md:py-24">
            <div className="mx-auto max-w-2xl text-center">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">ذكاء حسب الدور</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-foreground md:text-4xl">
                    لكل دور مساحة عمله الذكية
                </h2>
                <p className="mt-4 text-base leading-relaxed text-foreground/80">
                    لا نعرض اللوحة نفسها للجميع. كل دور يرى ما يهمّه: مؤشّراً، وتنبيهاً، وتوصية،
                    والإجراء التالي — بحدود صلاحياته فقط.
                </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {ROLES.map((role) => {
                    const Icon = role.icon;
                    return (
                        <div
                            key={role.role}
                            className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
                        >
                            <div className="flex items-center gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary">
                                    <Icon className="h-5 w-5" />
                                </span>
                                <h3 className="text-sm font-black text-foreground">{role.role}</h3>
                            </div>

                            <div className="mt-4 rounded-xl bg-surface-soft p-3">
                                <p className="text-[11px] font-semibold text-foreground/70">{role.kpiLabel}</p>
                                <p className="mt-0.5 text-xl font-black text-foreground">{role.kpiValue}</p>
                            </div>

                            <div className="mt-3 space-y-2 text-[11px]">
                                <p className="flex items-start gap-1.5 font-medium text-foreground">
                                    <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                                    {role.alert}
                                </p>
                                <p className="flex items-start gap-1.5 font-medium text-foreground">
                                    <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                                    {role.recommendation}
                                </p>
                            </div>

                            <div className="mt-4 flex items-center gap-1 border-t border-border pt-3 text-xs font-bold text-primary">
                                {role.nextAction}
                                <ArrowLeft className="h-3.5 w-3.5" />
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
