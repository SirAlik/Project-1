"use client";

import React from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { FileDown, Loader2 } from "lucide-react";
import type { HealthVisit, HealthSupply, HygieneLog, CanteenCheck } from "@/lib/types/health";
import { useAuth } from "@/app/_context/AuthContext";
import { isQualityModuleEnabled } from "@/lib/quality/tenant-templates";
import { QualityDisabledNotice } from "@/components/quality/QualityDisabledNotice";
import {
    VisitLogReport,
    SupplyLogReport,
    HygieneReport,
    CanteenReport
} from "./HealthReports";

interface HealthExportState {
    visits: HealthVisit[];
    supplies: HealthSupply[];
    hygieneLogs: HygieneLog[];
    canteenChecks: CanteenCheck[];
}

interface ExportButtonsProps {
    state: HealthExportState;
}

export function ExportButtons({ state }: ExportButtonsProps) {
    // اسم المدرسة + المعرّف من سياق المستأجر المصادَق (لا يُثبَّت في القالب)
    const { schoolName, schoolId, isLoading } = useAuth();

    // بوّابة الإتاحة لكل مستأجر (fail-closed): مدرسة غير مُسجَّلة في سجلّ القوالب → حالة فارغة صادقة
    if (isLoading) return null;
    if (!isQualityModuleEnabled(schoolId, 'health')) {
        return <QualityDisabledNotice moduleLabel="الصحة المدرسية" />;
    }

    const reports = [
        {
            label: "سجل الزيارات (QF-70-j-4-1)",
            document: <VisitLogReport visits={state.visits} schoolName={schoolName ?? undefined} />,
            fileName: "سجل_الزيارات.pdf",
        },
        {
            label: "سجل العهدة (QF-70-j-3-1)",
            document: <SupplyLogReport supplies={state.supplies} schoolName={schoolName ?? undefined} />,
            fileName: "سجل_العهدة.pdf",
        },
        {
            label: "فحص النظافة (QF-70-j-6-1)",
            document: <HygieneReport logs={state.hygieneLogs} schoolName={schoolName ?? undefined} />,
            fileName: "فحص_النظافة.pdf",
        },
        {
            label: "متابعة المقصف (QF-70-j-8-1)",
            document: <CanteenReport checks={state.canteenChecks} schoolName={schoolName ?? undefined} />,
            fileName: "متابعة_المقصف.pdf",
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {reports.map((report, idx) => (
                <PDFDownloadLink
                    key={idx}
                    document={report.document}
                    fileName={report.fileName}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/80 border border-stone-200 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-sm group"
                >
                    {({ loading }) => (
                        <>
                            <span className="text-stone-600 group-hover:text-emerald-300 transition-colors">
                                {report.label}
                            </span>
                            {loading ? (
                                <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                            ) : (
                                <FileDown className="w-4 h-4 text-stone-500 group-hover:text-emerald-500 transition-colors" />
                            )}
                        </>
                    )}
                </PDFDownloadLink>
            ))}
        </div>
    );
}
