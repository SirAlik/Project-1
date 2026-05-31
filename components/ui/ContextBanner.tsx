"use client";

import React from "react";
import Link from "next/link";
import { Shield, RefreshCw, Building2, Layers } from "lucide-react";

interface ContextBannerProps {
    role: string;
    schoolName?: string;
    variant?: 'global' | 'school';
}

const ROLE_LABELS: Record<string, string> = {
    system_owner: "مالك النظام (System Owner)",
    school_admin: "منسق المدرسة",
    school_affairs_vp: "وكيل الشؤون المدرسية",
    academic_vp: "وكيل الشؤون التعليمية",
    student_affairs_vp: "وكيل شؤون الطلاب",
    school_librarian: "أمين مصادر التعلم",
    quality_coordinator: "منسق الجودة",
    school_principal: "مدير المدرسة",
    teacher: "معلم",
    student: "طالب",
    parent: "ولي أمر",
};

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    system_owner: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20" },
    school_admin: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20" },
    school_affairs_vp: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
    academic_vp: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
    student_affairs_vp: { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/20" },
    school_librarian: { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/20" },
    quality_coordinator: { bg: "bg-teal-500/10", text: "text-teal-400", border: "border-teal-500/20" },
    school_principal: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20" },
    default: { bg: "bg-white/5", text: "text-white/60", border: "border-white/10" },
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
    system_owner: <Shield size={20} />,
    school_admin: <Layers size={20} />,
    default: <Building2 size={20} />,
};

export function ContextBanner({ role, schoolName, variant = 'school' }: ContextBannerProps) {
    const colors = ROLE_COLORS[role] || ROLE_COLORS.default;
    const label = ROLE_LABELS[role] || role;
    const icon = ROLE_ICONS[role] || ROLE_ICONS.default;
    const scope = variant === 'global' ? "نطاق البيانات: النظام بالكامل" : `نطاق البيانات: ${schoolName || 'هذه المدرسة فقط'}`;

    return (
        <div className={`p-4 rounded-2xl ${colors.bg} border ${colors.border} flex flex-wrap items-center justify-between gap-4`}>
            <div className="flex items-center gap-3 flex-wrap">
                <span className={colors.text}>{icon}</span>
                <span className={`font-bold ${colors.text}`}>
                    أنت الآن: <span className="text-white">{label}</span>
                    {schoolName && (
                        <>
                            {" — المدرسة: "}
                            <span className="text-white">{schoolName}</span>
                        </>
                    )}
                </span>
                <span className="text-xs opacity-60 bg-white/5 px-2 py-1 rounded-full">{scope}</span>
            </div>
            <Link
                href="/portal"
                className={`flex items-center gap-2 text-sm font-bold ${colors.text} hover:text-white transition-colors`}
            >
                <RefreshCw size={14} />
                تبديل الشخصية
            </Link>
        </div>
    );
}
