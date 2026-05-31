"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, AlertTriangle, Info, Send } from "lucide-react";

interface ParentNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentName: string;
    studentId: string;
    onSend: (studentId: string, content: string, urgency: "low" | "medium" | "high") => Promise<void>;
}

export function ParentNoteModal({ isOpen, onClose, studentName, studentId, onSend }: ParentNoteModalProps) {
    const [content, setContent] = useState("");
    const [urgency, setUrgency] = useState<"low" | "medium" | "high">("low");
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        if (!content.trim()) return;
        setSending(true);
        await onSend(studentId, content, urgency);
        setSending(false);
        setContent("");
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
                        dir="rtl"
                    >
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] shadow-lg shadow-[var(--accent)]/20">
                                        <Mail className="w-6 h-6 icon-morph" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white">ملاحظة لولي الأمر</h3>
                                        <p className="text-xs text-zinc-500 font-bold">الطالب: {studentName}</p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-zinc-500 transition-colors" aria-label="إغلاق النافذة">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">درجة الأهمية</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'low', label: 'عادية', color: 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20', icon: Info },
                                            { id: 'medium', label: 'هامة', color: 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20', icon: Info },
                                            { id: 'high', label: 'عاجلة', color: 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20', icon: AlertTriangle }
                                        ].map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => setUrgency(item.id as "low" | "medium" | "high")}
                                                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all ${urgency === item.id ? item.color.replace('/10', '/20') + ' border-current' : 'bg-zinc-800 text-zinc-500 border-transparent hover:border-white/5'}`}
                                            >
                                                <item.icon size={14} />
                                                <span className="text-xs font-black">{item.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">محتوى الملاحظة</label>
                                    <textarea
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        placeholder="اكتب ملاحظتك هنا ليراها ولي الأمر في حسابه..."
                                        className="w-full bg-zinc-800 border-white/5 rounded-2xl p-4 text-sm text-white focus:border-indigo-500 transition-all outline-none min-h-[150px] resize-none"
                                    />
                                </div>

                                <button
                                    onClick={handleSend}
                                    disabled={sending || !content.trim()}
                                    className="w-full bg-[var(--accent)] hover:brightness-110 disabled:opacity-50 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all shadow-lg shadow-[var(--accent)]/20 active:scale-95"
                                >
                                    {sending ? "جاري الإرسال..." : <><Send size={18} /> إرسال الملاحظة</>}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
