import React, { useState, useEffect, startTransition } from "react";
import { QualityFormWrapper } from "./QualityFormWrapper";
import { CaseRow } from "@/lib/types/counselor";

interface Props {
    studentsList: { id: string; name: string; class_id?: string }[];
    classesList: { id: string; name: string }[];
    cases: CaseRow[];
    getAbsenceCount: (studentId: string) => Promise<number>;
    user?: unknown;
}

export function Form82_AbsenceFollowUp({ studentsList, classesList, cases, getAbsenceCount }: Props) {
    const [selectedStudent, setSelectedStudent] = useState("");
    const [selectedCaseId, setSelectedCaseId] = useState("");
    const [absenceDays, setAbsenceDays] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [justification, setJustification] = useState("");
    const [actionTaken, setActionTaken] = useState("");

    useEffect(() => {
        if (selectedStudent) {
            startTransition(async () => {
                setLoading(true);
                const count = await getAbsenceCount(selectedStudent);
                setAbsenceDays(count);
                setLoading(false);
            });
        } else {
            startTransition(() => setAbsenceDays(null));
        }
    }, [selectedStudent, getAbsenceCount]);

    const student = studentsList.find(s => s.id === selectedStudent);
    const className = classesList.find(c => c.id === student?.class_id)?.name || "—";

    const studentCases = cases.filter(c => c.student_id === selectedStudent && c.category === "غياب/تأخر");

    return (
        <QualityFormWrapper
            id="form-82-print"
            title="نموذج متابعة غياب طالب"
            code="QF-71-F-8-2"
            fileName={`متابعة_غياب_${student?.name || "طالب"}`}
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-white/80 p-6 rounded-xl border border-stone-200">
                <div className="space-y-1">
                    <label className="text-xs text-stone-500 block">اختيار الطالب</label>
                    <select
                        value={selectedStudent}
                        onChange={(e) => { setSelectedStudent(e.target.value); setSelectedCaseId(""); }}
                        className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-purple-500 outline-none"
                        title="اختيار الطالب"
                    >
                        <option value="">-- اختر طالب --</option>
                        {studentsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-stone-500 block">المعاملة المرتبطة</label>
                    <select
                        value={selectedCaseId}
                        onChange={(e) => setSelectedCaseId(e.target.value)}
                        className="w-full bg-white/80 border border-stone-200 rounded-lg px-4 py-3 text-sm focus:border-emerald-500 outline-none"
                        aria-label="نوع الغياب"
                        disabled={!selectedStudent}
                    >
                        <option value="">-- اختر معاملة غياب --</option>
                        {studentCases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-stone-500 block">الصف الدراسي</label>
                    <div className="bg-white/80 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-500">
                        {className}
                    </div>
                </div>

                <div className="space-y-1 flex flex-col justify-end">
                    <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg">
                        <div className="text-xs font-bold text-rose-400">إجمالي أيام الغياب المسجلة:</div>
                        <div className="text-xl font-black text-rose-500">
                            {loading ? "..." : (absenceDays ?? "—")}
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                <div className="bg-white/80 p-6 rounded-xl border border-stone-200">
                    <h3 className="text-sm font-bold text-stone-600 mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                        أسباب الغياب وخطوات المعالجة
                    </h3>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs text-stone-500">تسويغ الغياب (رأي ولي الأمر/الطالب)</label>
                            <textarea
                                rows={3}
                                value={justification}
                                onChange={(e) => setJustification(e.target.value)}
                                className="w-full h-32 bg-white/80 border border-stone-200 rounded-lg p-4 text-sm focus:border-emerald-500 outline-none resize-none"
                                placeholder="اكتب تفاصيل التواصل..."
                                aria-label="تفاصيل التواصل"
                            ></textarea>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-stone-500">الإجراء المتخذ من قبل التوجيه الطلابي</label>
                            <textarea
                                rows={3}
                                value={actionTaken}
                                onChange={(e) => setActionTaken(e.target.value)}
                                className="w-full bg-white border border-stone-200 rounded-lg px-4 py-2 text-sm focus:border-purple-500 outline-none transition-all resize-none"
                                aria-label="الإجراء المتخذ"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white/80 p-6 rounded-xl border border-stone-200">
                        <h3 className="text-sm font-bold text-stone-600 mb-4">بيانات التواصل مع ولي الأمر</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between text-xs py-2 border-b border-stone-200">
                                <span className="text-stone-500">تاريخ الاتصال الأولى:</span>
                                <span className="text-stone-500">.... / .... / 1447هـ</span>
                            </div>
                            <div className="flex justify-between text-xs py-2 border-b border-stone-200">
                                <span className="text-stone-500">النتيجة:</span>
                                <span className="text-stone-500">........................</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/80 p-6 rounded-xl border border-stone-200 flex flex-col justify-center items-center text-center">
                        <p className="text-xs text-stone-500 mb-6 font-bold">تعهد الطالب بالمواظبة</p>
                        <div className="w-full border-b border-stone-200 mb-2"></div>
                        <p className="text-[10px] text-stone-500">توقيع الطالب المعني</p>
                    </div>
                </div>
            </div>
        </QualityFormWrapper>
    );
}
