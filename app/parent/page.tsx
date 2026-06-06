import { Users } from "lucide-react";

// صفحة هبوط ولي الأمر — حالة فارغة آمنة.
// لا تُعرض بيانات أبناء أو حضور أو تقارير وهمية حتى ربط الحساب بأبنائه عبر علاقات موثّقة.
export default function ParentHomePage() {
    return (
        <main className="min-h-screen bg-stone-50 px-6 py-10 text-foreground" dir="rtl">
            <section className="mx-auto flex max-w-3xl flex-col items-center rounded-[2rem] border border-stone-200 bg-white/85 p-10 text-center shadow-sm">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Users className="h-8 w-8" />
                </div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    بوابة ولي الأمر
                </p>
                <h1 className="text-3xl font-black tracking-tight">
                    لا توجد بيانات أبناء متصلة بعد
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
                    هذه صفحة هبوط مبدئية لولي الأمر. لا تُعرض حضور أو تقارير أو إشعارات هنا حتى يتم
                    ربط الحساب بأبنائه عبر علاقات موثّقة ومقيدة بسياق المدرسة.
                </p>
            </section>
        </main>
    );
}
