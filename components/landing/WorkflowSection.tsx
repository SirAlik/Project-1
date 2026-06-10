import { Workflow, Bot, ListChecks, Stamp, ArrowLeft, CheckCircle2 } from "lucide-react";

/**
 * "سير العمل والأتمتة" — القرار لا يبقى فكرة، بل يتحوّل إلى مسار مُؤتمت:
 * إحالات آلية، موافقات متعدّدة المراحل، ومهام مُسندة تلقائيًا.
 */

const FEATURES = [
    {
        icon: Bot,
        title: "إحالات آلية",
        desc: "غياب متكرّر أو حالة صحية تُنشئ إحالة وحالة تلقائيًا للجهة المختصّة.",
    },
    {
        icon: Stamp,
        title: "موافقات متعدّدة المراحل",
        desc: "رحلات وأنشطة وأذونات تمرّ بسلسلة اعتماد واضحة وموثّقة.",
    },
    {
        icon: ListChecks,
        title: "مهام مُسندة بذكاء",
        desc: "كل خطوة تصل للمسؤول عنها مع مهلة ومتابعة لحالة التنفيذ.",
    },
];

// خطوات مثال على سير عمل حيّ (توضيحي)
const FLOW_STEPS = [
    { label: "رصد غياب 3 أيام", state: "done" },
    { label: "إنشاء حالة تلقائيًا", state: "done" },
    { label: "إشعار وكيل شؤون الطلاب", state: "active" },
    { label: "جدولة لقاء وليّ أمر", state: "pending" },
];

export function WorkflowSection() {
    return (
        <section className="mx-auto max-w-7xl px-6 py-20 md:py-24">
            <div className="grid items-center gap-12 lg:grid-cols-2">
                {/* النصّ + الميزات */}
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">سير العمل والأتمتة</p>
                    <h2 className="mt-3 text-3xl font-black tracking-tight text-foreground md:text-4xl">
                        من القرار إلى التنفيذ — تلقائيًا
                    </h2>
                    <p className="mt-4 max-w-xl text-base leading-relaxed text-foreground/80">
                        لا تكتفي سِدرة بالتنبيه، بل تحوّل القرارات إلى مسارات عمل مُؤتمتة تتابع
                        نفسها بنفسها حتى الإغلاق، مع توثيق كامل لكل خطوة.
                    </p>

                    <div className="mt-8 space-y-4">
                        {FEATURES.map((feature) => {
                            const Icon = feature.icon;
                            return (
                                <div key={feature.title} className="flex items-start gap-4">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                                        <Icon className="h-5 w-5" />
                                    </span>
                                    <div>
                                        <h3 className="text-sm font-black text-foreground">{feature.title}</h3>
                                        <p className="mt-1 text-sm leading-relaxed text-foreground/75">
                                            {feature.desc}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* معاينة سير عمل */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                    <div className="mb-5 flex items-center gap-2">
                        <Workflow className="h-4 w-4 text-primary" />
                        <span className="text-sm font-black text-foreground">سير عمل: متابعة غياب</span>
                        <span className="mr-auto rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold text-primary">
                            نشط
                        </span>
                    </div>

                    <ol className="relative space-y-4">
                        {FLOW_STEPS.map((step, index) => {
                            const isDone = step.state === "done";
                            const isActive = step.state === "active";
                            return (
                                <li key={step.label} className="flex items-center gap-3">
                                    <span
                                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                            isDone
                                                ? "bg-primary text-primary-foreground"
                                                : isActive
                                                  ? "bg-accent text-primary ring-2 ring-primary/40"
                                                  : "bg-muted text-muted-foreground"
                                        }`}
                                    >
                                        {isDone ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                                    </span>
                                    <div
                                        className={`flex flex-1 items-center justify-between rounded-xl border px-3 py-2.5 ${
                                            isActive
                                                ? "border-primary/30 bg-accent/60"
                                                : "border-border bg-surface-soft"
                                        }`}
                                    >
                                        <span className="text-xs font-bold text-foreground">{step.label}</span>
                                        {isActive && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary">
                                                قيد التنفيذ
                                                <ArrowLeft className="h-3 w-3" />
                                            </span>
                                        )}
                                        {step.state === "pending" && (
                                            <span className="text-[10px] font-medium text-muted-foreground">
                                                بالانتظار
                                            </span>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            </div>
        </section>
    );
}
