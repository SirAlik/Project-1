import {
    CalendarCheck,
    HeartPulse,
    BookOpen,
    Library,
    Trophy,
    ShieldAlert,
} from "lucide-react";

/**
 * "نبض المدرسة" — شريط مؤشرات حيّة يُظهر المدرسة كنظام حيّ يتنفّس بالبيانات،
 * لا كأرشيف سجلات. كل بطاقة = مجال يُراقَب لحظيًا (قيم توضيحية).
 */

const PULSE = [
    { icon: CalendarCheck, tone: "primary", label: "الحضور اليوم", value: "94.7%", note: "أعلى من أمس" },
    { icon: HeartPulse, tone: "info", label: "زيارات العيادة", value: "5", note: "ضمن المعدّل" },
    { icon: BookOpen, tone: "success", label: "الأداء التعليمي", value: "B+", note: "مستقر" },
    { icon: Library, tone: "info", label: "إعارات المكتبة", value: "138", note: "هذا الأسبوع" },
    { icon: Trophy, tone: "primary", label: "مشاركة الأنشطة", value: "71%", note: "+6%" },
    { icon: ShieldAlert, tone: "warning", label: "طلاب في خطر", value: "12", note: "بحاجة متابعة" },
];

const TONE_ICON: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    info: "bg-info/10 text-info",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
};

export function SchoolPulseSection() {
    return (
        <section id="pulse" className="border-y border-border bg-surface-soft">
            <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">نبض المدرسة</p>
                    <h2 className="mt-3 text-3xl font-black tracking-tight text-foreground md:text-4xl">
                        مدرستك كنظام حيّ، لا كأرشيف
                    </h2>
                    <p className="mt-4 text-base leading-relaxed text-foreground/80">
                        كل رقم هنا يُحدَّث من بيانات حقيقية لحظيًا — حضور، صحة، تعلّم، أنشطة، ومخاطر — لتقرأ
                        حالة المدرسة في لمحة واحدة.
                    </p>
                </div>

                <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                    {PULSE.map((item) => {
                        const Icon = item.icon;
                        return (
                            <div
                                key={item.label}
                                className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
                            >
                                <span
                                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${TONE_ICON[item.tone]}`}
                                >
                                    <Icon className="h-5 w-5" />
                                </span>
                                <p className="mt-3 text-2xl font-black leading-none text-foreground">
                                    {item.value}
                                </p>
                                <p className="mt-2 text-xs font-bold text-foreground">{item.label}</p>
                                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{item.note}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
