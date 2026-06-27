"use client";
// ════════════════════════════════════════════════════════════════════════════
// Sprint 7 — تقدّم المنهج (سطح المعلّم داخل /classroom/[classId])
// ════════════════════════════════════════════════════════════════════════════
// النسبة تُحسب من إنجاز فعلي: completedLessons / totalLessons * 100 (لا قيمة ثابتة).
// عند غياب خطة منهج: حالة فارغة صادقة. لا نسبة وهمية ولا أرقام مُختلَقة.

import { useState, useEffect, useCallback, startTransition } from "react";
import { BookMarked, CheckCircle2, CircleDashed, Loader2 } from "lucide-react";
import {
    getClassCurriculumAction,
    setLessonProgressAction,
    type ClassCurriculumView,
    type LessonStatus,
} from "../_actions";

const STATUS_LABEL: Record<LessonStatus, string> = {
    not_started: "لم يبدأ",
    in_progress: "قيد التنفيذ",
    completed: "مكتمل",
};
const STATUS_ORDER: LessonStatus[] = ["not_started", "in_progress", "completed"];

// غلاف القسم (ثابت — معرّف على مستوى الوحدة لتجنّب إعادة الإنشاء عند كل render)
function Section({ children }: { children: React.ReactNode }) {
    return (
        <section className="rounded-3xl border border-stone-200 bg-white/80 p-6" dir="rtl">
            <h3 className="mb-5 flex items-center gap-3 text-lg font-black text-foreground">
                <BookMarked className="w-5 h-5 text-[var(--primary)]" />
                تقدّم المنهج
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
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setError(null);
        const res = await getClassCurriculumAction(classId);
        if (!res.ok || !res.data) {
            setError(res.error ?? "تعذّر تحميل خطة المنهج، يرجى المحاولة لاحقاً");
            setData(null);
        } else {
            setData(res.data);
        }
        setLoading(false);
    }, [classId]);

    useEffect(() => {
        startTransition(async () => { await load(); });
    }, [load]);

    const handleSetStatus = async (
        subjectIdx: number,
        unitIdx: number,
        lessonIdx: number,
        lessonId: string,
        status: LessonStatus,
    ) => {
        if (updatingId) return;
        setUpdatingId(lessonId);
        setError(null);
        const res = await setLessonProgressAction({ classId, lessonId, status });
        if (!res.ok) {
            setError(res.error ?? "تعذّر تحديث حالة الدرس، يرجى المحاولة لاحقاً");
            setUpdatingId(null);
            return;
        }
        // تحديث محلي + إعادة احتساب العدّ الفعلي (لا نسبة مُختلَقة)
        setData(prev => {
            if (!prev) return prev;
            const subjects = prev.subjects.map((s, si) => {
                if (si !== subjectIdx) return s;
                const units = s.units.map((u, ui) => {
                    if (ui !== unitIdx) return u;
                    const lessons = u.lessons.map((l, li) =>
                        li === lessonIdx ? { ...l, status } : l);
                    return { ...u, lessons };
                });
                const completed = units.reduce(
                    (acc, u) => acc + u.lessons.filter(l => l.status === "completed").length, 0);
                return { ...s, units, completedLessons: completed };
            });
            return { ...prev, subjects };
        });
        setUpdatingId(null);
    };

    if (loading) {
        return (
            <Section>
                <div className="flex items-center gap-2 text-sm text-stone-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> جارٍ تحميل خطة المنهج…
                </div>
            </Section>
        );
    }

    if (error) {
        return (
            <Section>
                <p className="text-sm font-bold text-[var(--danger)]">{error}</p>
                <button
                    type="button"
                    onClick={() => { setLoading(true); startTransition(async () => { await load(); }); }}
                    className="mt-3 rounded-lg bg-stone-100 px-3 py-1.5 text-[11px] font-black text-stone-600 hover:bg-stone-200"
                >
                    إعادة المحاولة
                </button>
            </Section>
        );
    }

    const subjects = data?.subjects ?? [];
    const hasAnyLessons = subjects.some(s => s.totalLessons > 0);

    // حالة فارغة صادقة: لا خطة منهج مُعدّة لهذا الفصل/الصف
    if (subjects.length === 0 || !hasAnyLessons) {
        return (
            <Section>
                <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center">
                    <CircleDashed className="mx-auto mb-2 h-6 w-6 text-stone-400" />
                    <p className="text-sm font-bold text-stone-600">لم يتم إعداد خطة المنهج لهذا الفصل بعد.</p>
                    <p className="mt-1 text-[11px] text-stone-400">
                        تظهر نسبة الإنجاز هنا بعد إضافة وحدات ودروس المنهج للمادة على مستوى المدرسة.
                    </p>
                </div>
            </Section>
        );
    }

    const idx = Math.min(activeIdx, subjects.length - 1);
    const subject = subjects[idx];
    const total = subject.totalLessons;
    const completed = subject.completedLessons;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
        <Section>
            {/* تبويب المواد (عند تدريس أكثر من مادة في الفصل) */}
            {subjects.length > 1 && (
                <div className="mb-4 flex flex-wrap gap-2">
                    {subjects.map((s, i) => (
                        <button
                            key={s.subjectId}
                            type="button"
                            onClick={() => setActiveIdx(i)}
                            className={`rounded-xl px-3 py-1.5 text-[11px] font-black transition-all ${i === idx ? "bg-[var(--primary)] text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}
                        >
                            {s.subjectName}
                        </button>
                    ))}
                </div>
            )}

            {/* شريط النسبة الحقيقي */}
            <div className="mb-5">
                <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-black text-foreground">{subject.subjectName}</span>
                    <span className="text-sm font-black text-[var(--primary)]">{pct}%</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full border border-stone-200 bg-stone-100">
                    <div
                        className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
                        style={{ width: `${pct}%` }}
                    />
                </div>
                <p className="mt-2 text-[12px] font-bold text-stone-500">
                    تم إنجاز {completed} من {total} درسًا
                </p>
            </div>

            {/* الوحدات والدروس */}
            <div className="space-y-4">
                {subject.units.map((u, ui) => (
                    <div key={u.id} className="rounded-2xl border border-stone-200 bg-white/70 p-4">
                        <p className="mb-3 text-[13px] font-black text-foreground">{u.title}</p>
                        {u.lessons.length === 0 ? (
                            <p className="text-[11px] text-stone-400">لا توجد دروس مُفعّلة في هذه الوحدة.</p>
                        ) : (
                            <ul className="space-y-2">
                                {u.lessons.map((l, li) => (
                                    <li
                                        key={l.id}
                                        className="flex flex-col gap-2 rounded-xl border border-stone-100 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            {l.status === "completed"
                                                ? <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--primary)]" />
                                                : <CircleDashed className="h-4 w-4 shrink-0 text-stone-300" />}
                                            <span className="truncate text-[12px] font-bold text-stone-700">{l.title}</span>
                                        </div>
                                        <div className="flex shrink-0 gap-1">
                                            {STATUS_ORDER.map(st => (
                                                <button
                                                    key={st}
                                                    type="button"
                                                    disabled={updatingId === l.id}
                                                    onClick={() => handleSetStatus(idx, ui, li, l.id, st)}
                                                    className={`rounded-lg px-2 py-1 text-[10px] font-black transition-all disabled:opacity-50 ${
                                                        l.status === st
                                                            ? st === "completed"
                                                                ? "bg-[var(--primary)] text-white"
                                                                : st === "in_progress"
                                                                    ? "bg-[var(--warning)] text-white"
                                                                    : "bg-stone-500 text-white"
                                                            : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                                                    }`}
                                                >
                                                    {STATUS_LABEL[st]}
                                                </button>
                                            ))}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ))}
            </div>
        </Section>
    );
}
