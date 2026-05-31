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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card/50 p-4 rounded-[2rem] border border-border">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="ابحث بالاسم أو الرقم..."
                        className="w-full bg-background border border-border rounded-2xl py-3 pl-12 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                    <button
                        onClick={() => setFilter("all")}
                        className={`px-4 py-2 rounded-xl border text-xs font-bold whitespace-nowrap transition-all ${filter === "all" ? 'bg-primary border-primary text-primary-foreground' : 'bg-background border-border text-muted-foreground hover:border-muted'}`}
                    >
                        جميع الصفوف
                    </button>
                    {grades.map(g => (
                        <button
                            key={g}
                            onClick={() => setFilter(g)}
                            className={`px-4 py-2 rounded-xl border text-xs font-bold whitespace-nowrap transition-all ${filter === g ? 'bg-primary border-primary text-primary-foreground' : 'bg-background border-border text-muted-foreground hover:border-muted'}`}
                        >
                            {g}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredStudents.map(student => {
                    const status = getAttendance(student.id);
                    return (
                        <div
                            key={student.id}
                            className={`group relative overflow-hidden bg-card border transition-all duration-500 rounded-[2.5rem] p-6 hover:shadow-2xl hover:shadow-primary/10 ${status ? 'border-border' : 'border-border/50 opacity-80 hover:opacity-100'}`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-background rounded-2xl border border-border group-hover:border-primary/50 transition-colors">
                                    <User className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                                </div>
                                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${status?.status === 'present' ? 'bg-success/10 text-success' :
                                    status?.status === 'late' ? 'bg-warning/10 text-warning' :
                                        status?.status === 'absent' ? 'bg-destructive/10 text-destructive' :
                                            status?.status === 'excused_exit' ? 'bg-primary/10 text-primary' :
                                                'bg-background text-muted-foreground'
                                    }`}>
                                    {status?.status === 'present' ? 'حاضر' : status?.status === 'late' ? 'متأخر' : status?.status === 'absent' ? 'غائب' : status?.status === 'excused_exit' ? 'مستأذن' : 'بانتظار'}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{student.name}</h3>
                                <p className="text-[10px] text-muted-foreground font-medium mb-4">{student.student_id} • {student.grade_level}</p>
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                                <button
                                    onClick={() => onMark(student.id, 'present')}
                                    className={`p-3 flex items-center justify-center rounded-2xl border transition-all ${status?.status === 'present' ? 'bg-success border-success text-success-foreground' : 'bg-background border-border text-muted-foreground hover:border-success/50 hover:text-success'}`}
                                    title="حاضر"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => onMark(student.id, 'late', { time_in: new Date().toLocaleTimeString('en-GB') })}
                                    className={`p-3 flex items-center justify-center rounded-2xl border transition-all ${status?.status === 'late' ? 'bg-warning border-warning text-warning-foreground' : 'bg-background border-border text-muted-foreground hover:border-warning/50 hover:text-warning'}`}
                                    title="متأخر"
                                >
                                    <Clock className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => onMark(student.id, 'absent')}
                                    className={`p-3 flex items-center justify-center rounded-2xl border transition-all ${status?.status === 'absent' ? 'bg-destructive border-destructive text-destructive-foreground' : 'bg-background border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive'}`}
                                    title="غائب"
                                >
                                    <XCircle className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setSelectedStudent(student.id)}
                                    className={`p-3 flex items-center justify-center rounded-2xl border transition-all ${status?.status === 'excused_exit' ? 'bg-primary border-primary text-primary-foreground' : 'bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-primary'}`}
                                    title="استئذان"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Background Polish */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[80px] rounded-full -mr-16 -mt-16 pointer-events-none"></div>
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

import { StudentExitModal } from "./StudentExitModal";
