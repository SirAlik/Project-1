"use client";

import React, { useState, useMemo } from "react";
import {
    X,
    Calendar,
    TrendingUp,
    Users,
    BarChart3
} from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    Cell
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { StudentProfile, StudentAttendance } from "@/lib/types/student-affairs";

interface DeepDiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: StudentProfile[];
    attendance: StudentAttendance[];
    type: "lateness" | "absence" | "neighborhood" | "weekday";
}

export function DeepDiveModal({ isOpen, onClose, students, attendance, type }: DeepDiveModalProps) {
    const [selectedFilter, setSelectedFilter] = useState<string>("all");

    // Lateness by Day of Week
    const latenessByDay = useMemo(() => {
        const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];
        return days.map((day, index) => {
            const count = attendance.filter(a => {
                const d = new Date(a.attendance_date);
                return d.getDay() === index && a.status === 'late';
            }).length;
            return { name: day, count, color: count > 5 ? "var(--danger)" : "var(--primary)" };
        });
    }, [attendance]);

    // Absence by Day of Week
    const absenceByDay = useMemo(() => {
        const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];
        return days.map((day, index) => {
            const count = attendance.filter(a => {
                const d = new Date(a.attendance_date);
                return d.getDay() === index && a.status === 'absent';
            }).length;
            return { name: day, count, color: count > 3 ? "var(--danger)" : "var(--accent)" };
        });
    }, [attendance]);

    // Lateness by Neighborhood (simulated from address_city)
    const latenessByNeighborhood = useMemo(() => {
        const neighborhoods: Record<string, number> = {};
        attendance.filter(a => a.status === 'late').forEach(a => {
            const student = students.find(s => s.id === a.student_id);
            const city = student?.address_city || "غير محدد";
            neighborhoods[city] = (neighborhoods[city] || 0) + 1;
        });
        return Object.entries(neighborhoods)
            .map(([name, count]) => ({ name, count, color: count > 5 ? "var(--warning)" : "var(--primary)" }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);
    }, [attendance, students]);

    // Top Late Students
    const topLateStudents = useMemo(() => {
        const counts: Record<string, { name: string; count: number }> = {};
        attendance.filter(a => a.status === 'late').forEach(a => {
            const student = students.find(s => s.id === a.student_id);
            if (student) {
                if (!counts[student.id]) counts[student.id] = { name: student.name, count: 0 };
                counts[student.id].count++;
            }
        });
        return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 10);
    }, [attendance, students]);

    if (!isOpen) return null;

    const getChartData = () => {
        switch (type) {
            case "lateness": return latenessByDay;
            case "absence": return absenceByDay;
            case "neighborhood": return latenessByNeighborhood;
            case "weekday": return latenessByDay;
            default: return latenessByDay;
        }
    };

    const getTitle = () => {
        switch (type) {
            case "lateness": return "تحليل التأخر حسب أيام الأسبوع";
            case "absence": return "تحليل الغياب حسب أيام الأسبوع";
            case "neighborhood": return "خريطة التأخر حسب الحي";
            case "weekday": return "توزيع المخالفات الأسبوعي";
            default: return "تحليل متقدم";
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-200/70 backdrop-blur-sm p-4" dir="rtl">
            <div className="w-full max-w-4xl bg-white border border-stone-200 rounded-[2.5rem] overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-stone-200">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl">
                            <BarChart3 className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black">{getTitle()}</h2>
                            <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">نافذة الغوص العميق</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors" aria-label="إغلاق النافذة">
                        <X size={24} className="text-stone-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Filters */}
                    <div className="flex gap-2 flex-wrap">
                        <FilterChip icon={Calendar} label="آخر 7 أيام" active={selectedFilter === "7d"} onClick={() => setSelectedFilter("7d")} />
                        <FilterChip icon={Calendar} label="آخر 30 يوماً" active={selectedFilter === "30d"} onClick={() => setSelectedFilter("30d")} />
                        <FilterChip icon={Users} label="جميع الطلاب" active={selectedFilter === "all"} onClick={() => setSelectedFilter("all")} />
                    </div>

                    {/* Main Chart */}
                    <div className="bg-white/80 border border-stone-200 rounded-2xl p-6">
                        <ChartContainer height={256}>
                            <BarChart data={getChartData()}>
                                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis hide />
                                <Tooltip
                                    cursor={{ fill: 'var(--surface-3)' }}
                                    contentStyle={{ background: 'var(--surface-solid)', border: '1px solid var(--border)', borderRadius: '12px' }}
                                    labelStyle={{ color: 'var(--text)', fontWeight: 'bold' }}
                                />
                                <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={35}>
                                    {getChartData().map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ChartContainer>
                    </div>

                    {/* Top Students Table */}
                    <div className="bg-white/80 border border-stone-200 rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-stone-200">
                            <h3 className="text-sm font-black flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-[hsl(var(--gold))]" />
                                أكثر الطلاب تأخراً (Top 10)
                            </h3>
                        </div>
                        <div className="divide-y divide-zinc-800/50">
                            {topLateStudents.map((student, i) => (
                                <div key={i} className="flex items-center justify-between p-4 hover:bg-white/80 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-stone-200 rounded-lg flex items-center justify-center text-xs font-black text-stone-500">
                                            {i + 1}
                                        </div>
                                        <span className="text-sm font-bold">{student.name}</span>
                                    </div>
                                    <span className={`px-3 py-1 rounded-lg text-xs font-black ${student.count >= 5 ? 'bg-rose-500/10 text-rose-500' : 'bg-[hsla(var(--gold),.15)] text-[hsl(var(--gold))]'}`}>
                                        {student.count} مرات
                                    </span>
                                </div>
                            ))}
                            {topLateStudents.length === 0 && (
                                <div className="p-8 text-center text-stone-500 italic">لا توجد بيانات كافية</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FilterChip({ icon: Icon, label, active, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${active
                ? 'bg-indigo-500 text-white'
                : 'bg-stone-100 text-stone-500 hover:bg-stone-200 border border-stone-200'
                }`}
        >
            <Icon className="w-3 h-3" />
            {label}
        </button>
    );
}
