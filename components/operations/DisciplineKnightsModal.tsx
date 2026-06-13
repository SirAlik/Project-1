"use client";

import React, { useState, useCallback, startTransition } from "react";
import { Card } from "@/components/ui/Card";
import { X, Trophy, Download, ShieldCheck, User, Calendar, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { supabase } from "@/lib/db/supabase";

interface Student {
    id: string;
    name: string;
    class: string;
    absences: number;
    infractions: number;
    lates: number;
    is_approved?: boolean;
}

interface DisciplineKnightsModalProps {
    isOpen: boolean;
    onClose: () => void;
    userRole: "school_principal" | "school_admin" | "school_affairs_vp" | "student_affairs_vp" | "student_counselor" | "system_owner";
}

const HIJRI_MONTHS = [
    "محرم", "صفر", "ربيع الأول", "ربيع الثاني", "جمادى الأولى", "جمادى الآخرة",
    "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"
];

// Mock data removed - now using Supabase

export function DisciplineKnightsModal({ isOpen, onClose, userRole }: DisciplineKnightsModalProps) {
    const [selectedMonth, setSelectedMonth] = useState(4); // Jumada al-Ula as default
    const [, setIsGenerating] = useState(false);
    const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
    const [knights, setKnights] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);

    const loadKnights = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch Students
            type StudentRow = { id: string; name: string; class_id: string; is_approved?: boolean };
            let studentsData: StudentRow[] = [];
            const { data: s2, error: e2 } = await supabase.from("student_profiles").select("id, name, class_id, is_approved");
            if (!e2 && s2) studentsData = s2;
            else {
                // Fallback for safety, but student_profiles is primary
                const { data: s1 } = await supabase.from("student_profiles").select("id, name, class_id, is_approved");
                if (s1) studentsData = s1;
            }

            if (studentsData.length === 0) {
                setLoading(false);
                return;
            }

            // Fetch classes in bulk
            const { data: classesData } = await supabase.from("classes").select("id, name");
            const classMap = new Map((classesData || []).map((c: { id: string; name: string }) => [c.id, c.name]));

            // 2. Fetch all events for the current month
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const { data: events, error: evErr } = await supabase
                .from("events")
                .select("student_id, type")
                .gte("event_date", startOfMonth.toISOString().split("T")[0]);

            if (evErr) throw evErr;

            // 3. Filter "Knights" (0 absences, 0 lates, 0 infractions)
            const knightsList: Student[] = [];

            // Map students to their event counts
            for (const s of studentsData) {
                type EvRow = { student_id: string; type: string };
                const sEvs = ((events || []) as EvRow[]).filter(e => e.student_id === s.id);
                const abs = sEvs.filter(e => e.type === "غياب").length;
                const lates = sEvs.filter(e => e.type === "تأخر").length;
                const infr = sEvs.filter(e => e.type === "مخالفة").length;

                if (abs === 0 && lates === 0 && infr === 0) {
                    knightsList.push({
                        id: s.id,
                        name: s.name,
                        class: (classMap.get(s.class_id) || "بدون فصل") as string,
                        absences: 0,
                        infractions: 0,
                        lates: 0,
                        is_approved: s.is_approved
                    });
                }
            }
            setKnights(knightsList);
        } catch (err) {
            console.error("Failed to load knights:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        if (isOpen) startTransition(async () => { await loadKnights(); });
    }, [isOpen, loadKnights]);

    if (!isOpen) return null;

    const canExport = ["school_principal", "school_admin", "system_owner"].includes(userRole);

    const generatePDF = async (student: Student) => {
        if (!canExport) return;
        setIsGenerating(true);
        setCurrentStudent(student);

        // Wait for state to update and layout to render
        setTimeout(async () => {
            const element = document.getElementById("certificate-content");
            if (element) {
                const canvas = await html2canvas(element, { scale: 2, useCORS: true });
                const imgData = canvas.toDataURL("image/png");
                const pdf = new jsPDF("l", "mm", "a4");
                const width = pdf.internal.pageSize.getWidth();
                const height = pdf.internal.pageSize.getHeight();
                pdf.addImage(imgData, "PNG", 0, 0, width, height);
                pdf.save(`شهادة_شكر_${student.name}.pdf`);
            }
            setIsGenerating(false);
            setCurrentStudent(null);
        }, 500);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
            {/* Main Modal */}
            <Card className="w-full max-w-4xl bg-card p-0 relative overflow-hidden shadow-2xl shadow-primary/10 border-border">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-teal-600 via-blue-500 to-teal-600" />

                <header className="p-8 border-b border-border flex justify-between items-center bg-muted/30">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                            <Trophy className="text-white w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-foreground flex items-center gap-3">
                                قائمة فرسان الانضباط
                                <span className="text-[10px] bg-teal-500/10 text-teal-500 px-3 py-1 rounded-full border border-teal-500/20 uppercase tracking-widest font-black">شهري</span>
                            </h2>
                            <p className="text-muted-foreground text-sm mt-1">الطلاب المتميزون بـ (صفر غياب، صفر تأخير، صفر مخالفات)</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-background rounded-xl px-4 py-2 flex items-center gap-3 border border-border text-foreground">
                            <Calendar className="w-4 h-4 text-teal-500" />
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                className="bg-transparent text-sm font-bold focus:outline-none text-foreground appearance-none cursor-pointer"
                                aria-label="اختر الشهر الهجري"
                            >
                                {HIJRI_MONTHS.map((m, i) => (
                                    <option key={i} value={i} className="bg-background text-foreground">{m}</option>
                                ))}
                            </select>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors" aria-label="إغلاق النافذة">
                            <X size={20} className="text-muted-foreground" />
                        </button>
                    </div>
                </header>

                <div className="p-8 max-h-[60vh] overflow-y-auto no-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-10 h-10 text-primary animate-spin" />
                            <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">جاري فحص سجلات الانضباط...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {knights.map((student) => (
                                <div key={student.id} className="group relative bg-card border border-border rounded-2xl p-6 hover:border-primary/50 transition-all">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                                                <User className="text-teal-500 w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">{student.name}</h4>
                                                <p className="text-muted-foreground text-xs">الفصل: {student.class}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2 items-end">
                                            {canExport && (
                                                <button
                                                    disabled={!student.is_approved}
                                                    onClick={() => generatePDF(student)}
                                                    className={`font-black px-4 py-2 rounded-xl text-[10px] uppercase flex items-center gap-2 transition-all shadow-lg active:scale-95 ${student.is_approved
                                                        ? "bg-gradient-to-r from-teal-600 to-blue-600 text-white shadow-teal-600/20 hover:shadow-teal-600/40"
                                                        : "bg-muted text-muted-foreground cursor-not-allowed border border-border"
                                                        }`}
                                                    title={!student.is_approved ? "بانتظار الموافقة على الشهادة" : ""}
                                                >
                                                    <Download className="w-3.5 h-3.5" /> توليد الشهادة
                                                </button>
                                            )}
                                            {!student.is_approved && (
                                                <span className="text-[10px] text-teal-500/70 italic font-bold">بانتظار الموافقة</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-4 flex gap-2">
                                        <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-lg border border-emerald-500/20 font-bold">0 غياب</span>
                                        <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-lg border border-emerald-500/20 font-bold">0 تأخير</span>
                                        <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-lg border border-emerald-500/20 font-bold">0 مخالفات</span>
                                    </div>
                                </div>
                            ))}
                            {knights.length === 0 && !loading && (
                                <div className="col-span-2 text-center py-20 bg-muted/30 rounded-3xl border border-dashed border-border">
                                    <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">لا يوجد طلاب مستحقون حالياً بناءً على السجلات الحالية.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <footer className="p-6 bg-muted/30 border-t border-border text-center">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">هذه القائمة محدثة بناءً على بيانات الحضور والإنصراف الذكية والسجل السلوكي.</p>
                </footer>
            </Card>


            {/* Hidden Certificate Content for PDF Generation */}
            <div className="fixed -left-[2000px] top-0 overflow-hidden">
                {currentStudent && (
                    <div id="certificate-content" className="w-[1123px] h-[794px] bg-white p-20 relative text-zinc-900 font-serif" dir="rtl">
                        {/* Border Decoration */}
                        <div className="absolute inset-4 border-[10px] border-[hsla(var(--accent-primary),.20)]" />
                        <div className="absolute inset-8 border-2 border-[hsl(var(--accent-primary))]" />

                        {/* Header */}
                        <div className="flex justify-between items-start mb-20 relative">
                            <div className="text-center">
                                <h3 className="text-xl font-bold">المملكة العربية السعودية</h3>
                                <h3 className="text-xl font-bold">وزارة التعليم</h3>
                                <h3 className="text-lg">مدرسة ذكية متطورة</h3>
                            </div>
                            <div className="w-32 h-32 bg-zinc-100 rounded-full flex items-center justify-center border-2 border-[hsl(var(--accent-primary))]">
                                <ShieldCheck className="w-16 h-16 text-[hsl(var(--accent-primary))]" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-sm font-bold">التاريخ: {new Date().toLocaleDateString('ar-SA')}هـ</h3>
                                <h3 className="text-sm font-bold">اسم البرنامج: فرسان الانضباط</h3>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="text-center relative">
                            <h1 className="text-6xl font-black text-[hsl(var(--accent-primary))] mb-12">شهادة شكر وتقدير</h1>
                            <p className="text-2xl mb-8">يسر إدارة المدرسة أن تتقدم بوافر الشكر والتقدير للفارس:</p>
                            <h2 className="text-5xl font-black text-zinc-900 border-b-4 border-[hsl(var(--accent-primary))] inline-block px-12 py-4 mb-8">
                                {currentStudent.name}
                            </h2>
                            <p className="text-2xl mb-12 leading-relaxed">
                                من فصل: <span className="font-bold">{currentStudent.class}</span> <br />
                                وذلك نظير انضباطه المتميز وتحقيقه (صفر) غياب وتأخير ومخالفات <br />
                                خلال شهر <span className="font-bold text-[hsl(var(--accent-primary))]">{HIJRI_MONTHS[selectedMonth]}</span> لعام ١٤٤٥هـ
                            </p>
                        </div>

                        {/* Footer / Stamp Area */}
                        <div className="flex justify-around items-center mt-20 relative">
                            <div className="text-center">
                                <p className="text-xl font-bold mb-16">وكيل شؤون الطلاب</p>
                                <p className="text-lg">..........................</p>
                            </div>
                            <div className="w-40 h-40 border-4 border-dashed border-[hsla(var(--accent-primary),.30)] flex items-center justify-center rounded-full opacity-50 rotate-12">
                                <p className="text-[hsl(var(--accent-primary))] font-bold text-sm text-center">ختم وتوقيع <br /> مدير المدرسة</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xl font-bold mb-16">مدير المدرسة</p>
                                <p className="text-lg">..........................</p>
                            </div>
                        </div>

                        {/* Decorative Icons */}
                        <Trophy className="absolute bottom-10 right-10 w-24 h-24 text-[hsla(var(--accent-primary),.10)] rotate-12" />
                    </div>
                )}
            </div>
        </div>
    );
}
