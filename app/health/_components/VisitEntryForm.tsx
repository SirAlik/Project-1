import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import type { HealthVisit } from "@/lib/types/health";

interface VisitInput {
    student_id: string;
    student_name: string;
    class_id: string | null;
    visit_reason: string;
    complaint: string;
    action_taken: string;
    status: "completed" | "referred";
}

interface Props {
    students: { id: string; name: string; class_id: string }[];
    onSubmit: (visit: VisitInput) => Promise<HealthVisit | null>;
}

export function VisitEntryForm({ students, onSubmit }: Props) {
    const [studentId, setStudentId] = useState("");
    const [visitReason, setVisitReason] = useState("صداع"); // Default reason
    const [complaint, setComplaint] = useState("");
    const [action, setAction] = useState("إبلاغ ولي الأمر");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!studentId) return;

        setLoading(true);
        const student = students.find(s => s.id === studentId);
        const studentName = student?.name || "غير معروف";
        const classId = student?.class_id || null;

        await onSubmit({
            student_id: studentId,
            student_name: studentName,
            class_id: classId,
            visit_reason: visitReason,
            complaint,
            action_taken: action,
            status: action === "تحويل للمستشفى" || action === "تحويل للمركز الصحي" ? "referred" : "completed"
        });
        setLoading(false);
        setComplaint("");
        setStudentId("");
    }

    return (
        <Card title="تسجيل زيارة (إداري)">
            <div className="mb-4 bg-[hsla(var(--accent-primary),.10)] border border-[hsla(var(--accent-primary),.20)] p-2 rounded-lg text-xs text-[hsla(var(--accent-primary),.65)]">
                ⚠️ تنبيه: هذا السجل إداري فقط لتوثيق حضور الطالب للموجّه الصحي. لا يعتبر تشخيصاً طبياً.
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-stone-500">الطالب</label>
                        <select
                            value={studentId} onChange={e => setStudentId(e.target.value)}
                            className="w-full bg-white border border-stone-300 rounded-xl p-2 text-sm"
                            required
                            title="الطالب"
                        >
                            <option value="">اختر الطالب...</option>
                            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs text-stone-500">سبب الزيارة</label>
                        <select
                            value={visitReason} onChange={e => setVisitReason(e.target.value)}
                            className="w-full bg-white border border-stone-300 rounded-xl p-2 text-sm"
                            required
                            title="سبب الزيارة"
                        >
                            <option value="صداع">صداع</option>
                            <option value="ألم بطن">ألم بطن</option>
                            <option value="إصابة رياضية">إصابة رياضية</option>
                            <option value="ارتفاع حرارة">ارتفاع حرارة</option>
                            <option value="أزمة تنفسية">أزمة تنفسية</option>
                            <option value="أخرى">أخرى</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="text-xs text-stone-500">الشكوى الظاهرة (وصف الطالب)</label>
                    <input
                        value={complaint} onChange={e => setComplaint(e.target.value)}
                        placeholder="مثال: ألم في الرأس منذ الصباح..."
                        className="w-full bg-white border border-stone-300 rounded-xl p-2 text-sm"
                        required
                        aria-label="الشكوى الظاهرة"
                    />
                </div>

                <div>
                    <label className="text-xs text-stone-500">الإجراء المتخذ</label>
                    <select
                        value={action} onChange={e => setAction(e.target.value)}
                        className="w-full bg-white border border-stone-300 rounded-xl p-2 text-sm"
                        aria-label="الإجراء المتخذ"
                    >
                        <option value="راحة بالمكتب">راحة بالمكتب</option>
                        <option value="إبلاغ ولي الأمر">إبلاغ ولي الأمر</option>
                        <option value="عودة للفصل">عودة للفصل</option>
                        <option value="تحويل للمركز الصحي">تحويل للمركز الصحي</option>
                        <option value="تحويل للمستشفى">تحويل للمستشفى</option>
                    </select>
                </div>

                <button disabled={loading} className="w-full bg-rose-600 hover:bg-rose-500 text-white py-2 rounded-xl text-sm font-bold shadow-lg shadow-rose-600/20 transition active:scale-95">
                    {loading ? "جاري التسجيل..." : "تسجيل الزيارة"}
                </button>
            </form>
        </Card>
    );
}
