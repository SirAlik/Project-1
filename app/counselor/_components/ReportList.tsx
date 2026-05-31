import React, { useMemo, useState } from "react";
import { ParentReportRow } from "@/lib/types/counselor";

interface ReportListProps {
    reports: ParentReportRow[];
    studentNameById: (id: string | null) => string;
    classNameById: (id: string | null) => string;
    openReportAsCase: (report: ParentReportRow) => void;
}

export function ReportList({ reports, studentNameById, classNameById, openReportAsCase }: ReportListProps) {
    const [studentQuery, setStudentQuery] = useState("");
    const [classQuery, setClassQuery] = useState("");

    const filtered = useMemo(() => {
        return reports.filter((r) => {
            const sName = studentNameById(r.student_id);
            const cName = classNameById(r.class_id);
            const sOk = studentQuery.trim() ? sName.includes(studentQuery.trim()) : true;
            const cOk = classQuery.trim() ? cName.includes(classQuery.trim()) : true;
            return sOk && cOk;
        });
    }, [reports, studentQuery, classQuery, studentNameById, classNameById]);

    function fmtDateTime(iso: string) {
        return new Date(iso).toLocaleString("ar-SA", {
            year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"
        });
    }

    return (
        <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
            {/* Local Filters used to be global in page.tsx, moving some here or keeping global? 
          The simplified plan implies moving logic into components. 
          Let's include simple filters here or accept filtered list? 
          For reusable components, internal filtering is easier unless global filter is required.
          I'll add local input fields for now as per the "refactor" goal to make page.tsx smaller.
      */}
            <div className="flex flex-wrap gap-2 mb-4">
                <input
                    value={studentQuery} onChange={e => setStudentQuery(e.target.value)}
                    placeholder="بحث بالطالب..."
                    className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none"
                />
                <input
                    value={classQuery} onChange={e => setClassQuery(e.target.value)}
                    placeholder="بحث بالفصل..."
                    className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none"
                />
            </div>

            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">بلاغات ولي الأمر</h2>
                <div className="text-xs text-zinc-400">عدد: {filtered.length}</div>
            </div>

            <div className="mt-4 space-y-2">
                {filtered.length === 0 ? (
                    <div className="text-sm text-zinc-400">لا توجد بلاغات.</div>
                ) : (
                    filtered.map((r) => (
                        <div key={r.id} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-sm">
                                    <span className="font-semibold">{r.title || "بلاغ بدون عنوان"}</span>
                                    <span className="text-zinc-400"> — </span>
                                    <span className="text-zinc-300">{r.status || "غير محدد"}</span>
                                </div>
                                <div className="text-xs text-zinc-400">{fmtDateTime(r.created_at)}</div>
                            </div>

                            <div className="mt-2 text-sm text-zinc-300 whitespace-pre-wrap">
                                {r.details || <span className="text-zinc-500">بدون تفاصيل</span>}
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                                <span>الطالب: {studentNameById(r.student_id)}</span>
                                <span>•</span>
                                <span>الفصل: {classNameById(r.class_id)}</span>
                                <span>•</span>
                                <span>case_id: {r.case_id ?? "لا يوجد"}</span>
                            </div>

                            <div className="mt-3">
                                <button
                                    onClick={() => openReportAsCase(r)}
                                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500"
                                >
                                    فتح البلاغ كمعاملة
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}
