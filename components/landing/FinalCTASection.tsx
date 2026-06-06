import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

interface FinalCTASectionProps {
    ctaHref: string;
    ctaLabel: string;
}

export function FinalCTASection({ ctaHref, ctaLabel }: FinalCTASectionProps) {
    return (
        <section className="mx-auto max-w-7xl px-6 py-20 md:py-24">
            <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-card px-8 py-14 text-center shadow-sm md:py-20">
                {/* خلفية teal خفيفة جدًا */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-accent/70 to-card"
                />

                <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-4 py-1.5 text-xs font-bold text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    ابدأ اليوم
                </span>

                <h2 className="mx-auto mt-6 max-w-2xl text-balance text-3xl font-black tracking-tight text-foreground md:text-4xl lg:text-5xl">
                    حوّل بيانات مدرستك إلى قرارات تصنع الفرق
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-foreground/80">
                    نظام تشغيل واحد لكل أدوار مدرستك — من الحضور إلى القرار، بأمان وعزل
                    تامّ للبيانات.
                </p>

                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <Link
                        href={ctaHref}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:w-auto"
                    >
                        ابدأ رحلة Sidra OS
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <span className="text-xs font-medium text-muted-foreground">
                        {ctaLabel === "الدخول إلى النظام"
                            ? "أنت مسجّل بالفعل — تابع إلى مساحتك"
                            : "تسجيل دخول آمن خلال ثوانٍ"}
                    </span>
                </div>
            </div>
        </section>
    );
}
