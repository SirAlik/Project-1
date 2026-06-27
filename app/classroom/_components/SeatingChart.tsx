"use client";

import type { Dispatch, SetStateAction } from 'react';
import { StudentOption } from "@/lib/types/classroom";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";

interface SeatingChartProps {
    students: StudentOption[];
    seatingMap?: Record<string, { x: number; y: number }>;
    onUpdateSeating?: Dispatch<SetStateAction<Record<string, { x: number; y: number }>>>;
    studentRoles: Record<string, string>;
    badges: Record<string, string[]>;
    dailyScores: Record<string, number>;
    onStudentClick: (id: string) => void;
    selectedStudentIds: string[];
}

export function SeatingChart({
    students,
    studentRoles,
    badges,
    dailyScores,
    onStudentClick,
    selectedStudentIds
}: SeatingChartProps) {
    // Grid size 5x6
    const ROWS = 5;
    const COLS = 6;
    const grid = Array.from({ length: ROWS * COLS }, (_, i) => i);

    // ملاحظة صدق: السحب كان لا يُخزّن شيئاً (onUpdateSeating لم يُستدعَ، وحفظ الفصل يتطلب class_id
    // غير متوفّر في هذا التدفّق) — أُزيل لتفادي تفاعل وهمي. يبقى النقر لاختيار الطالب.
    return (
        <div className="relative w-full aspect-[4/3] bg-white/80 rounded-[3rem] border border-stone-200 p-8 overflow-hidden">
            {/* Teacher Desk Area */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-12 bg-stone-100 border border-[var(--primary)]/20 rounded-b-3xl flex items-center justify-center">
                <span className="text-[10px] font-black text-[var(--text)] opacity-40 uppercase tracking-[0.3em]">منصة المعلم</span>
            </div>

            {/* Grid Background */}
            <div className="absolute inset-0 grid grid-cols-6 grid-rows-5 gap-4 p-12 opacity-[0.03] pointer-events-none">
                {grid.map(i => (
                    <div key={i} className="border border-white rounded-2xl" />
                ))}
            </div>

            {/* Student Desks */}
            <div className="relative h-full grid grid-cols-6 grid-rows-5 gap-6">
                {students.map((s) => {
                    const isSelected = selectedStudentIds.includes(s.id);
                    const role = studentRoles[s.id];
                    const score = dailyScores[s.id] || 0;
                    const studentBadges = badges[s.id] || [];

                    return (
                        <motion.button
                            key={s.id}
                            onClick={() => onStudentClick(s.id)}
                            className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all group ${isSelected
                                ? "bg-[var(--primary)]/20 border-[var(--primary)] shadow-lg shadow-[var(--primary)]/20"
                                : "bg-white/80 border-stone-200 hover:border-stone-200"
                                }`}
                        >
                            <div className="relative">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black transition-all ${isSelected ? "bg-[var(--primary)] text-white" : "bg-stone-200 text-stone-500 group-hover:bg-stone-300 group-hover:text-stone-600"
                                    }`}>
                                    {s.name[0]}
                                </div>

                                {/* Role Indicator */}
                                {role && (
                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-[var(--accent)] rounded-lg flex items-center justify-center shadow-lg border-2 border-stone-200">
                                        <Shield size={12} className="text-white fill-white" />
                                    </div>
                                )}

                                {/* Badge Count */}
                                {studentBadges.length > 0 && (
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[var(--primary)] rounded-full flex items-center justify-center text-[8px] font-black text-foreground border-2 border-stone-200">
                                        {studentBadges.length}
                                    </div>
                                )}
                            </div>

                            <span className={`mt-2 text-[10px] font-bold truncate w-full text-center ${isSelected ? "text-white" : "text-stone-500 group-hover:text-stone-600"}`}>
                                {s.name.split(' ')[0]}
                            </span>

                            {/* Score Tag */}
                            {score !== 0 && (
                                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-black border ${score > 0 ? "bg-[var(--primary)]/20 border-[var(--primary)]/30 text-[var(--primary)]" : "bg-[var(--danger)]/20 border-[var(--danger)]/30 text-[var(--danger)]"
                                    }`}>
                                    {score > 0 ? `+${score}` : score}
                                </div>
                            )}
                        </motion.button>
                    );
                })}
            </div>

            {/* Empty Seat Placeholders (Implicit in Grid) */}
            <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[9px] font-bold text-stone-400">
                ترتيب المقاعد للعرض فقط حالياً (لا يُحفظ بعد)
            </p>
        </div>
    );
}
