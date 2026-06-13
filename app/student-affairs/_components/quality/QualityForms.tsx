"use client";

import React, { useState } from "react";
import { FormC51_MorningTardy } from "./FormC51_MorningTardy";
import { FormC53_CounselorReferral } from "./FormC53_CounselorReferral";
import { useAuth } from "@/app/_context/AuthContext";
import { isQualityModuleEnabled } from "@/lib/quality/tenant-templates";
import { QualityDisabledNotice } from "@/components/quality/QualityDisabledNotice";

export function StudentAffairsQualityForms() {
    // بوّابة الإتاحة لكل مستأجر (fail-closed): مدرسة غير مُسجَّلة في سجلّ القوالب → حالة فارغة صادقة
    const { schoolId, isLoading } = useAuth();
    const [activeForm, setActiveForm] = useState<string>("C-5-1");

    if (isLoading) return null;
    if (!isQualityModuleEnabled(schoolId, 'student_affairs')) {
        return <QualityDisabledNotice moduleLabel="شؤون الطلاب" />;
    }

    const tabs = [
        { id: "C-5-1", name: "سجل التأخر الصباحي (C-5-1)", code: "QF-71-C-5-1" },
        { id: "C-5-3", name: "تحويل الموجه (C-5-3)", code: "QF-71-C-5-3" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-3 border-b border-stone-200 pb-4">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveForm(tab.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeForm === tab.id
                            ? "bg-[hsl(var(--accent-primary))] text-white shadow-lg shadow-[hsla(var(--accent-primary),.25)]"
                            : "bg-stone-100 text-stone-500 hover:bg-stone-200 border border-stone-200"
                            }`}
                    >
                        {tab.name}
                    </button>
                ))}
            </div>

            <div className="bg-white/80 rounded-2xl border border-stone-200 p-1">
                {activeForm === "C-5-1" && <FormC51_MorningTardy />}
                {activeForm === "C-5-3" && <FormC53_CounselorReferral />}
            </div>
        </div>
    );
}
