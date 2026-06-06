import { Sparkles, Trophy, Target, Gamepad2, Star } from "lucide-react";

/**
 * "فضاء الطالب التفاعلي" (Student Room / Metaverse) — تجربة تحفيزية للطالب:
 * إنجازات، تحدّيات، نقاط، وتقدّم — تربط البيانات بالدافعية لا بالعقوبة فقط.
 */

const HIGHLIGHTS = [
    { icon: Trophy, label: "إنجازات وأوسمة", value: "12 وسامًا" },
    { icon: Target, label: "تحدّيات أسبوعية", value: "3 نشطة" },
    { icon: Star, label: "نقاط التميّز", value: "1,860" },
];

export function StudentRoomSection() {
    return (
        <section className="mx-auto max-w-7xl px-6 py-20 md:py-24">
            <div className="grid items-center gap-12 lg:grid-cols-2">
                {/* المعاينة البصرية */}
                <div className="order-2 lg:order-1">
                    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                                    <Gamepad2 className="h-5 w-5" />
                                </span>
                                <div>
                                    <p className="text-sm font-black text-foreground">فضاء سلمان</p>
                                    <p className="text-[11px] font-medium text-muted-foreground">المستوى 7 — متعلّم نشط</p>
                                </div>
                            </div>
                            <span className="rounded-full bg-accent px-3 py-1 text-[11px] font-bold text-primary">
                                ترتيب #4
                            </span>
                        </div>

                        {/* شريط التقدّم */}
                        <div className="mt-5">
                            <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold">
                                <span className="text-foreground">التقدّم نحو المستوى 8</span>
                                <span className="text-primary">72%</span>
                            </div>
                            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                                <div className="h-full w-[72%] rounded-full bg-primary" />
                            </div>
                        </div>

                        {/* البطاقات */}
                        <div className="mt-5 grid grid-cols-3 gap-2.5">
                            {HIGHLIGHTS.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div
                                        key={item.label}
                                        className="rounded-2xl border border-border bg-surface-soft p-3 text-center"
                                    >
                                        <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-primary">
                                            <Icon className="h-4 w-4" />
                                        </span>
                                        <p className="mt-2 text-sm font-black text-foreground">{item.value}</p>
                                        <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                                            {item.label}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* النصّ */}
                <div className="order-1 lg:order-2">
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">فضاء الطالب التفاعلي</p>
                    <h2 className="mt-3 text-3xl font-black tracking-tight text-foreground md:text-4xl">
                        تجربة تُحفّز الطالب، لا تراقبه فقط
                    </h2>
                    <p className="mt-4 max-w-xl text-base leading-relaxed text-foreground/80">
                        فضاء تفاعلي يحوّل بيانات الطالب إلى دافعية: إنجازات وتحدّيات ونقاط تميّز
                        تجعل الحضور والمشاركة والتعلّم رحلة ممتعة قابلة للقياس.
                    </p>

                    <ul className="mt-6 space-y-3">
                        {[
                            "مكافآت مرتبطة بسلوك وحضور وأداء حقيقي",
                            "تحدّيات أسبوعية تشجّع المشاركة الصفّية",
                            "لوحة تقدّم شخصية يراها الطالب ووليّ أمره",
                        ].map((point) => (
                            <li key={point} className="flex items-start gap-2.5">
                                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                <span className="text-sm font-medium text-foreground">{point}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    );
}
