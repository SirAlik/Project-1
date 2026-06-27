"use client";

import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { resetSchoolClasses } from "@/app/_actions/coordinator-classroom";

const CONFIRM_PHRASE = "إعادة تعيين";

// زر مدمّر معزول بمنطقة خطر: يتطلب كتابة عبارة تأكيد صريحة، ويُظهر نتيجة العملية (نجاح/فشل)
// بدل تجاهل قيمة الإجراء أو تنفيذه بنقرة واحدة عرضية.
export function ResetClassesButton({ schoolId }: { schoolId: string }) {
    const [open, setOpen] = useState(false);
    const [phrase, setPhrase] = useState("");
    const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
    const [isPending, startTransition] = useTransition();

    function confirmReset() {
        setResult(null);
        startTransition(async () => {
            const res = await resetSchoolClasses({ schoolId });
            if (res?.data?.success) {
                setResult({ ok: true, msg: "تمت إعادة تعيين الفصول بنجاح." });
                setOpen(false);
                setPhrase("");
            } else {
                // لا تسريب لرسالة قاعدة البيانات الخام — رسالة عربية آمنة.
                setResult({ ok: false, msg: "تعذّرت إعادة التعيين، يرجى المحاولة لاحقاً." });
            }
        });
    }

    return (
        <div className="flex flex-col items-end gap-2">
            <button
                onClick={() => { setOpen(true); setResult(null); }}
                className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2 text-xs font-bold text-destructive transition-colors hover:bg-destructive/10"
            >
                <AlertTriangle className="h-4 w-4" />
                منطقة خطر — إعادة تعيين الفصول
            </button>

            {result && (
                <p className={`text-xs font-bold ${result.ok ? "text-success" : "text-destructive"}`}>{result.msg}</p>
            )}

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm" dir="rtl">
                    <div className="w-full max-w-md rounded-2xl border border-destructive/30 bg-card p-6 shadow-xl">
                        <div className="mb-3 flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            <h3 className="text-base font-black">تأكيد إعادة تعيين الفصول</h3>
                        </div>
                        <p className="mb-4 text-sm leading-relaxed text-foreground/80">
                            سيؤدي هذا إلى <span className="font-bold text-destructive">حذف جميع الفصول الدراسية والجداول المرتبطة بها نهائياً</span> ولا يمكن التراجع.
                            للمتابعة اكتب «{CONFIRM_PHRASE}» في الحقل أدناه.
                        </p>
                        <input
                            value={phrase}
                            onChange={(e) => setPhrase(e.target.value)}
                            placeholder={CONFIRM_PHRASE}
                            className="mb-4 w-full rounded-xl border border-border bg-surface-soft p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-destructive/30"
                            dir="rtl"
                            aria-label="عبارة التأكيد"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setOpen(false); setPhrase(""); }}
                                className="flex-1 rounded-xl border border-border bg-card py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-muted"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={confirmReset}
                                disabled={phrase.trim() !== CONFIRM_PHRASE || isPending}
                                className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-bold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-40"
                            >
                                {isPending ? "جارٍ التنفيذ..." : "تأكيد الحذف النهائي"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
