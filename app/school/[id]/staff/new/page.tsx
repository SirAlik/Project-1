'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { UserPlus, Shield, Check, Loader2, AlertTriangle, ArrowRight } from 'lucide-react';
import { createStaff } from '@/app/_actions/staff';
import Link from 'next/link';

const ROLES = [
    { id: 'school_admin', label: 'منسق المدرسة', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    { id: 'school_principal', label: 'مدير المدرسة', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
    { id: 'school_affairs_vp', label: 'وكيل الشؤون المدرسية', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { id: 'student_affairs_vp', label: 'وكيل شؤون الطلاب', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    { id: 'student_counselor', label: 'الموجه الطلابي', color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
    { id: 'teacher', label: 'معلم', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { id: 'school_secretary', label: 'سكرتير', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    { id: 'health_coordinator', label: 'الموجه الصحي', color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
    { id: 'lab_technician', label: 'محضر المختبر', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    { id: 'school_librarian', label: 'أمين مصادر التعلم', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
    { id: 'activity_leader', label: 'رائد النشاط', color: 'text-lime-400', bg: 'bg-lime-500/10', border: 'border-lime-500/20' },
];

export default function AddStaffPage() {
    const params = useParams();
    const router = useRouter();
    const schoolId = params.id as string;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        nationalId: '',
        roles: [] as string[],
    });

    const toggleRole = (roleId: string) => {
        setFormData((prev) => ({
            ...prev,
            roles: prev.roles.includes(roleId) ? prev.roles.filter((r) => r !== roleId) : [...prev.roles, roleId],
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        setLoading(true);

        if (formData.roles.length === 0) {
            setError('يرجى اختيار دور واحد على الأقل');
            setLoading(false);
            return;
        }

        const payload = {
            schoolId,
            fullName: formData.fullName,
            email: formData.email,
            nationalId: formData.nationalId,
            roles: formData.roles,
        };

        console.log('[staff/new] Submitting createStaff:', {
            schoolId,
            fullName: formData.fullName,
            email: formData.email,
            nationalId: '***masked***',
            roles: formData.roles,
        });

        try {
            const result = await createStaff(payload);
            console.log('[staff/new] createStaff result:', result);

            if (result.serverError) {
                if (result.serverError.includes('سياق مدرسة')) {
                    setError('❤️ لا يمكن حفظ الموظف: اذهب للبوابة (/portal) وفعّل دور منسق المدرسة لنفس المدرسة ثم أعد المحاولة.');
                } else if (result.serverError.includes('لا يطابق') || result.serverError.includes('مدرسة أخرى')) {
                    setError('❤️ سياق المدرسة لا يطابق المدرسة المختارة في دورك. فعّل الدور الصحيح من البوابة.');
                } else {
                    setError(`❌ خطأ من السيرفر: ${result.serverError}`);
                }
            } else if (result.validationErrors) {
                const messages = Object.entries(result.validationErrors)
                    .map(([field, errors]) => `${field}: ${(errors as string[]).join(', ')}`)
                    .join(' | ');
                setError(`⚠️ خطأ في البيانات: ${messages}`);
            } else {
                console.log('[staff/new] Staff created successfully:', result.data);
                setSuccess(true);
                setTimeout(() => router.push(`/school/${schoolId}/staff`), 800);
            }
        } catch (err) {
            console.error('[staff/new] Unexpected error:', err);
            setError(`❌ خطأ غير متوقع: ${err instanceof Error ? err.message : 'فشل الاتصال'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white" dir="rtl">
            {/* الصفحة قابلة للتمرير + padding مريح */}
            <div className="p-6 lg:p-12 flex justify-center">
                <div className="max-w-4xl w-full">
                    {/* Header */}
                    <div className="mb-8 flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
                                <UserPlus className="text-[var(--primary)]" />
                                إضافة موظف جديد
                            </h1>
                            <p className="opacity-70">أدخل بيانات الموظف وحدد الصلاحيات المطلوبة</p>
                        </div>
                        <Link href={`/school/${schoolId}/staff`} className="p-3 hover:bg-white/10 rounded-xl transition-colors">
                            <ArrowRight />
                        </Link>
                    </div>

                    {/* ✅ مهم: نعطي الفورم مساحة سفلية عشان الـ sticky bar ما يغطي المحتوى */}
                    <form onSubmit={handleSubmit} className="space-y-8 pb-32">
                        {/* Personal Info */}
                        <div className="p-8 rounded-[2rem] border border-white/10 bg-white/[0.03]">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm">1</span>
                                البيانات الشخصية
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold opacity-80">الاسم الكامل</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 focus:border-[var(--primary)] focus:outline-none transition-colors"
                                        placeholder="مثال: محمد عبدالله"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold opacity-80">رقم الهوية</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 focus:border-[var(--primary)] focus:outline-none transition-colors"
                                        placeholder="10xxxxxxxx"
                                        value={formData.nationalId}
                                        onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                                    />
                                </div>

                                <div className="col-span-full space-y-2">
                                    <label className="text-sm font-bold opacity-80">البريد الإلكتروني</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 focus:border-[var(--primary)] focus:outline-none transition-colors"
                                        placeholder="email@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Roles */}
                        <div className="p-8 rounded-[2rem] border border-white/10 bg-white/[0.03]">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm">2</span>
                                الصلاحيات والأدوار
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {ROLES.map((role) => {
                                    const isSelected = formData.roles.includes(role.id);
                                    return (
                                        <button
                                            key={role.id}
                                            type="button"
                                            onClick={() => toggleRole(role.id)}
                                            className={`text-right cursor-pointer relative p-4 rounded-xl border transition-all duration-200 w-full
                        ${isSelected ? `${role.bg} ${role.border} ring-1 ring-[var(--primary)]` : 'bg-white/5 border-white/10 hover:bg-white/10'}
                      `}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <Shield size={18} className={isSelected ? role.color : 'opacity-40'} />
                                                {isSelected && <Check size={18} className="text-[var(--primary)]" />}
                                            </div>
                                            <p className={`text-sm font-bold ${isSelected ? 'text-white' : 'opacity-70'}`}>{role.label}</p>
                                        </button>
                                    );
                                })}
                            </div>

                            {formData.roles.length === 0 && (
                                <p className="text-sm text-red-400 mt-4 flex items-center gap-2">
                                    <AlertTriangle size={14} />
                                    يرجى اختيار دور واحد على الأقل
                                </p>
                            )}
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 flex items-start gap-3">
                                <AlertTriangle size={20} className="mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-bold text-sm">{error}</p>
                                    <p className="text-xs opacity-80 mt-1">إذا استمرت المشكلة: افتح Console وشوف [safe-action] أو [staff/new]</p>
                                </div>
                            </div>
                        )}

                        {/* Success */}
                        {success && (
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-3">
                                <Check size={20} />
                                <p className="font-bold text-sm">✅ تمت إضافة الموظف بنجاح! جاري التحويل...</p>
                            </div>
                        )}
                    </form>
                </div>
            </div>

            {/* ✅ زر حفظ ثابت بأسفل الشاشة (الحل النهائي لمشكلة "ما فيه زر") */}
            <div className="fixed bottom-0 left-0 right-0 z-[60] border-t border-white/10 bg-black/70 backdrop-blur-xl">
                <div className="max-w-4xl mx-auto p-4">
                    <button
                        type="submit"
                        form="__staff_form__"
                        onClick={() => {
                            // نخلي الفورم ينفذ submit رسميًا
                            const form = document.querySelector('form');
                            if (form) form.requestSubmit();
                        }}
                        disabled={loading || success}
                        className="w-full py-4 bg-[var(--primary)] text-black font-black text-lg rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <UserPlus />}
                        {loading ? 'جاري الحفظ...' : success ? 'تمت الإضافة ✓' : 'حفظ وإضافة الموظف'}
                    </button>
                </div>
            </div>
        </div>
    );
}