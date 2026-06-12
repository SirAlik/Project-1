'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, Camera, X, Zap, Sparkles } from 'lucide-react';

export const ARScanner = ({ onScan }: { onScan: (hash: string) => void }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [hasScanned, setHasScanned] = useState(false);

    const simulateScan = () => {
        setIsScanning(true);
        setTimeout(() => {
            setIsScanning(false);
            setHasScanned(true);
            onScan('MOCK_GLYPH_HASH_001');
            setTimeout(() => setHasScanned(false), 3000);
        }, 2500);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsScanning(true)}
                className="glass-panel p-4 w-full rounded-2xl flex items-center justify-between group overflow-hidden"
            >
                <div className="relative z-10 flex items-center gap-4">
                    <div className="p-2 bg-primary/20 rounded-xl">
                        <QrCode size={24} className="text-primary" />
                    </div>
                    <div className="text-right">
                        <h3 className="text-sm font-bold">بصمة سيبرانية قريبة</h3>
                        <p className="text-[10px] text-muted">امسح الكود للحصول على الغنائم</p>
                    </div>
                </div>
                <div className="relative z-10 p-2 bg-white/5 rounded-full group-hover:scale-110 transition-transform">
                    <Camera size={18} className="text-muted group-hover:text-primary transition-colors" />
                </div>
                <div className="absolute inset-0 bg-primary/5 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
            </button>

            {/* Full screen Scanner UI */}
            <AnimatePresence>
                {isScanning && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black bg-opacity-90 flex flex-col items-center justify-center p-6"
                    >
                        {/* Viewfinder */}
                        <div className="relative w-full aspect-square max-w-[300px] border-2 border-primary/20 rounded-3xl overflow-hidden">
                            <div className="absolute inset-0 flex items-center justify-center opacity-20">
                                <QrCode size={200} className="text-primary" />
                            </div>

                            {/* Scan Line */}
                            <motion.div
                                animate={{ top: ['0%', '100%', '0%'] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                className="absolute left-0 right-0 h-1 bg-primary shadow-[0_0_15px_var(--primary)] z-10"
                            />

                            {/* Corners */}
                            <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                            <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                        </div>

                        <div className="mt-8 text-center space-y-4">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-xl font-bold tracking-widest text-primary animate-pulse">يتم المسح...</h2>
                                <p className="text-xs text-muted">وجه الكاميرا نحو الكود المدرسي</p>
                            </div>

                            {/* Simulation Trigger (Since we don't have real camera access here) */}
                            <button
                                onClick={simulateScan}
                                className="btn-primary flex items-center gap-2 mx-auto"
                            >
                                <Zap size={16} /> محاكاة المسح
                            </button>
                        </div>

                        <button
                            onClick={() => setIsScanning(false)}
                            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-md transition-colors z-50"
                            aria-label="Close AR Scanner"
                        >
                            <X size={24} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Success Notification */}
            <AnimatePresence>
                {hasScanned && (
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[210] glass-panel p-4 px-6 rounded-2xl border-primary shadow-[0_0_30px_rgba(62,199,211,0.4)] flex items-center gap-4 whitespace-nowrap"
                    >
                        <Sparkles className="text-primary" />
                        <div className="text-sm">
                            <span className="font-bold text-primary">+150 COINS</span>
                            <p className="text-[10px] text-muted">تم اكتشاف &quot;غنائم المختبر&quot;</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
