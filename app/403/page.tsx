'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ArrowRight, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AccessDeniedPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Animated background grid */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 opacity-10 bg-grid-pattern" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="relative z-10 max-w-2xl w-full"
            >
                {/* Glass panel */}
                <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-xl">
                    {/* Icon */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="flex justify-center mb-8"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-rose-500/20 blur-3xl rounded-full" />
                            <div className="relative w-24 h-24 rounded-full bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center">
                                <ShieldAlert size={48} className="text-rose-400" />
                            </div>
                        </div>
                    </motion.div>

                    {/* Title */}
                    <motion.h1
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-4xl font-black text-center mb-4 bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent"
                    >
                        403 - وصول محظور
                    </motion.h1>

                    {/* Description */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-center text-muted mb-8 text-lg"
                    >
                        عذراً، ليس لديك صلاحية الوصول إلى هذه الصفحة.
                        <br />
                        <span className="text-sm">يرجى التواصل مع المسؤول إذا كنت تعتقد أن هذا خطأ.</span>
                    </motion.p>

                    {/* Error code */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mb-8 p-4 bg-slate-100 rounded-xl border border-slate-200"
                    >
                        <div className="flex items-center justify-between text-slate-700 text-sm">
                            <span className="text-muted">رمز الخطأ:</span>
                            <span className="font-mono text-rose-400">ACCESS_DENIED</span>
                        </div>
                    </motion.div>

                    {/* Action buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="flex flex-col sm:flex-row gap-4 justify-center"
                    >
                        <button
                            onClick={() => router.back()}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-sm font-bold transition-all group text-slate-700"
                        >
                            <ArrowRight size={18} className="group-hover:-translate-x-1 transition-transform rotate-180" />
                            العودة للخلف
                        </button>

                        <button
                            onClick={() => router.push('/')}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-black rounded-xl text-sm font-bold transition-all group shadow-lg shadow-primary/20"
                        >
                            <Home size={18} />
                            الصفحة الرئيسية
                            <ArrowRight size={18} className="group-hover:translate-x-[-4px] transition-transform" />
                        </button>
                    </motion.div>
                </div>

                {/* Footer hint */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="text-center text-xs text-muted mt-6"
                >
                    تم تسجيل محاولة الوصول هذه لأغراض الأمان
                </motion.p>
            </motion.div>
        </div>
    );
}
