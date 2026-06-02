import { ShieldAlert } from "lucide-react";

export default function SchoolAffairsPage() {
    return (
        <main className="min-h-screen bg-stone-50 px-6 py-10 text-foreground" dir="rtl">
            <section className="mx-auto flex max-w-3xl flex-col items-center rounded-[2rem] border border-stone-200 bg-white/85 p-10 text-center shadow-sm">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <ShieldAlert className="h-8 w-8" />
                </div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    وكيل الشؤون المدرسية
                </p>
                <h1 className="text-3xl font-black tracking-tight">
                    لا توجد تجربة تشغيلية متصلة بعد
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
                    تم استبدال صفحة الانتظار الداكنة بحالة واضحة. لا تُعرض بيانات أو مؤشرات هنا حتى يتم ربط هذا المسار بخدمات مدرسية حقيقية ومقيدة بسياق المدرسة.
                </p>
            </section>
        </main>
    );
}
