import { ShieldCheck, Building2, Lock, KeyRound } from "lucide-react";

/**
 * "الأمان والثقة" — أساس متعدّد المستأجرين (Multi-tenant) مع عزل صارم:
 * كل مدرسة معزولة ببياناتها عبر RLS، وكل صلاحية محكومة بالدور.
 */

const PILLARS = [
    {
        icon: Building2,
        title: "عزل متعدّد المستأجرين",
        desc: "بيانات كل مدرسة معزولة تمامًا عبر school_id — لا تسرّب بين المدارس إطلاقًا.",
    },
    {
        icon: ShieldCheck,
        title: "أمان على مستوى الصف (RLS)",
        desc: "كل جدول محميّ بسياسات Row Level Security تُطبَّق في قاعدة البيانات نفسها.",
    },
    {
        icon: KeyRound,
        title: "صلاحيات قائمة على الدور",
        desc: "نظام PBAC يضمن أن كل مستخدم يرى ويُعدّل ما تسمح به صلاحياته فقط.",
    },
    {
        icon: Lock,
        title: "هوية موقّعة بـ JWT",
        desc: "الجلسات والسياق محميّة بمفاتيح موقّعة خادميًا — لا تُزوَّر من العميل.",
    },
];

export function TrustSection() {
    return (
        <section id="trust" className="border-y border-border bg-surface-soft">
            <div className="mx-auto max-w-7xl px-6 py-20 md:py-24">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">الأمان والثقة</p>
                    <h2 className="mt-3 text-3xl font-black tracking-tight text-foreground md:text-4xl">
                        مبنيّ على عزل صارم منذ الأساس
                    </h2>
                    <p className="mt-4 text-base leading-relaxed text-foreground/80">
                        الأمان ليس إضافة لاحقة. كل بيانات المدرسة معزولة، وكل صلاحية محكومة، وكل
                        وصول موثّق — على مستوى قاعدة البيانات لا واجهة العرض فقط.
                    </p>
                </div>

                <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {PILLARS.map((pillar) => {
                        const Icon = pillar.icon;
                        return (
                            <div
                                key={pillar.title}
                                className="rounded-2xl border border-border bg-card p-6 shadow-sm"
                            >
                                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary">
                                    <Icon className="h-6 w-6" />
                                </span>
                                <h3 className="mt-4 text-base font-black text-foreground">{pillar.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-foreground/75">{pillar.desc}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
