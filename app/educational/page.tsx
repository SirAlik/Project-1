import Link from "next/link";
import { BookOpenCheck, FlaskConical, HeartPulse, Library, ShieldAlert } from "lucide-react";

const MODULES = [
    {
        href: "/classroom",
        title: "الكادر التعليمي",
        description: "إدارة الصفوف والحضور والتحصيل بعد ربطها ببيانات حقيقية.",
        icon: BookOpenCheck,
    },
    {
        href: "/lrc",
        title: "مصادر التعلم",
        description: "لا تُعرض مؤشرات مكتبة تقديرية هنا؛ كل قراءة يجب أن تأتي من الخدمة الرسمية.",
        icon: Library,
    },
    {
        href: "/science",
        title: "المختبر",
        description: "حجوزات المختبر والمخزون تظهر بعد اكتمال الربط التشغيلي.",
        icon: FlaskConical,
    },
    {
        href: "/health",
        title: "الصحة المدرسية",
        description: "الزيارات الصحية لا تُلخص بأرقام ثابتة أو افتراضية.",
        icon: HeartPulse,
    },
];

export default function EducationalAffairsPage() {
    return (
        <main className="min-h-screen bg-stone-50 text-foreground px-6 py-10" dir="rtl">
            <div className="mx-auto max-w-7xl space-y-8">
                <header className="rounded-[2rem] border border-stone-200 bg-white/85 p-8 shadow-sm">
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <ShieldAlert className="h-7 w-7" />
                    </div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        الشؤون التعليمية
                    </p>
                    <h1 className="text-3xl font-black tracking-tight">
                        لا توجد لوحة مؤشرات تعليمية جاهزة
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                        تمت إزالة المؤشرات الثابتة من هذه الصفحة. ستعرض هذه المنطقة ملخصات الشؤون التعليمية فقط بعد اعتماد مصادر بيانات حقيقية لكل وحدة.
                    </p>
                </header>

                <section className="grid gap-4 md:grid-cols-2">
                    {MODULES.map((module) => {
                        const Icon = module.icon;
                        return (
                            <Link
                                key={module.href}
                                href={module.href}
                                className="rounded-2xl border border-stone-200 bg-white/85 p-6 shadow-sm transition-colors hover:border-primary/30"
                            >
                                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <h2 className="text-base font-black">{module.title}</h2>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">{module.description}</p>
                            </Link>
                        );
                    })}
                </section>
            </div>
        </main>
    );
}
