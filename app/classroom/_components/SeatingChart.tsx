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

    const handleDragEnd = () => {
        // Simple grid snapping logic can be implemented here if needed
        // For now we just let the parent handle the storage
    };

    return (
        <div className="relative w-full aspect-[4/3] bg-zinc-950/20 rounded-[3rem] border border-white/5 p-8 overflow-hidden">
            {/* Teacher Desk Area */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-12 bg-zinc-900 border border-[var(--primary)]/20 rounded-b-3xl flex items-center justify-center">
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
                            drag
                            dragMomentum={false}
                            onDragEnd={() => handleDragEnd()}
                            onClick={() => onStudentClick(s.id)}
                            className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all group ${isSelected
                                ? "bg-[var(--primary)]/20 border-[var(--primary)] shadow-lg shadow-[var(--primary)]/20"
                                : "bg-zinc-900/40 border-white/5 hover:border-white/10"
                                }`}
                        >
                            <div className="relative">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black transition-all ${isSelected ? "bg-[var(--primary)] text-white" : "bg-zinc-800 text-zinc-500 group-hover:bg-zinc-700 group-hover:text-zinc-300"
                                    }`}>
                                    {s.name[0]}
                                </div>

                                {/* Role Indicator */}
                                {role && (
                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-[var(--accent)] rounded-lg flex items-center justify-center shadow-lg border-2 border-zinc-900">
                                        <Shield size={12} className="text-white fill-white" />
                                    </div>
                                )}

                                {/* Badge Count */}
                                {studentBadges.length > 0 && (
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[var(--primary)] rounded-full flex items-center justify-center text-[8px] font-black text-white border-2 border-zinc-900">
                                        {studentBadges.length}
                                    </div>
                                )}
                            </div>

                            <span className={`mt-2 text-[10px] font-bold truncate w-full text-center ${isSelected ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"}`}>
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
        </div>
    );
}
