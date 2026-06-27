"use client";
// ════════════════════════════════════════════════════════════════════════════
// Sprint 8 — توزيع المنهج + تقدّم المنهج (سطح المعلّم داخل /classroom/[classId])
// ════════════════════════════════════════════════════════════════════════════
// المعلّم المُسنَد يؤلّف توزيع المنهج (وحدات/دروس/تواريخ/حالة/ملاحظات) لفصله ومادته.
// النسبة تُحسب من إنجاز فعلي: completedLessons / totalLessons * 100 (لا قيمة ثابتة).
// عند عدم وجود توزيع: حالة فارغة صادقة. لا نسبة وهمية ولا دروس مُختلَقة.

import { useState, useEffect, useCallback, startTransition } from "react";
import {
    BookMarked, CheckCircle2, CircleDashed, Loader2, Plus, Trash2, Pencil, X, Check,
} from "lucide-react";
import {
    getClassCurriculumAction, addCurriculumUnitAction, addCurriculumLessonAction,
    updateCurriculumLessonAction, setLessonStatusAction,
    deleteCurriculumLessonAction, deleteCurriculumUnitAction,
    type ClassCurriculumView, type LessonStatus,
} from "../_actions";

const STATUS_LABEL: Record<LessonStatus, string> = {
    not_started: "لم يبدأ",
    in_progress: "قيد التنفيذ",
    completed: "مكتمل",
};
const STATUS_ORDER: LessonStatus[] = ["not_started", "in_progress", "completed"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-3xl border border-stone-200 bg-white/80 p-6" dir="rtl">
            <h3 className="mb-5 flex items-center gap-3 text-lg font-black text-foreground">
                <BookMarked className="w-5 h-5 text-[var(--primary)]" />
                {title}
            </h3>
            {children}
        </section>
    );
}

export function CurriculumProgress({ classId }: { classId: string }) {
    const [data, setData] = useState<ClassCurriculumView | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeIdx, setActiveIdx] = useState(0);
    const [busy, setBusy] = useState(false);

    // مسوّدات الإدخال
    const [newUnitTitle, setNewUnitTitle] = useState("");
    const [lessonDraft, setLessonDraft] = useState<Record<string, { title: string; date: string }>>({});
    const [editId, setEditId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState<{ title: string; date: string; notes: string }>({ title: "", date: "", notes: "" });

    const fetchData = useCallback(async () => {
        const res = await getClassCurriculumAction(classId);
        if (!res.ok || !res.data) {
            setError(res.error ?? "تعذّر تحميل توزيع المنهج، يرجى المحاولة لاحقاً");
            setData(null);
        } else {
            setData(res.data);
        }
    }, [classId]);

    useEffect(() => {
        startTransition(async () => { await fetchData(); setLoading(false); });
    }, [fetchData]);

    // يُنفّذ إجراءً ثم يُعيد التحميل (بلا وميض تحميل كامل)
    const run = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
        if (busy) return false;
        setBusy(true);
        setError(null);
        const res = await fn();
        if (!res.ok) { setError(res.error ?? "تعذّر إتمام العملية، يرجى المحاولة لاحقاً"); setBusy(false); return false; }
        await fetchData();
        setBusy(false);
        return true;
    };

    if (loading) {
        return (
            <Section title="توزيع المنهج">
                <div className="flex items-center gap-2 text-sm text-stone-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> جارٍ تحميل توزيع المنهج…
                </div>
            </Section>
        );
    }

    const subjects = data?.subjects ?? [];

    // لا مواد مُسنَدة → السطح خاص بالمعلّم المُسنَد فقط
    if (subjects.length === 0) {
        return (
            <Section title="توزيع المنهج">
                {error && <p className="mb-3 text-sm font-bold text-[var(--danger)]">{error}</p>}
                <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center">
                    <CircleDashed className="mx-auto mb-2 h-6 w-6 text-stone-400" />
                    <p className="text-sm font-bold text-stone-600">لا توجد مادة مُسنَدة إليك في هذا الفصل.</p>
                    <p className="mt-1 text-[11px] text-stone-400">تُسنِد الإدارة المادة للمعلّم، ثم يضيف المعلّم توزيع المنهج هنا.</p>
                </div>
            </Section>
        );
    }

    const idx = Math.min(activeIdx, subjects.length - 1);
    const subject = subjects[idx];
    const total = subject.totalLessons;
    const completed = subject.completedLessons;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const hasDistribution = subject.units.length > 0;

    const setDraft = (unitId: string, patch: Partial<{ title: string; date: string }>) =>
        setLessonDraft(prev => {
            const cur = prev[unitId] ?? { title: "", date: "" };
            return { ...prev, [unitId]: { ...cur, ...patch } };
        });

    return (
        <Section title="توزيع المنهج">
            {error && <p className="mb-3 text-sm font-bold text-[var(--danger)]">{error}</p>}

            {/* تبويب المواد المُسنَدة */}
            {subjects.length > 1 && (
                <div className="mb-4 flex flex-wrap gap-2">
                    {subjects.map((s, i) => (
                        <button
                            key={s.subjectId} type="button" onClick={() => setActiveIdx(i)}
                            className={`rounded-xl px-3 py-1.5 text-[11px] font-black transition-all ${i === idx ? "bg-[var(--primary)] text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}
                        >
                            {s.subjectName}
                        </button>
                    ))}
                </div>
            )}

            {/* تقدّم المنهج — شريط نسبة حقيقي */}
            <div className="mb-5 rounded-2xl border border-stone-200 bg-white/70 p-4">
                <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-black text-foreground">تقدّم المنهج — {subject.subjectName}</span>
                    <span className="text-sm font-black text-[var(--primary)]">{pct}%</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full border border-stone-200 bg-stone-100">
                    <div className="h-full rounded-full bg-[var(--primary)] transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 text-[12px] font-bold text-stone-500">تم إنجاز {completed} من {total} درسًا</p>
            </div>

            {/* حالة فارغة صادقة عند غياب التوزيع */}
            {!hasDistribution && (
                <div className="mb-4 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-5 text-center">
                    <p className="text-sm font-bold text-stone-600">لم يضف المعلم توزيع المنهج لهذا الفصل بعد.</p>
                    <p className="mt-1 text-[11px] text-stone-400">أضف أول وحدة بالأسفل لبدء توزيع المنهج.</p>
                </div>
            )}

            {/* الوحدات والدروس (يؤلّفها المعلّم) */}
            <div className="space-y-4">
                {subject.units.map(u => {
                    const draft = lessonDraft[u.id] ?? { title: "", date: "" };
                    return (
                        <div key={u.id} className="rounded-2xl border border-stone-200 bg-white/70 p-4">
                            <div className="mb-3 flex items-center justify-between gap-2">
                                <p className="text-[13px] font-black text-foreground">{u.title}</p>
                                <button
                                    type="button" disabled={busy}
                                    onClick={() => run(() => deleteCurriculumUnitAction({ classId, unitId: u.id }))}
                                    className="flex items-center gap-1 rounded-lg bg-stone-100 px-2 py-1 text-[10px] font-black text-stone-500 transition-all hover:text-[var(--danger)] disabled:opacity-50"
                                    title="حذف الوحدة (تُعطَّل إن كانت تحوي دروسًا)"
                                >
                                    <Trash2 className="h-3 w-3" /> حذف
                                </button>
                            </div>

                            {u.lessons.length > 0 && (
                                <ul className="mb-3 space-y-2">
                                    {u.lessons.map(l => (
                                        <li key={l.id} className="rounded-xl border border-stone-100 bg-white px-3 py-2">
                                            {editId === l.id ? (
                                                <div className="flex flex-col gap-2">
                                                    <input
                                                        value={editDraft.title}
                                                        onChange={e => setEditDraft(d => ({ ...d, title: e.target.value }))}
                                                        placeholder="عنوان الدرس"
                                                        className="rounded-lg border border-stone-200 px-2 py-1 text-[12px]"
                                                    />
                                                    <div className="flex flex-wrap gap-2">
                                                        <input
                                                            type="date" value={editDraft.date}
                                                            onChange={e => setEditDraft(d => ({ ...d, date: e.target.value }))}
                                                            className="rounded-lg border border-stone-200 px-2 py-1 text-[11px]"
                                                        />
                                                        <input
                                                            value={editDraft.notes}
                                                            onChange={e => setEditDraft(d => ({ ...d, notes: e.target.value }))}
                                                            placeholder="ملاحظات"
                                                            className="flex-1 rounded-lg border border-stone-200 px-2 py-1 text-[11px]"
                                                        />
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button
                                                            type="button" disabled={busy}
                                                            onClick={async () => {
                                                                const ok = await run(() => updateCurriculumLessonAction({
                                                                    classId, lessonId: l.id, title: editDraft.title,
                                                                    plannedDate: editDraft.date || null, notes: editDraft.notes || null,
                                                                }));
                                                                if (ok) setEditId(null);
                                                            }}
                                                            className="flex items-center gap-1 rounded-lg bg-[var(--primary)] px-2 py-1 text-[10px] font-black text-white disabled:opacity-50"
                                                        >
                                                            <Check className="h-3 w-3" /> حفظ
                                                        </button>
                                                        <button
                                                            type="button" onClick={() => setEditId(null)}
                                                            className="flex items-center gap-1 rounded-lg bg-stone-100 px-2 py-1 text-[10px] font-black text-stone-500"
                                                        >
                                                            <X className="h-3 w-3" /> إلغاء
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        {l.status === "completed"
                                                            ? <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--primary)]" />
                                                            : <CircleDashed className="h-4 w-4 shrink-0 text-stone-300" />}
                                                        <span className="truncate text-[12px] font-bold text-stone-700">{l.title}</span>
                                                        {l.plannedDate && (
                                                            <span className="shrink-0 rounded bg-stone-100 px-1.5 py-0.5 text-[9px] font-bold text-stone-500">{l.plannedDate}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-1">
                                                        {STATUS_ORDER.map(st => (
                                                            <button
                                                                key={st} type="button" disabled={busy}
                                                                onClick={() => run(() => setLessonStatusAction({ classId, lessonId: l.id, status: st }))}
                                                                className={`rounded-lg px-2 py-1 text-[10px] font-black transition-all disabled:opacity-50 ${
                                                                    l.status === st
                                                                        ? st === "completed" ? "bg-[var(--primary)] text-white"
                                                                            : st === "in_progress" ? "bg-[var(--warning)] text-white"
                                                                                : "bg-stone-500 text-white"
                                                                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                                                                }`}
                                                            >
                                                                {STATUS_LABEL[st]}
                                                            </button>
                                                        ))}
                                                        <button
                                                            type="button" disabled={busy}
                                                            onClick={() => { setEditId(l.id); setEditDraft({ title: l.title, date: l.plannedDate ?? "", notes: l.notes ?? "" }); }}
                                                            className="rounded-lg bg-stone-100 px-1.5 py-1 text-stone-500 hover:text-foreground disabled:opacity-50"
                                                            title="تعديل الدرس"
                                                        >
                                                            <Pencil className="h-3 w-3" />
                                                        </button>
                                                        <button
                                                            type="button" disabled={busy}
                                                            onClick={() => run(() => deleteCurriculumLessonAction({ classId, lessonId: l.id }))}
                                                            className="rounded-lg bg-stone-100 px-1.5 py-1 text-stone-500 hover:text-[var(--danger)] disabled:opacity-50"
                                                            title="حذف الدرس"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {/* إضافة درس للوحدة */}
                            <div className="flex flex-wrap items-center gap-2">
                                <input
                                    value={draft.title}
                                    onChange={e => setDraft(u.id, { title: e.target.value })}
                                    placeholder="عنوان درس"
                                    className="flex-1 min-w-[120px] rounded-lg border border-stone-200 px-2 py-1 text-[12px]"
                                />
                                <input
                                    type="date" value={draft.date}
                                    onChange={e => setDraft(u.id, { date: e.target.value })}
                                    className="rounded-lg border border-stone-200 px-2 py-1 text-[11px]"
                                />
                                <button
                                    type="button" disabled={busy || !draft.title.trim()}
                                    onClick={async () => {
                                        const ok = await run(() => addCurriculumLessonAction({
                                            classId, unitId: u.id, title: draft.title, plannedDate: draft.date || null,
                                        }));
                                        if (ok) setDraft(u.id, { title: "", date: "" });
                                    }}
                                    className="flex items-center gap-1 rounded-lg bg-[var(--primary)]/10 px-2.5 py-1.5 text-[10px] font-black text-[var(--primary)] transition-all hover:bg-[var(--primary)] hover:text-white disabled:opacity-50"
                                >
                                    <Plus className="h-3 w-3" /> إضافة درس
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* إضافة وحدة */}
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-stone-200 pt-4">
                <input
                    value={newUnitTitle}
                    onChange={e => setNewUnitTitle(e.target.value)}
                    placeholder="عنوان وحدة جديدة"
                    className="flex-1 min-w-[160px] rounded-lg border border-stone-200 px-3 py-2 text-[12px]"
                />
                <button
                    type="button" disabled={busy || !newUnitTitle.trim()}
                    onClick={async () => {
                        const ok = await run(() => addCurriculumUnitAction({ classId, subjectId: subject.subjectId, title: newUnitTitle }));
                        if (ok) setNewUnitTitle("");
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 py-2 text-[11px] font-black text-white transition-all disabled:opacity-50"
                >
                    <Plus className="h-3.5 w-3.5" /> إضافة وحدة
                </button>
            </div>
        </Section>
    );
}
