import type { Metadata } from "next";
import { LayoutGrid, BellRing, LineChart } from "lucide-react";
import { LoginCard } from "@/components/landing/LoginCard";

export const metadata: Metadata = {
    // العنوان النهائي في التبويب: "تسجيل الدخول | سِدرة" عبر قالب الجذر في app/layout.tsx
    title: "تسجيل الدخول",
};

// بطاقات ثقة تحليلية مختصرة تُعرَض في لوحة العلامة (تجميلية — بلا منطق)
const TRUST_CARDS = [
    { icon: LayoutGrid, title: "لوحات أدوار ذكية", desc: "لكل دور مساحة عمل مخصّصة بمؤشّراته." },
    { icon: BellRing, title: "تنبيهات وتوصيات لحظية", desc: "النظام ينبّهك ويقترح الإجراء التالي." },
    { icon: LineChart, title: "من البيانات إلى القرارات", desc: "تحليل لحظي يحوّل أرقامك إلى قرار." },
];

/**
 * صفحة تسجيل الدخول — صفحة مستقلّة (ليست modal). تخطيط عمودين premium:
 * نموذج الدخول (يمين في RTL) + لوحة العلامة/المنتج (يسار، تنزل أسفل النموذج على الجوّال).
 * لا منطق مصادقة هنا — كل المصادقة داخل <LoginCard /> (Client) دون تغيير.
 */
export default function LoginPage() {
    return (
        <div
            dir="rtl"
            className="flex min-h-[calc(100vh-6rem)] items-center justify-center bg-background px-4 py-10 sm:px-6"
        >
            <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-border bg-card shadow-[0_24px_60px_-24px_rgba(17,24,39,0.18)] lg:grid-cols-2">
                {/* عمود نموذج الدخول — يمين في RTL */}
                <div className="order-1 flex flex-col justify-center p-8 sm:p-10 lg:p-12">
                    <LoginCard />
                </div>

                {/* لوحة العلامة/المنتج — يسار في RTL · تنزل أسفل النموذج على الجوّال */}
                <aside className="order-2 flex flex-col justify-between gap-10 border-t border-border bg-gradient-to-br from-accent/50 to-surface-soft p-8 sm:p-10 lg:border-l-0 lg:border-r lg:border-t-0 lg:p-12">
                    <div>
                        <p className="text-3xl font-black tracking-tight text-foreground">سِدرة</p>
                        <p className="mt-2 text-sm font-bold text-foreground/80">
                            نظام تشغيل مدرسي قائم على البيانات
                        </p>
                        <p className="mt-6 max-w-sm text-sm leading-relaxed text-foreground/70">
                            منصّة واحدة تُحوّل بيانات مدرستك إلى رؤى وتنبيهات وتوصيات وقرارات تصل لكل
                            دور في مساحة عمله.
                        </p>
                    </div>

                    <ul className="space-y-3">
                        {TRUST_CARDS.map((card) => {
                            const Icon = card.icon;
                            return (
                                <li
                                    key={card.title}
                                    className="flex items-start gap-3 rounded-2xl border border-border bg-card/70 p-3.5"
                                >
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                                        <Icon className="h-5 w-5" />
                                    </span>
                                    <div>
                                        <p className="text-sm font-bold text-foreground">{card.title}</p>
                                        <p className="mt-0.5 text-xs leading-relaxed text-foreground/70">
                                            {card.desc}
                                        </p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </aside>
            </div>
        </div>
    );
}
