import React, { useState } from "react";
import { Form42_IndividualSession } from "@/app/counselor/_components/Form42_IndividualSession";
import { Form43_FollowUp } from "@/app/counselor/_components/Form43_FollowUp";
import { Form82_AbsenceFollowUp } from "@/app/counselor/_components/Form82_AbsenceFollowUp";
import { Form22_ComprehensiveProfile } from "@/app/counselor/_components/Form22_ComprehensiveProfile";
import { CaseRow } from "@/lib/types/counselor";

interface QualityFormsProps {
    studentsList: { id: string; name: string }[];
    classesList: { id: string; name: string }[];
    cases: CaseRow[];
    getAbsenceCount: (studentId: string) => Promise<number>;
    user?: unknown;
    userName?: string | null;
}

export function QualityForms({ studentsList, classesList, cases, getAbsenceCount, user, userName }: QualityFormsProps) {
    const [activeForm, setActiveForm] = useState<string>("4-2");

    const tabs = [
        { id: "2-2", name: "دراسة حالة (2-2)", code: "QF-71-C-2-2" },
        { id: "4-2", name: "مقابلة فردية (4-2)", code: "QF-71-F-4-2" },
        { id: "4-3", name: "متابعة حالة (4-3)", code: "QF-71-F-4-3" },
        { id: "8-2", name: "متابعة غياب (8-2)", code: "QF-71-F-8-2" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-3 border-b border-stone-200 pb-4">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveForm(tab.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeForm === tab.id
                            ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                            : "bg-stone-100 text-stone-500 hover:bg-stone-200 border border-stone-200"
                            }`}
                    >
                        {tab.name}
                    </button>
                ))}
            </div>

            <div className="bg-white/80 rounded-2xl border border-stone-200 p-1">
                {activeForm === "2-2" && (
                    <Form22_ComprehensiveProfile studentsList={studentsList} classesList={classesList} cases={cases} user={user} />
                )}
                {activeForm === "4-2" && (
                    <Form42_IndividualSession studentsList={studentsList} classesList={classesList} cases={cases} user={user} userName={userName} />
                )}
                {activeForm === "4-3" && (
                    <Form43_FollowUp studentsList={studentsList} classesList={classesList} cases={cases} user={user} />
                )}
                {activeForm === "8-2" && (
                    <Form82_AbsenceFollowUp
                        studentsList={studentsList}
                        classesList={classesList}
                        cases={cases}
                        getAbsenceCount={getAbsenceCount}
                        user={user}
                    />
                )}
            </div>
        </div>
    );
}
