import React from "react";
import { StudentOption, Subject } from "@/lib/types/classroom";

interface Props {
    students: StudentOption[];
    selectedId: string;
    onSelect: (id: string) => void;
    subject: Subject;
    onSubjectChange: (s: Subject) => void;
    onRefresh: () => void;
    loading: boolean;
}

export function StudentSelector({
    students,
    selectedId,
    onSelect,
    subject,
    onSubjectChange,
    onRefresh,
    loading,
}: Props) {
    return (
        <section className="rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-xl shadow-xl hover:bg-white/10 transition-all duration-300">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-lg font-semibold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                        تحديد الطالب
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">
                        اختر الطالب والمادة لبدء رصد الملاحظات
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Subject Select */}
                    <div className="relative group">
                        <select
                            value={subject}
                            onChange={(e) => onSubjectChange(e.target.value as Subject)}
                            className="appearance-none w-32 rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
                            title="اختر المادة"
                        >
                            <option value="عام">عام</option>
                            <option value="إسلامية">إسلامية</option>
                        </select>
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 text-xs">▼</div>
                    </div>

                    {/* Student Select */}
                    <div className="relative group">
                        <select
                            value={selectedId}
                            onChange={(e) => onSelect(e.target.value)}
                            className="appearance-none w-full bg-zinc-900 border border-zinc-700/50 rounded-xl px-4 py-2 text-sm text-zinc-300 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
                            title="اختر الطالب"
                        >
                            <option value="">-- اختر الطالب --</option>
                            {students.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 text-xs">▼</div>
                    </div>

                    <button
                        onClick={onRefresh}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 active:scale-95 transition-all text-zinc-300"
                    >
                        {loading ? "جاري التحميل..." : "تحديث"}
                    </button>
                    {/* Assuming X and onClose are defined elsewhere or passed as props */}
                    {/* <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-zinc-500 hover:text-white transition-colors" aria-label="إغلاق النافذة">
                        <X size={20} />
                    </button> */}
                </div>
            </div>
        </section>
    );
}
