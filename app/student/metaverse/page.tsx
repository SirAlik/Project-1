import Link from 'next/link';

// صفحة فهرس الـ metaverse للطالب — ميزة مقصودة (فضاء/غرفة الطالب التفاعلي).
// إصلاح توجيه فقط: تمنع 404 على /student/metaverse وتعرض روابط للوجهات الفرعية الموجودة.
// لا بيانات وهمية ولا إعادة تصميم — تصميم الفهرس الفعلي يُترك لتخطيط UX اللاحق.
const DESTINATIONS: { href: string; label: string }[] = [
    { href: '/student/metaverse/home', label: 'الرئيسية' },
    { href: '/student/metaverse/city', label: 'المدينة' },
    { href: '/student/metaverse/dorm', label: 'الغرفة' },
    { href: '/student/metaverse/quests', label: 'المهام' },
    { href: '/student/metaverse/profile', label: 'الملف الشخصي' },
];

export default function StudentMetaverseIndexPage() {
    return (
        <main className="min-h-screen bg-stone-50 px-6 py-10 text-foreground" dir="rtl">
            <section className="mx-auto max-w-2xl rounded-[2rem] border border-stone-200 bg-white/85 p-10 shadow-sm">
                <h1 className="mb-2 text-2xl font-black tracking-tight">العالم الافتراضي</h1>
                <p className="mb-6 text-sm text-muted-foreground">اختر الوجهة:</p>
                <nav className="flex flex-col gap-3">
                    {DESTINATIONS.map((d) => (
                        <Link
                            key={d.href}
                            href={d.href}
                            className="rounded-xl border border-stone-200 px-4 py-3 text-sm font-bold transition-colors hover:bg-stone-100"
                        >
                            {d.label}
                        </Link>
                    ))}
                </nav>
            </section>
        </main>
    );
}
