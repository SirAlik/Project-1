import React, { useMemo, useState } from "react";
import { SessionRow } from "@/lib/types/counselor";

interface SessionListProps {
    sessions: SessionRow[];
    studentsList: { id: string; name: string }[];
    classesList: { id: string; name: string }[];
    studentNameById: (id: string | null) => string;
    classNameById: (id: string | null) => string;
    addSession: (p: {
        studentId: string;
        classId: string;
        type: string;
        topic: string;
        notes: string;
        actions: string;
        followUpRequired: boolean;
        followUpDate: string;
    }) => Promise<boolean>;
}

export function SessionList({
    sessions,
    studentsList,
    classesList,
    studentNameById,
    classNameById,
    addSession,
}: SessionListProps) {
    // Form State
    const [newSessionStudentId, setNewSessionStudentId] = useState("");
    const [newSessionClassId, setNewSessionClassId] = useState("");
    const [newSessionType, setNewSessionType] = useState("وقائية");
    const [newSessionTopic, setNewSessionTopic] = useState("");
    const [newSessionNotes, setNewSessionNotes] = useState("");
    const [newSessionActions, setNewSessionActions] = useState("");
    const [newFollowUpRequired, setNewFollowUpRequired] = useState(false);
    const [newFollowUpDate, setNewFollowUpDate] = useState("");

    // Handler
    async function handleSubmit() {
        const success = await addSession({
            studentId: newSessionStudentId,
            classId: newSessionClassId,
            type: newSessionType,
            topic: newSessionTopic,
            notes: newSessionNotes,
            actions: newSessionActions,
            followUpRequired: newFollowUpRequired,
            followUpDate: newFollowUpDate
        });

        if (success) {
            setNewSessionStudentId("");
            setNewSessionClassId("");
            setNewSessionType("وقائية");
            setNewSessionTopic("");
            setNewSessionNotes("");
            setNewSessionActions("");
            setNewFollowUpRequired(false);
            setNewFollowUpDate("");
        }
    }

    // Filter State
    const [studentQuery, setStudentQuery] = useState("");

    const filtered = useMemo(() => {
        return sessions.filter((r) => {
            const sName = studentNameById(r.student_id);
            const sOk = studentQuery.trim() ? sName.includes(studentQuery.trim()) : true;
            return sOk;
        });
    }, [sessions, studentQuery, studentNameById]);

    function fmtDateTime(iso: string) {
        return new Date(iso).toLocaleString("ar-SA", {
            year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"
        });
    }

    return (
        <section className="mt-4 grid gap-4 lg:grid-cols-12">
            {/* Form */}
            <div className="lg:col-span-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
                <h3 className="text-lg font-semibold">تسجيل جلسة إرشادية</h3>
                <p className="mt-1 text-xs text-zinc-400">
                    ✅ متوافق مع جدولك: (session_type / topic / notes / actions_taken).
                </p>

                <label className="mt-3 block text-sm text-zinc-300">الطالب</label>
                <select
                    value={newSessionStudentId}
                    onChange={(e) => setNewSessionStudentId(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-zinc-800 bg-black/40 px-3 py-2 text-sm outline-none"
                    title="الطالب"
                >
                    <option value="">— اختر الطالب —</option>
                    {studentsList.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.name}
                        </option>
                    ))}
                </select>

                <label className="mt-3 block text-sm text-zinc-300">الفصل (اختياري)</label>
                <select
                    value={newSessionClassId}
                    onChange={(e) => setNewSessionClassId(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-zinc-800 bg-black/40 px-3 py-2 text-sm outline-none"
                    title="الفصل"
                >
                    <option value="">— بدون تحديد —</option>
                    {classesList.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>

                <label className="mt-3 block text-sm text-zinc-300">نوع الجلسة</label>
                <select
                    value={newSessionType}
                    onChange={(e) => setNewSessionType(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-zinc-800 bg-black/40 px-3 py-2 text-sm outline-none"
                    aria-label="نوع الجلسة"
                >
                    <option value="وقائية">وقائية</option>
                    <option value="علاجية">علاجية</option>
                    <option value="متابعة">متابعة</option>
                    <option value="أزمة">أزمة</option>
                    <option value="أخرى">أخرى</option>
                </select>

                <label className="mt-3 block text-sm text-zinc-300">موضوع الجلسة (topic)</label>
                <input
                    value={newSessionTopic}
                    onChange={(e) => setNewSessionTopic(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-zinc-800 bg-black/40 px-3 py-2 text-sm outline-none"
                    placeholder="مثال: قلق / نزاع / ضعف دافعية / مشكلة سلوكية"
                    aria-label="موضوع الجلسة"
                />

                <label className="mt-3 block text-sm text-zinc-300">ملاحظات (notes) — اختياري</label>
                <textarea
                    value={newSessionNotes}
                    onChange={(e) => setNewSessionNotes(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-zinc-800 bg-black/40 p-3 text-sm outline-none"
                    rows={4}
                    placeholder="مختصر لما دار في الجلسة"
                    aria-label="ملاحظات الجلسة"
                />

                <label className="mt-3 block text-sm text-zinc-300">الإجراءات المتخذة (actions_taken) — اختياري</label>
                <textarea
                    value={newSessionActions}
                    onChange={(e) => setNewSessionActions(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-zinc-800 bg-black/40 p-3 text-sm outline-none"
                    rows={3}
                    placeholder="مثال: تواصل مع ولي الأمر / خطة متابعة / تحويل للجهة المختصة"
                    aria-label="الإجراءات المتخذة"
                />

                <div className="mt-3 flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={newFollowUpRequired}
                        onChange={(e) => setNewFollowUpRequired(e.target.checked)}
                        aria-label="يتطلب متابعة"
                    />
                    <span className="text-sm text-zinc-300">يتطلب متابعة</span>
                </div>

                {newFollowUpRequired ? (
                    <>
                        <label className="mt-2 block text-sm text-zinc-300">تاريخ المتابعة</label>
                        <input
                            type="date"
                            value={newFollowUpDate}
                            onChange={(e) => setNewFollowUpDate(e.target.value)}
                            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black/40 px-3 py-2 text-sm outline-none"
                            aria-label="تاريخ المتابعة"
                        />
                    </>
                ) : null}

                <button
                    onClick={handleSubmit}
                    className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500"
                >
                    حفظ الجلسة
                </button>
            </div>

            {/* List */}
            <div className="lg:col-span-8 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
                <div className="flex flex-wrap gap-2 mb-4">
                    <input
                        value={studentQuery} onChange={e => setStudentQuery(e.target.value)}
                        placeholder="بحث بالطالب..."
                        className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none"
                        aria-label="بحث بالطالب"
                    />
                </div>

                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">سجل الجلسات</h2>
                    <div className="text-xs text-zinc-400">عدد: {filtered.length}</div>
                </div>

                <div className="mt-4 space-y-2">
                    {filtered.length === 0 ? (
                        <div className="text-sm text-zinc-400">لا توجد جلسات بعد.</div>
                    ) : (
                        filtered.map((s) => (
                            <div key={s.id} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="text-sm">
                                        <span className="font-semibold">{studentNameById(s.student_id)}</span>
                                        <span className="text-zinc-400"> — </span>
                                        <span className="text-zinc-200">{s.topic ?? "جلسة"}</span>
                                        {s.session_type ? (
                                            <span className="mr-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-2 py-0.5 text-xs text-zinc-300">
                                                {s.session_type}
                                            </span>
                                        ) : null}
                                    </div>
                                    <div className="text-xs text-zinc-400">{fmtDateTime(s.created_at)}</div>
                                </div>

                                <div className="mt-2 text-xs text-zinc-400">
                                    الفصل: {classNameById(s.class_id)} • تاريخ الجلسة: {s.session_date ?? "—"} • الموجه:{" "}
                                    {s.counselor_nar ?? "غير محدد"}
                                </div>

                                {s.notes ? (
                                    <div className="mt-2 text-sm text-zinc-300 whitespace-pre-wrap">
                                        <span className="text-zinc-400">ملاحظات: </span>
                                        {s.notes}
                                    </div>
                                ) : null}

                                {s.actions_taken ? (
                                    <div className="mt-2 text-sm text-zinc-300 whitespace-pre-wrap">
                                        <span className="text-zinc-400">الإجراءات: </span>
                                        {s.actions_taken}
                                    </div>
                                ) : null}

                                {s.follow_up_required ? (
                                    <div className="mt-2 text-xs text-[hsla(var(--gold),.65)]">
                                        🔔 متابعة مطلوبة {s.follow_up_date ? `— تاريخ: ${s.follow_up_date}` : ""}
                                    </div>
                                ) : null}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}
