"use client";

import React, { useState } from "react";
import { Users, GraduationCap, UserCircle, School, Mail, Phone, BookOpen, Layers } from "lucide-react";
import { GlobalImportStudio } from "@/components/operations/GlobalImportStudio";
import Link from "next/link";
import { useParams } from "next/navigation";

const TAB_CONFIG = {
    teachers: {
        label: "المعلمين",
        icon: <GraduationCap size={16} />,
        fields: [
            { key: "full_name", label: "اسم المعلم", required: true, icon: <UserCircle size={14} /> },
            { key: "email", label: "البريد الإلكتروني", required: true, icon: <Mail size={14} /> },
            { key: "phone", label: "رقم الجوال", required: true, icon: <Phone size={14} /> },
            { key: "specialization", label: "التخصص", icon: <BookOpen size={14} /> },
        ]
    },
    students: {
        label: "الطلاب",
        icon: <Users size={16} />,
        fields: [
            { key: "full_name", label: "اسم الطالب", required: true, icon: <UserCircle size={14} /> },
            { key: "grade_level", label: "الصف الدراسي", required: true, icon: <Layers size={14} /> },
            { key: "class_name", label: "الفصل", required: true, icon: <School size={14} /> },
            { key: "parent_phone", label: "جوال ولي الأمر", required: true, icon: <Phone size={14} /> },
        ]
    },
    parents: {
        label: "أولياء الأمور",
        icon: <UserCircle size={16} />,
        fields: [
            { key: "father_name", label: "اسم ولي الأمر", required: true, icon: <UserCircle size={14} /> },
            { key: "phone", label: "رقم الجوال", required: true, icon: <Phone size={14} /> },
            { key: "email", label: "البريد الإلكتروني", icon: <Mail size={14} /> },
        ]
    }
};

type TabKey = keyof typeof TAB_CONFIG;

export default function SchoolOnboardingPage() {
    const params = useParams();
    const schoolId = params.id as string;
    const [activeTab, setActiveTab] = useState<TabKey>('teachers');
    const [notice, setNotice] = useState<string | null>(null);

    const handleImportReady = () => {
        // لا حفظ فعلي ولا ادّعاء نجاح: هذا المسار غير مفعّل بعد. الاستيراد الحقيقي عبر /platform/setup.
        setNotice('هذه العملية غير مفعّلة بعد. استخدم صفحة التهيئة الرسمية (/platform/setup) للاستيراد.');
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-6 lg:p-12" dir="rtl">
            <div className="max-w-6xl mx-auto">
                <header className="mb-10">
                    <Link href="/platform/dashboard" className="text-xs font-bold text-muted hover:text-foreground transition-colors mb-2 block">
                        ← العودة للوحة التحكم
                    </Link>
                    <h1 className="text-3xl font-black tracking-tight mb-2">تهيئة بيانات المدرسة</h1>
                    <p className="text-muted text-sm opacity-60">تأسيس البيانات: المعلمين، الطلاب، وأولياء الأمور (ID: {schoolId})</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar Tabs */}
                    <div className="lg:col-span-1 space-y-2">
                        {(Object.keys(TAB_CONFIG) as TabKey[]).map((key) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl text-sm font-bold transition-all ${activeTab === key
                                    ? 'bg-primary text-black shadow-lg shadow-primary/20 scale-105'
                                    : 'bg-white/5 hover:bg-white/10 text-muted'
                                    }`}
                            >
                                {TAB_CONFIG[key].icon}
                                {TAB_CONFIG[key].label}
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="lg:col-span-3">
                        <div key={activeTab} className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-4">
                            {notice && (
                                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 text-sm font-bold">
                                    {notice}
                                </div>
                            )}
                            <GlobalImportStudio
                                title={`استيراد ${TAB_CONFIG[activeTab].label}`}
                                description={`رفع بيانات ${TAB_CONFIG[activeTab].label} للمدرسة. تأكد من صحة الملف.`}
                                requiredFields={TAB_CONFIG[activeTab].fields}
                                onDataReady={handleImportReady}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
