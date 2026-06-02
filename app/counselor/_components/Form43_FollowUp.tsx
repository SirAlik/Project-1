import React, { useState } from "react";
import { QualityFormWrapper } from "./QualityFormWrapper";
import { CaseRow } from "@/lib/types/counselor";

interface Props {
    studentsList: { id: string; name: string; class_id?: string }[];
    classesList: { id: string; name: string }[];
    cases: CaseRow[];
    user?: unknown;
}

export function Form43_FollowUp({ studentsList, classesList, cases }: Props) {
    const [selectedStudent, setSelectedStudent] = useState("");
    const [selectedCaseId, setSelectedCaseId] = useState("");
    const [caseHistory, setCaseHistory] = useState("");
    const [followUpNotes, setFollowUpNotes] = useState("");

    const student = studentsList.find(s => s.id === selectedStudent);
    const className = classesList.find(c => c.id === student?.class_id)?.name || "—";

    const studentCases = cases.filter(c => c.student_id === selectedStudent && c.status !== "closed");

    return (
        <QualityFormWrapper
            id="form-43-print"
            title="نموذج متابعة حالة"
            code="QF-71-F-4-3"
            fileName={`متابعة_حالة_${student?.name || "طالب"}`}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-white/80 p-6 rounded-xl border border-stone-200">
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
                    <label className="text-xs text-stone-500 block">ربط المعاملة</label>
                    <select
                        value={selectedCaseId}
                        onChange={(e) => setSelectedCaseId(e.target.value)}
                        className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-purple-500 outline-none"
                        disabled={!selectedStudent}
                        aria-label="ربط المعاملة"
                    >
                        <option value="">-- اختر المعاملة للمتابعة --</option>
                        {studentCases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-stone-500 block">الصف الدراسي</label>
                    <div className="bg-white/80 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-500">
                        {className}
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-stone-600">ملخص الإجراءات السابقة</label>
                    <textarea
                        rows={4}
                        value={caseHistory}
                        onChange={(e) => setCaseHistory(e.target.value)}
                        placeholder="اذكر بإيجاز ما تم القيام به سابقاً لهذه الحالة..."
                        className="w-full bg-stone-100 border border-stone-300 rounded-xl px-4 py-3 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all resize-none"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-stone-600">ملاحظات المتابعة الحالية</label>
                    <textarea
                        rows={5}
                        value={followUpNotes}
                        onChange={(e) => setFollowUpNotes(e.target.value)}
                        placeholder="اكتب التطورات في حالة الطالب أو أي ملاحظات جديدة..."
                        className="w-full bg-stone-100 border border-stone-300 rounded-xl px-4 py-3 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all resize-none"
                    />
                </div>
            </div>

            <div className="mt-12 bg-white/80 p-6 rounded-xl border border-stone-200 border-dashed">
                <h3 className="text-sm font-bold text-stone-600 mb-4 text-center border-b border-stone-200 pb-2">سجل المراجعة الدورية</h3>
                <table className="w-full text-sm text-right">
                    <thead>
                        <tr className="text-stone-500 text-xs uppercase">
                            <th className="pb-3 px-2">التاريخ</th>
                            <th className="pb-3 px-2">نوع الإجراء</th>
                            <th className="pb-3 px-2">النتيجة</th>
                            <th className="pb-3 px-2">توقيع الموجه</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        <tr className="text-stone-500">
                            <td className="py-3 px-2">—</td>
                            <td className="py-3 px-2">—</td>
                            <td className="py-3 px-2">—</td>
                            <td className="py-3 px-2">—</td>
                        </tr>
                        <tr className="text-stone-500">
                            <td className="py-3 px-2">—</td>
                            <td className="py-3 px-2">—</td>
                            <td className="py-3 px-2">—</td>
                            <td className="py-3 px-2">—</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </QualityFormWrapper>
    );
}
