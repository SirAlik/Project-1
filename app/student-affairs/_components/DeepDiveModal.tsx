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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm" dir="rtl">
            <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border p-6">
                    <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-primary/10 p-3">
                            <BarChart3 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-foreground">{getTitle()}</h2>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">نافذة الغوص العميق</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="إغلاق النافذة">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-6 p-6">
                    {/* Filters */}
                    <div className="flex flex-wrap gap-2">
                        <FilterChip icon={Calendar} label="آخر 7 أيام" active={selectedFilter === "7d"} onClick={() => setSelectedFilter("7d")} />
                        <FilterChip icon={Calendar} label="آخر 30 يوماً" active={selectedFilter === "30d"} onClick={() => setSelectedFilter("30d")} />
                        <FilterChip icon={Users} label="جميع الطلاب" active={selectedFilter === "all"} onClick={() => setSelectedFilter("all")} />
                    </div>

                    {/* Main Chart */}
                    <div className="rounded-2xl border border-border bg-surface-soft p-6">
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
                    <div className="overflow-hidden rounded-2xl border border-border bg-surface-soft">
                        <div className="border-b border-border p-4">
                            <h3 className="flex items-center gap-2 text-sm font-black text-foreground">
                                <TrendingUp className="h-4 w-4 text-primary" />
                                أكثر الطلاب تأخراً (الأعلى 10)
                            </h3>
                        </div>
                        <div className="divide-y divide-border">
                            {topLateStudents.map((student, i) => (
                                <div key={i} className="flex items-center justify-between p-4 transition-colors hover:bg-muted/60">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-xs font-black text-muted-foreground">
                                            {i + 1}
                                        </div>
                                        <span className="text-sm font-bold text-foreground">{student.name}</span>
                                    </div>
                                    <span className={`rounded-lg px-3 py-1 text-xs font-black ${student.count >= 5 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                                        {student.count} مرات
                                    </span>
                                </div>
                            ))}
                            {topLateStudents.length === 0 && (
                                <div className="p-8 text-center text-muted-foreground">لا توجد بيانات كافية</div>
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
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors ${active
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-surface-soft text-muted-foreground hover:bg-muted'
                }`}
        >
            <Icon className="h-3 w-3" />
            {label}
        </button>
    );
}
