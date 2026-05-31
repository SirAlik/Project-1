"use client";

import React, { useState } from "react";
import { Users, Shield, Mail, Phone, Hash } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { GlobalImportStudio, ImportField } from "@/components/admin/GlobalImportStudio";
import Link from "next/link";
import { useParams } from "next/navigation";

const STAFF_IMPORT_FIELDS: ImportField[] = [
    { key: "full_name", label: "الاسم الكامل", required: true, icon: <Users size={14} /> },
    { key: "email", label: "البريد الإلكتروني", required: true, icon: <Mail size={14} /> },
    { key: "role", label: "الدور الوظيفي", required: true, icon: <Shield size={14} /> },
    { key: "phone", label: "رقم الجوال", icon: <Phone size={14} /> },
    { key: "national_id", label: "رقم الهوية", required: true, icon: <Hash size={14} /> },
];

export default function SchoolStaffPage() {
    const params = useParams();
    const schoolId = params.id as string;
    const [view, setView] = useState<'list' | 'import'>('list');

    const handleImportReady = (data: Record<string, string>[]) => {
        console.log("Importing Data:", data);
        // Here calls server action for upsert
        alert(`جاري استيراد ${data.length} موظف... (محاكاة)`);
        setView('list');
    };

    return (
        <div className="min-h-screen bg-black text-white p-6 lg:p-12" dir="rtl">
            <div className="max-w-6xl mx-auto">
                <header className="mb-10 flex justify-between items-center">
                    <div>
                        <Link href="/admin/dashboard" className="text-xs font-bold text-muted hover:text-white transition-colors mb-2 block">
                            ← العودة للوحة التحكم
                        </Link>
                        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                            <Shield className="text-primary" />
                            إدارة طاقم المدرسة
                        </h1>
                        <p className="text-muted text-sm opacity-60">تخصيص الصلاحيات وإدارة المدراء والموظفين (ID: {schoolId})</p>
                    </div>
                    <div className="flex bg-white/5 p-1 rounded-xl">
                        <button
                            onClick={() => setView('list')}
                            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${view === 'list' ? 'bg-primary text-black shadow-lg' : 'hover:bg-white/10'}`}
                        >
                            قائمة الموظفين
                        </button>
                        <button
                            onClick={() => setView('import')}
                            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${view === 'import' ? 'bg-primary text-black shadow-lg' : 'hover:bg-white/10'}`}
                        >
                            استيراد جماعي
                        </button>
                    </div>
                </header>

                {view === 'list' ? (
                    <Card className="min-h-[400px]">
                        <div className="p-8 text-center opacity-40">
                            <Users size={48} className="mx-auto mb-4" />
                            <p className="text-sm font-bold">لا يوجد موظفين مسجلين حالياً</p>
                            <button onClick={() => setView('import')} className="mt-4 text-primary underline text-xs">إضافة موظفين جدد</button>
                        </div>
                    </Card>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <GlobalImportStudio
                            title="استيراد الهيكل الإداري"
                            description="قم برفع ملف CSV يحتوي على بيانات المدير، الوكلاء، والإداريين."
                            requiredFields={STAFF_IMPORT_FIELDS}
                            onDataReady={handleImportReady}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
