'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FlaskConical, ShieldAlert, Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { getRoleInfo, type UserRole } from '@/lib/auth/roles';
import { QA_ASSIGNABLE_ROLES } from '@/lib/auth/qa-test-roles';
import { assignTestRolesToSelf, removeTestRolesFromSelf } from '@/app/_actions/qa-roles';

interface QaRoleToolProps {
    schoolId: string;
    schoolName: string;
    userName: string;
    userEmail: string;
    /** أدوار المستخدم الحالي (نفسه) في هذه المدرسة — مفاتيح داخلية، تُعرض بالعربية عبر getRoleInfo. */
    currentRoles: string[];
}

type Feedback = { kind: 'success' | 'error'; text: string } | null;

export function QaRoleTool({ schoolId, schoolName, userName, userEmail, currentRoles }: QaRoleToolProps) {
    const router = useRouter();
    const [selected, setSelected] = useState<Set<UserRole>>(new Set());
    const [feedback, setFeedback] = useState<Feedback>(null);
    const [isPending, startTransition] = useTransition();

    const assignedSet = useMemo(() => new Set(currentRoles), [currentRoles]);

    const toggle = (role: UserRole) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(role)) next.delete(role);
            else next.add(role);
            return next;
        });
    };

    const runAssign = () => {
        const roles = [...selected];
        if (roles.length === 0) {
            setFeedback({ kind: 'error', text: 'اختر دوراً واحداً على الأقل.' });
            return;
        }
        setFeedback(null);
        startTransition(async () => {
            const res = await assignTestRolesToSelf({ schoolId, roles });
            setFeedback({ kind: res.success ? 'success' : 'error', text: res.message });
            if (res.success) {
                setSelected(new Set());
                router.refresh();
            }
        });
    };

    const runRemove = () => {
        // إزالة المختار من الأدوار المُسندة حالياً فقط
        const roles = [...selected].filter((r) => assignedSet.has(r));
        if (roles.length === 0) {
            setFeedback({ kind: 'error', text: 'اختر أدواراً مُسندة لإزالتها.' });
            return;
        }
        const labels = roles.map((r) => getRoleInfo(r).labelAr).join('، ');
        if (!window.confirm(`تأكيد إزالة أدوار الاختبار التالية من حسابك: ${labels}؟`)) return;
        setFeedback(null);
        startTransition(async () => {
            const res = await removeTestRolesFromSelf({ schoolId, roles });
            setFeedback({ kind: res.success ? 'success' : 'error', text: res.message });
            if (res.success) {
                setSelected(new Set());
                router.refresh();
            }
        });
    };

    const selectedAssignedCount = [...selected].filter((r) => assignedSet.has(r)).length;

    return (
        <section className="rounded-2xl border border-primary/30 bg-card shadow-sm">
            {/* الترويسة */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <FlaskConical className="h-5 w-5" />
                    </span>
                    <div>
                        <h2 className="text-base font-black text-foreground">أدوات اختبار مالك النظام</h2>
                        <p className="text-[11px] font-bold text-muted-foreground">
                            تتيح لك هذه الأداة إضافة أدوار مدرسية لحسابك الحالي لاختبار الصفحات قبل الإطلاق.
                        </p>
                    </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-black text-primary">
                    مالك النظام فقط
                </span>
            </div>

            <div className="space-y-5 p-5">
                {/* السياق الحالي */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <InfoRow label="المدرسة الحالية" value={schoolName} />
                    <InfoRow label="الحساب" value={userName ? `${userName} — ${userEmail}` : userEmail || '—'} />
                </div>

                {/* الأدوار الحالية لهذا الحساب في المدرسة */}
                <div>
                    <p className="mb-2 text-xs font-black text-foreground">أدوارك الحالية في هذه المدرسة</p>
                    {currentRoles.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                            {currentRoles.map((r) => (
                                <span
                                    key={r}
                                    className="rounded-full border border-border bg-surface-soft px-2.5 py-1 text-[11px] font-bold text-foreground"
                                >
                                    {roleLabel(r)}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs font-medium text-muted-foreground">لا توجد أدوار مدرسية مُسندة لحسابك بعد.</p>
                    )}
                </div>

                {/* اختيار الأدوار */}
                <div>
                    <p className="mb-2 text-xs font-black text-foreground">الأدوار القابلة للإسناد</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {QA_ASSIGNABLE_ROLES.map((role) => {
                            const isAssigned = assignedSet.has(role);
                            const isChecked = selected.has(role);
                            return (
                                <label
                                    key={role}
                                    className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                                        isChecked
                                            ? 'border-primary/40 bg-primary/5'
                                            : 'border-border bg-surface-soft hover:border-primary/30'
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => toggle(role)}
                                            className="h-4 w-4 accent-[var(--primary)]"
                                        />
                                        <span className="font-bold text-foreground">{getRoleInfo(role).labelAr}</span>
                                    </span>
                                    {isAssigned && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-600">
                                            <Check className="h-3 w-3" />
                                            مُسند
                                        </span>
                                    )}
                                </label>
                            );
                        })}
                    </div>
                </div>

                {/* تنبيه الأدوار المحدودة */}
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] font-bold leading-relaxed text-foreground">
                    دورا «الطالب» و«ولي الأمر» مستبعدان من الإسناد الآلي لأنهما يتطلبان سجلات طالب/ولي أمر مرتبطة لا تُختبَر بالحساب وحده.
                </p>

                {/* الإجراءات */}
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={runAssign}
                        disabled={isPending || selected.size === 0}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        إضافة أدوار الاختبار لي
                    </button>
                    <button
                        type="button"
                        onClick={runRemove}
                        disabled={isPending || selectedAssignedCount === 0}
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-soft px-5 py-2.5 text-sm font-black text-foreground transition-colors hover:border-rose-300 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Trash2 className="h-4 w-4" />
                        إزالة المحدد
                    </button>
                </div>

                {/* النتيجة */}
                {feedback && (
                    <div
                        className={`rounded-xl border px-3 py-2.5 text-sm font-bold ${
                            feedback.kind === 'success'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-rose-200 bg-rose-50 text-rose-700'
                        }`}
                    >
                        {feedback.text}
                    </div>
                )}

                {/* تحذير */}
                <div className="flex items-start gap-2 rounded-xl border border-border bg-surface-soft px-3 py-2.5">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <p className="text-[11px] font-bold leading-relaxed text-muted-foreground">
                        هذه الأداة مخصصة لمالك النظام فقط ومرحلة ما قبل الإطلاق. الإسناد يطال حسابك أنت فقط، وكل عملية تُسجَّل في سجل التدقيق.
                        <span className="mt-1 block text-muted-foreground/70">إعدادات الحساب — قريباً.</span>
                    </p>
                </div>
            </div>
        </section>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-border bg-surface-soft px-3 py-2.5">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-0.5 truncate text-sm font-bold text-foreground">{value}</p>
        </div>
    );
}

// تسمية عربية آمنة (getRoleInfo يُعيد «غير معروف» لأي مفتاح غير قياسي — فلا يظهر مفتاح إنجليزي خام أبداً)
function roleLabel(roleKey: string): string {
    return getRoleInfo(roleKey as UserRole).labelAr;
}
