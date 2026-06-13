"use client";

import React from "react";
import { FileDown, Printer, FileText, ClipboardList, Loader2 } from "lucide-react";
import type { ActivityFinancial, ActivityClub, ClubAssignment, StudentWish, ActivityEvent, StudentHonor } from "@/lib/types/activity";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { useAuth } from "@/app/_context/AuthContext";
import {
    BudgetReport,
    ExpensesReport,
    SupervisorsReport,
    StudentWishesReport,
    EventsReport,
    HonorsReport,
    FullActivityRecord
} from "./ActivityReports";

interface ActivityStats {
    totalBudget: number;
    totalExpenses: number;
    expenseRatio: number;
    activeClubs: number;
    honoredStudents: number;
    upcomingEvents: number;
    totalWishes: number;
}

interface ExportButtonsProps {
    data: {
        financials: ActivityFinancial[];
        assignments: ClubAssignment[];
        wishes: StudentWish[];
        events: ActivityEvent[];
        honors: StudentHonor[];
        clubs: ActivityClub[];
        stats: ActivityStats;
    };
}

export function ExportButtons({ data }: ExportButtonsProps) {
    const { financials, assignments, wishes, events, honors, stats, clubs } = data;
    // اسم المدرسة ديناميكي من سياق المستأجر المصادَق (لا يُثبَّت في القالب)
    const { schoolName } = useAuth();
    const tenant = schoolName ?? undefined;

    const reports = [
        {
            id: "QF71-G-1-1",
            label: "توزيع المشرفين",
            code: "QF71-G-1-1",
            document: <SupervisorsReport assignments={assignments} schoolName={tenant} />
        },
        {
            id: "QF71-G-1-2",
            label: "ميزانية النشاط",
            code: "QF71-G-1-2",
            document: <BudgetReport items={financials.filter(f => f.type === 'budget')} schoolName={tenant} />
        },
        {
            id: "QF71-G-3-1",
            label: "رغبات الطلاب",
            code: "QF71-G-3-1",
            document: <StudentWishesReport wishes={wishes} clubs={clubs} schoolName={tenant} />
        },
        {
            id: "QF71-G-4-1",
            label: "سجل الفعاليات",
            code: "QF71-G-4-1",
            document: <EventsReport events={events} schoolName={tenant} />
        },
        {
            id: "QF71-G-5-1",
            label: "سجل المسابقات",
            code: "QF71-G-5-1",
            document: <EventsReport events={events.filter(e => e.type === 'competition')} schoolName={tenant} />
        },
        {
            id: "QF71-G-5-3",
            label: "كشف التكريم",
            code: "QF71-G-5-3",
            document: <HonorsReport honors={honors} schoolName={tenant} />
        },
        {
            id: "QF71-G-7-1",
            label: "سجل المصروفات",
            code: "QF71-G-7-1",
            document: <ExpensesReport expenses={financials.filter(f => f.type === 'expense')} schoolName={tenant} />
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-1000 pb-20">
            {reports.map((report) => (
                <div
                    key={report.id}
                    className="group bg-white/80 border border-stone-200 p-8 rounded-[2.5rem] hover:border-orange-500/30 transition-all duration-500 relative overflow-hidden"
                >
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-4 bg-white rounded-2xl border border-stone-200">
                            <FileDown className="w-5 h-5 text-stone-500 group-hover:text-[hsl(var(--accent-primary))] transition-colors" />
                        </div>
                        <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">{report.code}</span>
                    </div>
                    <h4 className="text-sm font-black text-foreground mb-2">{report.label}</h4>
                    <p className="text-[10px] text-stone-500 font-bold mb-6">استخراج النموذج الرسمي المعتمد من وزارة التعليم</p>

                    <PDFDownloadLink
                        document={report.document}
                        fileName={`${report.code}_${new Date().toISOString().split('T')[0]}.pdf`}
                        className="w-full"
                    >
                        {({ loading }) => (
                            <button
                                disabled={loading}
                                className="w-full py-4 bg-white border border-stone-200 hover:border-stone-200 text-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 group-hover:shadow-2xl disabled:opacity-50"
                            >
                                {loading ? (
                                    <>جاري التوليد... <Loader2 className="w-3 h-3 animate-spin" /></>
                                ) : (
                                    <>تحميل النموذج <Printer className="w-3 h-3" /></>
                                )}
                            </button>
                        )}
                    </PDFDownloadLink>
                </div>
            ))}


            {/* Special Main Record */}
            <div className="lg:col-span-1 group bg-gradient-to-br from-[hsl(var(--accent-primary))] to-[hsl(var(--accent-primary))] p-8 rounded-[2.5rem] shadow-xl shadow-[hsla(var(--accent-primary),.20)] transition-all duration-500 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-stone-200/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex justify-between items-start mb-6">
                    <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl border border-stone-200">
                        <ClipboardList className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">QF71-G-3-2</span>
                </div>
                <h4 className="text-sm font-black text-foreground mb-2">السجل التراكمي الشامل</h4>
                <p className="text-[10px] text-stone-500 font-bold mb-6">توليد ملف كامل يحتوي على كافة بيانات النشاط للفصل الدراسي</p>

                <PDFDownloadLink
                    document={<FullActivityRecord events={events} honors={honors} stats={stats} schoolName={tenant} />}
                    fileName="Comprehensive_Activity_Record.pdf"
                    className="w-full"
                >
                    {({ loading }) => (
                        <button
                            disabled={loading}
                            className="w-full py-4 bg-white text-[hsl(var(--accent-primary))] rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 group-hover:scale-[1.02]"
                        >
                            {loading ? (
                                <>جاري التصدير... <Loader2 className="w-3 h-3 animate-spin" /></>
                            ) : (
                                <>تصدير السجل الكامل <FileText className="w-3 h-3" /></>
                            )}
                        </button>
                    )}
                </PDFDownloadLink>
            </div>
        </div>
    );
}
