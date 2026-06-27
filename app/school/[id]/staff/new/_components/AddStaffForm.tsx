'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, Check, Loader2, AlertTriangle, Info } from 'lucide-react';
import { createStaff } from '@/app/_actions/staff';
import { getRoleInfo } from '@/lib/auth/roles';
import { STAFF_ASSIGNABLE_ROLES } from '@/lib/auth/staff-roles';

interface AddStaffFormProps {
    schoolId: string;
}

const INPUT_CLASS =
    'w-full rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-primary focus:outline-none';

export function AddStaffForm({ schoolId }: AddStaffFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [form, setForm] = useState({
        fullName: '',
        email: '',
        nationalId: '',
        roles: [] as string[],
    });

    const toggleRole = (roleId: string) => {
        setForm((prev) => ({
            ...prev,
            roles: prev.roles.includes(roleId)
                ? prev.roles.filter((r) => r !== roleId)
                : [...prev.roles, roleId],
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg(null);

        if (form.roles.length === 0) {
            setError('يرجى اختيار دور واحد على الأقل.');
            return;
        }

        setLoading(true);
        try {
            const result = await createStaff({
                schoolId,
                fullName: form.fullName,
                email: form.email,
                nationalId: form.nationalId,
                roles: form.roles,
            });

            if (result.serverError) {
                // لا تُعرض رسالة الخادم الخام للمستخدم — رسالة عربية آمنة + سجلّ تقني
                console.error('[AddStaffForm] createStaff serverError:', result.serverError);
                setError('تعذّر حفظ بيانات الموظف، يرجى المحاولة لاحقاً.');
            } else if (result.validationErrors) {
                // رسائل تحقّق الحقول (Zod) آمنة وعربية — تُعرض كما هي
                const messages = Object.values(result.validationErrors).flat().join(' · ');
                setError(messages || 'تحقّق من صحة البيانات المدخلة.');
            } else {
                // رسالة صادقة بحسب المسار الفعلي للـ backend
                const outcome = result.data?.outcome;
                setSuccessMsg(
                    outcome === 'assigned'
                        ? 'تم إسناد الأدوار إلى الحساب الموجود بنجاح. جارٍ التحويل…'
                        : 'تم إنشاء دعوة الانضمام بنجاح. جارٍ التحويل…',
                );
                setTimeout(() => router.push(`/school/${schoolId}/staff`), 900);
            }
        } catch (err) {
            console.error('[AddStaffForm] unexpected error:', err);
            setError('تعذّر إكمال العملية، يرجى المحاولة لاحقاً.');
        } finally {
            setLoading(false);
        }
    };

    const isDone = successMsg !== null;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* توضيح المسار — صادق ومطابق لسلوك createStaff */}
            <div className="flex items-start gap-2.5 rounded-2xl border border-border bg-surface-soft px-4 py-3.5">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-[12px] font-medium leading-relaxed text-muted-foreground">
                    إذا كان للبريد الإلكتروني حساب موجود مسبقاً، تُسنَد الأدوار المختارة له مباشرةً. وإن لم يكن له حساب، تُنشأ{' '}
                    <span className="font-bold text-foreground">دعوة انضمام</span> لإكمال التسجيل.
                </p>
            </div>

            {/* 1) البيانات الشخصية */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-5 flex items-center gap-2 text-base font-black text-foreground">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
                        1
                    </span>
                    البيانات الشخصية
                </h2>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <Field label="الاسم الكامل">
                        <input
                            type="text"
                            required
                            className={INPUT_CLASS}
                            placeholder="مثال: محمد عبدالله"
                            value={form.fullName}
                            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                        />
                    </Field>
                    <Field label="رقم الهوية">
                        <input
                            type="text"
                            required
                            className={INPUT_CLASS}
                            placeholder="10xxxxxxxx"
                            value={form.nationalId}
                            onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
                        />
                    </Field>
                    <div className="md:col-span-2">
                        <Field label="البريد الإلكتروني">
                            <input
                                type="email"
                                required
                                className={INPUT_CLASS}
                                placeholder="email@example.com"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                            />
                        </Field>
                    </div>
                </div>
            </section>

            {/* 2) الأدوار التشغيلية — تسميات عربية رسمية فقط */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-5 flex items-center gap-2 text-base font-black text-foreground">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
                        2
                    </span>
                    الأدوار التشغيلية
                </h2>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {STAFF_ASSIGNABLE_ROLES.map((role) => {
                        const selected = form.roles.includes(role);
                        return (
                            <button
                                key={role}
                                type="button"
                                onClick={() => toggleRole(role)}
                                aria-pressed={selected}
                                className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-3 text-right text-sm transition-colors ${
                                    selected
                                        ? 'border-primary/40 bg-primary/5'
                                        : 'border-border bg-surface-soft hover:border-primary/30'
                                }`}
                            >
                                <span className="font-bold text-foreground">{getRoleInfo(role).labelAr}</span>
                                {selected ? (
                                    <Check className="h-4 w-4 shrink-0 text-primary" />
                                ) : (
                                    <span className="h-4 w-4 shrink-0 rounded-md border border-border" />
                                )}
                            </button>
                        );
                    })}
                </div>
                {form.roles.length === 0 && (
                    <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-amber-600">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        اختر دوراً واحداً على الأقل.
                    </p>
                )}
            </section>

            {/* رسائل */}
            {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                    <p className="text-sm font-bold text-foreground">{error}</p>
                </div>
            )}
            {successMsg && (
                <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                    <p className="text-sm font-bold text-emerald-700">{successMsg}</p>
                </div>
            )}

            {/* الإجراءات — داخل التدفّق، بلا شريط ثابت زجاجي */}
            <div className="flex items-center justify-end gap-3">
                <Link
                    href={`/school/${schoolId}/staff`}
                    className="rounded-xl border border-border bg-surface-soft px-5 py-2.5 text-sm font-black text-foreground transition-colors hover:bg-muted"
                >
                    إلغاء
                </Link>
                <button
                    type="submit"
                    disabled={loading || isDone}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-black text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    {loading ? 'جارٍ الحفظ…' : 'حفظ وإضافة الموظف'}
                </button>
            </div>
        </form>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-2">
            <span className="block text-sm font-bold text-foreground">{label}</span>
            {children}
        </label>
    );
}
