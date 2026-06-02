import { Sparkles } from "lucide-react";

export function MetaverseUnavailable({ title }: { title: string }) {
    return (
        <section className="rounded-[2rem] border border-stone-200 bg-white/85 p-8 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-7 w-7" />
            </div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                تجربة الطالب
            </p>
            <h1 className="text-2xl font-black tracking-tight">{title}</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
                هذا المسار معزول حالياً لأنه لم يُربط بعد ببيانات طالب حقيقية. لن يتم عرض نقاط، مهام، ترتيب، أو عناصر تفاعلية افتراضية داخل مسارات الإنتاج.
            </p>
        </section>
    );
}
