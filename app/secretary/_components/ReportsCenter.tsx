"use client";

import React from "react";
import { PDFDownloadLink, type DocumentProps } from "@react-pdf/renderer";
import { useAuth } from "@/app/_context/AuthContext";
import {
    Download,
    Printer,
    Users,
    Mail,
    Calendar,
} from "lucide-react";
import {
    LateInquiryPDF,
    AbsenceInquiryPDF,
    DeductionDecisionPDF,
    AttendanceExitLogPDF,
    EmergencyLeavePDF,
    IncomingLogPDF,
    OutgoingLogPDF,
    AssignmentLetterPDF,
    OfficialLetterPDF,
    CommencementLetterPDF,
    ClearanceFormPDF,
    MeetingInvitationPDF,
    MeetingMinutesPDF,
    ProcurementRequestPDF
} from "./SecretaryReports";
import {
    HRInquiry, LeaveRow, AttendanceLog, CorrespondenceRow,
    AssignmentLetter, Meeting, ProcurementRequest, Employee
} from "@/lib/types/secretary";

interface SecretaryState {
    inquiries: HRInquiry[];
    attendance: AttendanceLog[];
    leaves: LeaveRow[];
    letters: CorrespondenceRow[];
    assignments: AssignmentLetter[];
    meetings: Meeting[];
    procurement: ProcurementRequest[];
    employees: Employee[];
}

interface ReportEntry {
    id: string;
    name: string;
    data: unknown;
    component: React.ComponentType<Record<string, unknown>>;
}

interface Props {
    state: SecretaryState;
}

export function ReportsCenter({ state }: Props) {
    // اسم المدرسة ديناميكي من سياق المستأجر المصادَق (لا يُثبَّت في القالب)
    const { schoolName } = useAuth();

    const reportCategories = [
        {
            title: "الموارد البشرية والحضور",
            icon: Users,
            color: "rose",
            reports: [
                { id: "QF71-A-3-1", name: "استفسار تأخر", data: state.inquiries?.find((i: HRInquiry) => i.type === 'late'), component: LateInquiryPDF },
                { id: "QF71-A-3-2", name: "استفسار غياب", data: state.inquiries?.find((i: HRInquiry) => i.type === 'absence'), component: AbsenceInquiryPDF },
                { id: "QF71-A-3-3", name: "قرار حسم راتب", data: state.inquiries?.find((i: HRInquiry) => i.status === 'deducted'), component: DeductionDecisionPDF },
                { id: "QF71-A-3-4", name: "سجل الاستئذان اليومي", data: state.attendance, component: AttendanceExitLogPDF },
                { id: "QF71-A-3-5", name: "طلب إجازة اضطرارية", data: state.leaves?.find((l: LeaveRow) => l.is_emergency), component: EmergencyLeavePDF },
            ] as ReportEntry[]
        },
        {
            title: "المراسلات والوثائق",
            icon: Mail,
            color: "indigo",
            reports: [
                { id: "QF71-A-2-1", name: "سجل الوارد العام", data: state.letters, component: IncomingLogPDF },
                { id: "QF71-A-2-2", name: "سجل الصادر العام", data: state.letters, component: OutgoingLogPDF },
                { id: "QF71-A-2-3", name: "قرار تكليف بمهمة", data: state.assignments?.[0], component: AssignmentLetterPDF },
                { id: "QF71-A-2-4", name: "خطاب رسمي", data: state.letters?.[0], component: OfficialLetterPDF },
                { id: "QF71-A-2-5", name: "خطاب مباشرة عمل", data: state.assignments?.[0], component: CommencementLetterPDF },
                { id: "QF71-A-2-6", name: "نموذج إخلاء طرف", data: state.assignments?.[0], component: ClearanceFormPDF },
            ] as ReportEntry[]
        },
        {
            title: "الاجتماعات والمشتريات",
            icon: Calendar,
            color: "emerald",
            reports: [
                { id: "QF19-1", name: "دعوة اجتماع", data: state.meetings?.[0], component: MeetingInvitationPDF },
                { id: "QF19-2", name: "محضر اجتماع", data: state.meetings?.[0], component: MeetingMinutesPDF },
                { id: "QF71-A-4-1", name: "طلب احتياج / شراء", data: state.procurement?.[0], component: ProcurementRequestPDF },
            ] as ReportEntry[]
        }
    ];

    const renderDocument = (report: ReportEntry): React.ReactElement<DocumentProps> | null => {
        if (!report.component || !report.data) return null;

        const props: Record<string, unknown> = {};
        const data = report.data as Record<string, unknown>;

        // Context-aware prop assignment
        if (report.id.startsWith('QF71-A-3')) {
            if (report.id === 'QF71-A-3-4') props.logs = data;
            else if (report.id === 'QF71-A-3-5') props.leave = data;
            else props.inquiry = data;
        } else if (report.id.startsWith('QF71-A-2')) {
            if (report.id === 'QF71-A-2-1' || report.id === 'QF71-A-2-2') props.letters = data;
            else if (report.id === 'QF71-A-2-4') props.correspondence = data;
            else props.letter = data;
        } else if (report.id.startsWith('QF19')) {
            props.meeting = data;
        } else if (report.id === 'QF71-A-4-1') {
            props.request = data;
        }

        // إضافة بيانات الموظف إن وجدت
        if (typeof data.employee_id === 'string' || data.employee) {
            props.employee = state.employees.find((e: Employee) => e.id === data.employee_id) ?? data.employee;
        }

        // اسم المدرسة ديناميكي من سياق المستأجر المصادَق (لا يُثبَّت في القالب)
        props.schoolName = schoolName ?? undefined;

        return React.createElement(report.component, props) as unknown as React.ReactElement<DocumentProps>;
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {reportCategories.map((category, idx) => (
                    <div key={idx} className="space-y-4">
                        <div className="flex items-center gap-3 px-2">
                            <div className={`p-2 rounded-xl bg-stone-100 border border-stone-200 text-${category.color}-400`}>
                                <category.icon className="w-4 h-4" />
                            </div>
                            <h3 className="text-sm font-black text-foreground uppercase tracking-wider">{category.title}</h3>
                        </div>

                        <div className="bg-white/80 border border-stone-200 rounded-[2.5rem] overflow-hidden">
                            {category.reports.map((report, rIdx) => (
                                <div key={rIdx} className="p-5 border-b border-stone-200 last:border-0 hover:bg-stone-100/80 transition-all group">
                                    <div className="flex justify-between items-center mb-2">
                                        <div>
                                            <p className="text-[10px] font-black text-stone-500 mb-1">{report.id}</p>
                                            <h4 className="text-xs font-bold text-foreground group-hover:text-indigo-400 transition-colors">{report.name}</h4>
                                        </div>
                                        <div className="flex gap-2">
                                            {report.data ? (
                                                <PDFDownloadLink
                                                    document={renderDocument(report)!}
                                                    fileName={`${report.id}-${new Date().toISOString().split('T')[0]}.pdf`}
                                                >
                                                    {({ loading }) => (
                                                        <span className={`p-3 bg-white text-stone-500 hover:text-foreground hover:bg-indigo-500 transition-all rounded-2xl border border-stone-200 flex items-center justify-center ${loading ? 'opacity-50' : 'cursor-pointer'}`}>
                                                            <Download className="w-4 h-4" />
                                                        </span>
                                                    )}
                                                </PDFDownloadLink>
                                            ) : (
                                                <button className="p-3 bg-white text-stone-500 cursor-not-allowed rounded-2xl border border-stone-200 opacity-50 shadow-inner" title="بانتظار توفر البيانات">
                                                    <Download className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-3">
                                        <div className="h-1 flex-1 bg-white rounded-full overflow-hidden">
                                            <div className={`h-full transition-all duration-1000 ${report.data ? 'bg-indigo-500 w-full' : 'bg-stone-200 w-1/4'}`}></div>
                                        </div>
                                        <span className="text-[8px] font-black text-stone-500 uppercase italic">
                                            {report.data ? 'جاهز للتصدير' : 'بانتظار بيانات'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-8 bg-indigo-500/5 border border-indigo-500/10 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-indigo-500/20 rounded-3xl">
                        <Printer className="w-8 h-8 text-indigo-400" />
                    </div>
                    <div>
                        <h4 className="text-white font-bold text-lg leading-tight text-center md:text-right">التصدير الشامل للتقارير السنوية</h4>
                        <p className="text-stone-500 text-xs mt-1 text-center md:text-right font-medium">يمكنك تحميل جميع السجلات والمحاضر في ملف واحد مضغوط للإرسال إلى قسم الجودة.</p>
                    </div>
                </div>
                <button className="px-8 py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase hover:bg-zinc-200 transition-all shadow-xl shadow-white/5 active:scale-95">
                    تحميل الأرشيف الكامل
                </button>
            </div>
        </div>
    );
}
