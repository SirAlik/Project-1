import Link from "next/link";
import { ArrowLeft, PlayCircle, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { HeroDashboardPreview } from "./HeroDashboardPreview";

interface HeroSectionProps {
    ctaHref: string;
    ctaLabel: string;
}

const TRUST_CHIPS = [
    { icon: ShieldCheck, label: "عزل مستأجر صارم (RLS)" },
    { icon: Zap, label: "تنبيهات وقرارات لحظية" },
    { icon: Sparkles, label: "رؤى مدعومة بالذكاء" },
];

export function HeroSection({ ctaHref, ctaLabel }: HeroSectionProps) {
    return (
        <section className="relative overflow-hidden">
            {/* خلفية متدرّجة دافئة خفيفة جدًا (vanilla → off-white) — لا داكن ولا زجاج */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-accent/40 via-background to-background"
            />

            <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-16 pt-12 lg:grid-cols-[1fr_1.05fr] lg:gap-10 lg:pb-24 lg:pt-16">
                {/* العمود النصّي */}
                <div className="text-center lg:text-right">
                    <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent px-4 py-1.5 text-xs font-bold text-primary">
                        <Sparkles className="h-3.5 w-3.5" />
                        نظام تشغيل المدرسة المدفوع بالبيانات
                    </span>

                    <h1 className="mt-6 text-balance text-5xl font-black leading-[1.1] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                        مدرستي
                    </h1>

                    <p className="mt-4 text-2xl font-bold tracking-tight text-primary sm:text-3xl lg:text-4xl">
                        من البيانات إلى القرارات
                    </p>

                    <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-foreground/80 lg:mx-0 lg:text-lg">
                        ليس مجرد سجلات وإدخال بيانات. منصّة واحدة تُحوّل بيانات مدرستك إلى رؤى
                        وتنبيهات ومخاطر وتوصيات وسير عمل — ثم إلى قرارات تصل لكل دور في مساحة عمله.
                    </p>

                    {/* أزرار الدعوة للإجراء */}
                    <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                        <Link
                            href={ctaHref}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:w-auto"
                        >
                            {ctaLabel}
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                        <a
                            href="#how"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-bold text-foreground transition-colors hover:bg-muted sm:w-auto"
                        >
                            <PlayCircle className="h-4 w-4 text-primary" />
                            شاهد كيف يعمل
                        </a>
                    </div>

                    {/* شارات الثقة */}
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 lg:justify-start">
                        {TRUST_CHIPS.map((chip) => {
                            const Icon = chip.icon;
                            return (
                                <span
                                    key={chip.label}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground/80"
                                >
                                    <Icon className="h-4 w-4 text-primary" />
                                    {chip.label}
                                </span>
                            );
                        })}
                    </div>
                </div>

                {/* العمود البصري: معاينة اللوحة */}
                <div className="lg:pr-2">
                    <HeroDashboardPreview />
                </div>
            </div>
        </section>
    );
}
