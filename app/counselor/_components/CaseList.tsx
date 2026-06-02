import React, { useMemo, useState } from "react";
import { CaseRow } from "@/lib/types/counselor";

interface CaseListProps {
    cases: CaseRow[];
    studentsList: { id: string; name: string }[];
    classesList: { id: string; name: string }[];
    studentNameById: (id: string | null) => string;
    classNameById: (id: string | null) => string;
    createCaseManual: (title: string, category: string, studentId: string, classId: string) => Promise<boolean>;
}

export function CaseList({
    cases,
    studentsList,
    classesList,
    studentNameById,
    classNameById,
    createCaseManual,
}: CaseListProps) {
    // Form State
    const [newCaseTitle, setNewCaseTitle] = useState("");
    const [newCaseCategory, setNewCaseCategory] = useState("");
    const [newCaseStudentId, setNewCaseStudentId] = useState("");
    const [newCaseClassId, setNewCaseClassId] = useState("");

    // Handler
    async function handleSubmit() {
        const success = await createCaseManual(
            newCaseTitle,
            newCaseCategory,
            newCaseStudentId,
            newCaseClassId
        );
        if (success) {
            setNewCaseTitle("");
            setNewCaseCategory("");
            setNewCaseStudentId("");
            setNewCaseClassId("");
        }
    }

    // Filter State
    const [studentQuery, setStudentQuery] = useState("");
    const [classQuery] = useState("");

    const filtered = useMemo(() => {
        return cases.filter((r) => {
            const sName = studentNameById(r.student_id);
            const cName = classNameById(r.class_id);
            const sOk = studentQuery.trim() ? sName.includes(studentQuery.trim()) : true;
            const cOk = classQuery.trim() ? cName.includes(classQuery.trim()) : true;
            return sOk && cOk;
        });
    }, [cases, studentQuery, classQuery, studentNameById, classNameById]);

    function fmtDateTime(iso: string) {
        return new Date(iso).toLocaleString("ar-SA", {
            year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"
        });
    }

    return (
        <section className="mt-4 grid gap-4 lg:grid-cols-12">
            {/* Form */}
            <div className="lg:col-span-4 rounded-2xl border border-stone-200 bg-white/80 p-5">
                <h3 className="text-lg font-semibold">فتح معاملة جديدة (بدون بلاغ)</h3>
                <p className="mt-1 text-xs text-stone-500">
                    زيارة/حالة نفسية/حالة صحية/اجتماعية… (تحفظ كسجل معاملات + إجراءات).
                </p>

                <label className="mt-3 block text-sm text-stone-600">عنوان المعاملة</label>
                <input
                    value={newCaseTitle}
                    onChange={(e) => setNewCaseTitle(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-stone-200 bg-stone-200/70 px-3 py-2 text-sm outline-none"
                    placeholder="مثال: حالة قلق / متابعة غياب / مشكلة سلوكية"
                />

                <label className="mt-3 block text-sm text-stone-600">التصنيف (اختياري)</label>
                <input
                    value={newCaseCategory}
                    onChange={(e) => setNewCaseCategory(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-stone-200 bg-stone-200/70 px-3 py-2 text-sm outline-none"
                    placeholder="مثال: حالة نفسية / حالة صحية / مشكلة سلوكية"
                />

                <label className="mt-3 block text-sm text-stone-600">الطالب (اختياري)</label>
                <select
                    value={newCaseStudentId}
                    onChange={(e) => setNewCaseStudentId(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-stone-200 bg-stone-200/70 px-3 py-2 text-sm outline-none"
                    aria-label="اختر الطالب"
                >
                    <option value="">— بدون تحديد —</option>
                    {studentsList.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.name}
                        </option>
                    ))}
                </select>

                <label className="mt-3 block text-sm text-stone-600">الفصل (اختياري)</label>
                <select
                    value={newCaseClassId}
                    onChange={(e) => setNewCaseClassId(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-stone-200 bg-stone-200/70 px-3 py-2 text-sm outline-none"
                    aria-label="اختر الفصل"
                >
                    <option value="">— بدون تحديد —</option>
                    {classesList.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>

                <button
                    onClick={handleSubmit}
                    className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500"
                >
                    إنشاء المعاملة
                </button>
            </div>

            {/* List */}
            <div className="lg:col-span-8 rounded-2xl border border-stone-200 bg-white/80 p-5">
                <div className="flex flex-wrap gap-2 mb-4">
                    <input
                        value={studentQuery} onChange={e => setStudentQuery(e.target.value)}
                        placeholder="بحث بالطالب..."
                        className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none"
                        aria-label="بحث عن معاملات طالب"
                    />
                </div>

                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">قائمة المعاملات</h2>
                    <div className="text-xs text-stone-500">عدد: {filtered.length}</div>
                </div>

                <div className="mt-4 space-y-2">
                    {filtered.length === 0 ? (
                        <div className="text-sm text-stone-500">لا توجد معاملات.</div>
                    ) : (
                        filtered.map((c) => (
                            <div key={c.id} className="rounded-xl border border-stone-200 bg-white/80 p-4">
                                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="text-sm">
                                        <span className="font-semibold">{c.title || "بدون عنوان"}</span>
                                        <span className="text-stone-500"> — </span>
                                        <span className="text-stone-600">{c.status}</span>
                                    </div>
                                    <div className="text-xs text-stone-500">{fmtDateTime(c.created_at)}</div>
                                </div>

                                <div className="mt-2 text-xs text-stone-500">
                                    التصنيف: {c.category ?? "—"} • الطالب: {studentNameById(c.student_id)} • الفصل:{" "}
                                    {classNameById(c.class_id)}
                                </div>

                                <div className="mt-2 text-xs text-stone-500">
                                    opened_by: {c.opened_by_name ?? "—"} / {c.opened_by_role ?? "—"} • assigned_to:{" "}
                                    {c.assigned_to_role ?? "—"}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}
