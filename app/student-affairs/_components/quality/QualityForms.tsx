"use client";

import React, { useState } from "react";
import { FormC51_MorningTardy } from "./FormC51_MorningTardy";
import { FormC53_CounselorReferral } from "./FormC53_CounselorReferral";

export function StudentAffairsQualityForms() {
    const [activeForm, setActiveForm] = useState<string>("C-5-1");

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
                            ? "bg-[hsl(var(--gold))] text-white shadow-lg shadow-[hsla(var(--gold),.25)]"
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
