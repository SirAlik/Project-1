import { GraduationCap } from "lucide-react";

// بوابة الطالب — صفحة هبوط مبدئية بحالة فارغة آمنة.
// لا تُعرض أي بيانات أو مؤشرات وهمية حتى ربط المسار بخدمات حقيقية مقيدة بسياق الطالب.
export default function StudentHomePage() {
    return (
        <main className="min-h-screen bg-stone-50 px-6 py-10 text-foreground" dir="rtl">
            <section className="mx-auto flex max-w-3xl flex-col items-center rounded-[2rem] border border-stone-200 bg-white/85 p-10 text-center shadow-sm">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <GraduationCap className="h-8 w-8" />
                </div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    بوابة الطالب
                </p>
                <h1 className="text-3xl font-black tracking-tight">
                    لا توجد بيانات طالب متصلة بعد
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
                    هذه صفحة هبوط مبدئية للطالب. لا تُعرض جداول أو مهام أو مؤشرات هنا حتى يتم
                    ربط هذا المسار بخدمات حقيقية مقيدة بسياق الطالب والمدرسة.
                </p>
            </section>
        </main>
    );
}
