"use client";

import React from "react";
import { User, ShieldCheck, HeartPulse } from "lucide-react";

interface StudentGridProps {
    students: { id: string; name: string; class_id: string }[];
    onStudentClick: (student: { id: string; name: string }) => void;
}

export function StudentGrid({ students, onStudentClick }: StudentGridProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {students.map((student) => (
                <button
                    key={student.id}
                    onClick={() => onStudentClick(student)}
                    className="flex flex-col p-5 rounded-[2rem] bg-zinc-900/40 border border-zinc-800/50 hover:border-emerald-500/30 hover:bg-zinc-800/80 transition-all group relative overflow-hidden"
                >
                    {/* Background Accent */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-3xl rounded-full translate-x-12 -translate-y-12 group-hover:bg-emerald-500/10 transition-colors" />

                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700/50 flex items-center justify-center group-hover:scale-105 group-hover:rotate-3 transition-all">
                            <User className="w-7 h-7 text-zinc-500 group-hover:text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0 text-right">
                            <h3 className="font-bold text-zinc-200 text-sm truncate group-hover:text-white transition-colors uppercase italic tracking-tight">
                                {student.name}
                            </h3>
                            <div className="flex items-center justify-end gap-1.5 mt-1">
                                <span className="text-[10px] text-zinc-500 font-medium group-hover:text-emerald-500/70 transition-colors uppercase">جاهز للفحص</span>
                                <HeartPulse className="w-2.5 h-2.5 text-rose-500/40 group-hover:animate-pulse" />
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between pointer-events-none">
                        <div className="flex -space-x-1">
                            <div className="w-4 h-4 rounded-full border border-zinc-800 bg-emerald-500/20" />
                            <div className="w-4 h-4 rounded-full border border-zinc-800 bg-zinc-800" />
                        </div>
                        <span className="text-[9px] font-black text-zinc-700 group-hover:text-zinc-500 transition-colors uppercase tracking-[0.2em]">Clinical State</span>
                    </div>
                </button>
            ))}
            {students.length === 0 && (
                <div className="col-span-full py-20 text-center rounded-[3rem] border border-dashed border-zinc-800/50 bg-zinc-900/10">
                    <ShieldCheck className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
                    <p className="text-zinc-600 font-bold italic tracking-tighter">يرجى اختيار الفصل الدراسي أولاً لاستعراض القائمة</p>
                    <p className="text-[10px] text-zinc-700 mt-2 uppercase tracking-[0.3em]">Selection Pending</p>
                </div>
            )}
        </div>
    );
}

