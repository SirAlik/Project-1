import React, { useState } from "react";
import {
    CheckCircle2,
    Clock,
    XCircle,
    LogOut,
    User,
    Search,
} from "lucide-react";
import { StudentProfile, AttendanceStatus, StudentAttendance } from "@/lib/types/student-affairs";
import { StudentExitModal } from "./StudentExitModal";

type AttendanceMeta = { time_in?: string; time_out?: string };

interface Props {
    students: StudentProfile[];
    attendance: StudentAttendance[];
    onMark: (studentId: string, status: AttendanceStatus, metadata?: AttendanceMeta) => void;
    onRecordExit: (studentId: string, guardian: string, relation: string, reason: string) => void;
}

export function AttendanceBoard({ students, attendance, onMark, onRecordExit }: Props) {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<string>("all");
    const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

    // Filter Logic
    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.student_id.includes(search);
        const matchesGrade = filter === "all" || s.grade_level === filter;
        return matchesSearch && matchesGrade;
    });

    const getAttendance = (studentId: string) => attendance.find(a => a.student_id === studentId);

    const grades = Array.from(new Set(students.map(s => s.grade_level)));

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm md:flex-row">
                <div className="relative w-full flex-1">
                    <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="ابحث بالاسم أو الرقم..."
                        className="w-full rounded-2xl border border-border bg-surface-soft py-3 pr-12 pl-4 text-sm text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-primary/40"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                    <button
                        onClick={() => setFilter("all")}
                        className={`whitespace-nowrap rounded-xl border px-4 py-2 text-xs font-bold transition-colors ${filter === "all" ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface-soft text-muted-foreground hover:bg-muted'}`}
                    >
                        جميع الصفوف
                    </button>
                    {grades.map(g => (
                        <button
                            key={g}
                            onClick={() => setFilter(g)}
                            className={`whitespace-nowrap rounded-xl border px-4 py-2 text-xs font-bold transition-colors ${filter === g ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface-soft text-muted-foreground hover:bg-muted'}`}
                        >
                            {g}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredStudents.map(student => {
                    const status = getAttendance(student.id);
                    return (
                        <div
                            key={student.id}
                            className={`group rounded-2xl border bg-card p-6 shadow-sm transition-colors hover:border-primary/40 ${status ? 'border-border' : 'border-border/60'}`}
                        >
                            <div className="mb-4 flex items-start justify-between">
                                <div className="rounded-2xl border border-border bg-surface-soft p-3 transition-colors group-hover:border-primary/50">
                                    <User className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                                </div>
                                <div className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-tighter ${status?.status === 'present' ? 'bg-success/10 text-success' :
                                    status?.status === 'late' ? 'bg-warning/10 text-warning' :
                                        status?.status === 'absent' ? 'bg-destructive/10 text-destructive' :
                                            status?.status === 'excused_exit' ? 'bg-primary/10 text-primary' :
                                                'bg-muted text-muted-foreground'
                                    }`}>
                                    {status?.status === 'present' ? 'حاضر' : status?.status === 'late' ? 'متأخر' : status?.status === 'absent' ? 'غائب' : status?.status === 'excused_exit' ? 'مستأذن' : 'بانتظار'}
                                </div>
                            </div>

                            <div>
                                <h3 className="mb-1 text-sm font-bold text-foreground transition-colors group-hover:text-primary">{student.name}</h3>
                                <p className="mb-4 text-[10px] font-medium text-muted-foreground">{student.student_id} • {student.grade_level}</p>
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                                <button
                                    onClick={() => onMark(student.id, 'present')}
                                    className={`flex items-center justify-center rounded-2xl border p-3 transition-colors ${status?.status === 'present' ? 'border-success bg-success text-success-foreground' : 'border-border bg-surface-soft text-muted-foreground hover:border-success/50 hover:text-success'}`}
                                    title="حاضر"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => onMark(student.id, 'late', { time_in: new Date().toLocaleTimeString('en-GB') })}
                                    className={`flex items-center justify-center rounded-2xl border p-3 transition-colors ${status?.status === 'late' ? 'border-warning bg-warning text-warning-foreground' : 'border-border bg-surface-soft text-muted-foreground hover:border-warning/50 hover:text-warning'}`}
                                    title="متأخر"
                                >
                                    <Clock className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => onMark(student.id, 'absent')}
                                    className={`flex items-center justify-center rounded-2xl border p-3 transition-colors ${status?.status === 'absent' ? 'border-destructive bg-destructive text-destructive-foreground' : 'border-border bg-surface-soft text-muted-foreground hover:border-destructive/50 hover:text-destructive'}`}
                                    title="غائب"
                                >
                                    <XCircle className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setSelectedStudent(student.id)}
                                    className={`flex items-center justify-center rounded-2xl border p-3 transition-colors ${status?.status === 'excused_exit' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface-soft text-muted-foreground hover:border-primary/50 hover:text-primary'}`}
                                    title="استئذان"
                                >
                                    <LogOut className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Exit Modal */}
            <StudentExitModal
                isOpen={!!selectedStudent}
                studentName={students.find(s => s.id === selectedStudent)?.name || ""}
                studentId={students.find(s => s.id === selectedStudent)?.student_id || ""}
                onClose={() => setSelectedStudent(null)}
                onConfirm={(guardian, relation, reason) => {
                    if (selectedStudent) onRecordExit(selectedStudent, guardian, relation, reason);
                    setSelectedStudent(null);
                }}
            />
        </div>
    );
}
