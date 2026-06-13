import React, { useState, useEffect, startTransition } from "react";
import { QualityFormWrapper } from "./QualityFormWrapper";
import { CaseRow } from "@/lib/types/counselor";

interface Props {
    studentsList: { id: string; name: string; class_id?: string }[];
    classesList: { id: string; name: string }[];
    cases: CaseRow[];
    user?: unknown;
    userName?: string | null;
}

export function Form42_IndividualSession({ studentsList, classesList, cases, userName }: Props) {
    const [selectedStudent, setSelectedStudent] = useState("");
    const [selectedCaseId, setSelectedCaseId] = useState("");
    const [topic, setTopic] = useState("");
    const [notes, setNotes] = useState("");
    const [dateTime, setDateTime] = useState("");

    useEffect(() => {
        // Automated Date & Time Recording
        const now = new Date();
        const formatted = now.toLocaleString("ar-SA", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
        startTransition(() => setDateTime(formatted));
    }, []);

    const student = studentsList.find(s => s.id === selectedStudent);
    const className = classesList.find(c => c.id === student?.class_id)?.name || "—";

    const studentCases = cases.filter(c => c.student_id === selectedStudent && c.status !== "closed");

    return (
        <QualityFormWrapper
            id="form-42-print"
            title="نموذج مقابلة فردية"
            code="QF-71-F-4-2"
            fileName={`مقابلة_فردية_${student?.name || "طالب"}`}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-white/80 p-6 rounded-xl border border-stone-200">
                <div className="space-y-1">
                    <label className="text-xs text-stone-500 block">اختيار الطالب</label>
                    <select
                        value={selectedStudent}
                        onChange={(e) => { setSelectedStudent(e.target.value); setSelectedCaseId(""); }}
                        className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-teal-500 outline-none"
                        aria-label="اختيار الطالب"
                    >
                        <option value="">-- اختر طالب --</option>
                        {studentsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-stone-500 block">ربط المعاملة (إن وجد)</label>
                    <select
                        value={selectedCaseId}
                        onChange={(e) => setSelectedCaseId(e.target.value)}
                        className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-teal-500 outline-none"
                        disabled={!selectedStudent}
                        aria-label="ربط المعاملة"
                    >
                        <option value="">-- جلسة عامة (بدون معاملة) --</option>
                        {studentCases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-stone-500 block">التاريخ والوقت (تلقائي)</label>
                    <div className="bg-white/80 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-500">
                        {dateTime}
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-stone-500 block">الصف الدراسي</label>
                    <div className="bg-white/80 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-500">
                        {className}
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-stone-500 block">الموجه الطلابي</label>
                    <div className="bg-white/80 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-500">
                        {userName || "—"}
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-stone-600">موضوع المقابلة</label>
                    <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="مثال: صعوبات دراسية، تحسين سلوك..."
                        className="w-full bg-stone-100 border border-stone-300 rounded-xl px-4 py-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all"
                        aria-label="موضوع المقابلة"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-stone-600">ملاحظات ونتائج الجلسة</label>
                    <textarea
                        rows={5}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full bg-stone-100 border border-stone-300 rounded-xl px-4 py-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all resize-none"
                        aria-label="ملاحظات ونتائج الجلسة"
                    />
                </div>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-20 text-center">
                <div className="space-y-4">
                    <div className="border-b-2 border-stone-200 pb-2 text-stone-500 text-sm">توقيع الموجه</div>
                    <div className="font-bold text-stone-500">{userName}</div>
                </div>
                <div className="space-y-4">
                    <div className="border-b-2 border-stone-200 pb-2 text-stone-500 text-sm">توقيع الطالب</div>
                    <div className="font-bold text-stone-500">{student?.name || "..................."}</div>
                </div>
            </div>
        </QualityFormWrapper>
    );
}
