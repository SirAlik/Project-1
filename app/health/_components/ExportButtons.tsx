"use client";

import React from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { FileDown, Loader2 } from "lucide-react";
import type { HealthVisit, HealthSupply, HygieneLog, CanteenCheck } from "@/lib/types/health";
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
    const reports = [
        {
            label: "سجل الزيارات (QF-70-j-4-1)",
            document: <VisitLogReport visits={state.visits} />,
            fileName: "سجل_الزيارات.pdf",
        },
        {
            label: "سجل العهدة (QF-70-j-3-1)",
            document: <SupplyLogReport supplies={state.supplies} />,
            fileName: "سجل_العهدة.pdf",
        },
        {
            label: "فحص النظافة (QF-70-j-6-1)",
            document: <HygieneReport logs={state.hygieneLogs} />,
            fileName: "فحص_النظافة.pdf",
        },
        {
            label: "متابعة المقصف (QF-70-j-8-1)",
            document: <CanteenReport checks={state.canteenChecks} />,
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
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-sm group"
                >
                    {({ loading }) => (
                        <>
                            <span className="text-zinc-300 group-hover:text-emerald-300 transition-colors">
                                {report.label}
                            </span>
                            {loading ? (
                                <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                            ) : (
                                <FileDown className="w-4 h-4 text-zinc-500 group-hover:text-emerald-500 transition-colors" />
                            )}
                        </>
                    )}
                </PDFDownloadLink>
            ))}
        </div>
    );
}
