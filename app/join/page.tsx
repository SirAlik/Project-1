'use client';

import React, { Suspense, useState, useEffect, startTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { validateInvite, joinSchool } from '@/app/_actions/invite';
import { Loader2, AlertCircle, CheckCircle, ArrowRight, Key } from 'lucide-react';
import { motion } from 'framer-motion';

function JoinPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [state, setState] = useState<'validating' | 'valid' | 'invalid' | 'success'>('validating');
    interface InviteDisplay { name: string; phone: string; role: string; schoolName: string; }
    const [inviteData, setInviteData] = useState<InviteDisplay | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    // Form State
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!token) {
            startTransition(() => {
                setState('invalid');
                setErrorMsg('رابط الدعوة مفقود');
            });
            return;
        }

        startTransition(async () => {
            try {
                const res = await validateInvite(token);
                if (res.valid && res.invite) {
                    setInviteData({
                        name: res.invite.full_name,
                        phone: res.invite.mobile_number,
                        role: res.invite.target_role,
                        schoolName: res.invite.school_name || 'المدرسة',
                    });
                    setState('valid');
                } else {
                    setState('invalid');
                    if (res.reason === 'expired') setErrorMsg('عذراً، انتهت صلاحية رابط الدعوة.');
                    else if (res.reason === 'already_used') setErrorMsg('عذراً، تم استخدام رابط الدعوة مسبقاً.');
                    else setErrorMsg('رابط الدعوة غير صالح.');
                }
            } catch {
                setState('invalid');
                setErrorMsg('حدث خطأ أثناء التحقق من الدعوة.');
            }
        });
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await joinSchool({ token: token!, password });
            if (res.success) {
                setState('success');
                setTimeout(() => {
                    router.push('/login?email=' + res.email);
                }, 3000);
            } else {
                alert(res.error || 'حدث خطأ غير متوقع');
            }
        } catch (e) {
            console.error(e);
            alert('فشل في إكمال التسجيل');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (state === 'validating') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-primary" size={32} />
                    <p className="text-muted text-sm">جاري التحقق من الدعوة...</p>
                </div>
            </div>
        );
    }

    if (state === 'invalid') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
                <div className="max-w-md w-full bg-zinc-900 border border-red-500/20 rounded-2xl p-8 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto text-red-500">
                        <AlertCircle size={32} />
                    </div>
                    <h1 className="text-xl font-bold">رابط الدعوة غير صالح</h1>
                    <p className="text-muted-foreground text-sm leading-relaxed">{errorMsg}</p>
                    <button onClick={() => router.push('/login')} className="text-primary text-sm hover:underline">
                        العودة لصفحة الدخول
                    </button>
                </div>
            </div>
        );
    }

    if (state === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
                <div className="max-w-md w-full bg-zinc-900 border border-emerald-500/20 rounded-2xl p-8 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-500">
                        <CheckCircle size={32} />
                    </div>
                    <h1 className="text-xl font-bold">تم تفعيل الحساب بنجاح!</h1>
                    <p className="text-muted-foreground text-sm">جاري تحويلك لصفحة الدخول...</p>
                </div>
            </div>
        );
    }

    if (!inviteData) return null;

    return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white p-4" dir="rtl">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl"
            >
                {/* Header Profile Identity */}
                <div className="bg-zinc-800/50 p-6 border-b border-zinc-800 text-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 mx-auto mb-4 flex items-center justify-center text-2xl font-bold shadow-lg shadow-indigo-500/20">
                        {inviteData.name[0]}
                    </div>
                    <h2 className="text-xl font-bold mb-1">مرحباً، {inviteData.name}</h2>
                    <p className="text-sm text-muted-foreground">
                        أنت مدعو للانضمام كـ <span className="text-white font-medium">{inviteData.role}</span>
                        <br />
                        في <span className="text-primary">{inviteData.schoolName}</span>
                    </p>
                </div>

                {/* Password Form */}
                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Key size={14} />
                                إعداد كلمة المرور
                            </label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors text-center text-lg tracking-widest placeholder:tracking-normal"
                                placeholder="••••••••"
                            />
                            <p className="text-[10px] text-muted-foreground text-center">
                                يجب أن تحتوي على حرف كبير ورقم واحد على الأقل
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || password.length < 6}
                            className="w-full bg-primary text-black font-bold py-4 rounded-xl hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <>
                                تفعيل الحساب
                                <ArrowRight size={18} className="rotate-180" />
                            </>}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}

// Wrap in Suspense for useSearchParams compatibility with static export
export default function JoinPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-sm text-white/60">جاري التحميل...</span>
                </div>
            </div>
        }>
            <JoinPageContent />
        </Suspense>
    );
}
