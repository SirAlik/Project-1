import {
    Database,
    LineChart,
    Bell,
    ShieldAlert,
    Lightbulb,
    Workflow,
    CheckCircle2,
    ChevronLeft,
} from "lucide-react";

/**
 * "من البيانات إلى القرار" — سلسلة التحويل التي تميّز سِدرة عن نظام إدخال بيانات تقليدي:
 * بيانات → رؤى → تنبيهات → مخاطر → توصيات → سير عمل → قرار.
 */

const PIPELINE = [
    { icon: Database, title: "بيانات", desc: "حضور، صحة، درجات، أنشطة — من مصدر موحّد." },
    { icon: LineChart, title: "رؤى", desc: "اتجاهات وأنماط تُحسب تلقائيًا." },
    { icon: Bell, title: "تنبيهات", desc: "إشعارات لحظية عند تجاوز الحدود." },
    { icon: ShieldAlert, title: "مخاطر", desc: "رصد الطلاب والحالات المعرّضة للخطر." },
    { icon: Lightbulb, title: "توصيات", desc: "اقتراح الإجراء الأنسب لكل حالة." },
    { icon: Workflow, title: "سير عمل", desc: "تحويل القرار إلى خطوات قابلة للتنفيذ." },
    { icon: CheckCircle2, title: "قرار", desc: "إجراء موثّق يصل للدور المسؤول." },
];

export function DataToActionSection() {
    return (
        <section id="how" className="border-y border-border bg-surface-soft">
            <div className="mx-auto max-w-7xl px-6 py-20 md:py-24">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">من البيانات إلى القرار</p>
                    <h2 className="mt-3 text-3xl font-black tracking-tight text-foreground md:text-4xl">
                        يحوّل البيانات إلى معلومات تُستخدم لاتخاذ القرارات
                    </h2>
                    <p className="mt-4 text-base leading-relaxed text-foreground/80">
                        البيانات وحدها لا تكفي؛ تسلكها سِدرة في سلسلة واضحة حتى تصبح قرارًا
                        موثّقًا يصل للشخص المناسب في الوقت المناسب.
                    </p>
                </div>

                <div className="mt-14 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7 lg:gap-2">
                    {PIPELINE.map((step, index) => {
                        const Icon = step.icon;
                        const isLast = index === PIPELINE.length - 1;
                        return (
                            <div key={step.title} className="relative flex flex-col items-center text-center">
                                <div className="flex w-full flex-col items-center rounded-2xl border border-border bg-card p-4 shadow-sm">
                                    <span
                                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                                            isLast ? "bg-primary text-primary-foreground" : "bg-accent text-primary"
                                        }`}
                                    >
                                        <Icon className="h-5 w-5" />
                                    </span>
                                    <p className="mt-3 text-sm font-black text-foreground">{step.title}</p>
                                    <p className="mt-1 text-[11px] font-medium leading-relaxed text-foreground/70">
                                        {step.desc}
                                    </p>
                                </div>

                                {/* سهم الربط (يختفي بعد آخر عنصر) — يشير لليسار في RTL */}
                                {!isLast && (
                                    <ChevronLeft
                                        aria-hidden
                                        className="absolute left-[-14px] top-9 hidden h-5 w-5 text-primary/50 lg:block"
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
