"use client";
import React from "react";
import { LogOut, X } from "lucide-react";

interface StudentExitModalProps {
    studentName: string;
    studentId: string;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (guardian: string, relation: string, reason: string) => void;
}

export function StudentExitModal({ studentName, studentId, isOpen, onClose, onConfirm }: StudentExitModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[3rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-indigo-500 text-white rounded-3xl">
                            <LogOut className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white">تسجيل خروج طالب</h3>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{studentName} ({studentId})</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors" aria-label="إغلاق النافذة">
                        <X size={20} className="text-zinc-500 hover:text-white" />
                    </button>
                </div>

                <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    onConfirm(
                        formData.get('guardian') as string,
                        formData.get('relation') as string,
                        formData.get('reason') as string
                    );
                }} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase px-2">اسم ولي الأمر المُستلم</label>
                        <input
                            name="guardian"
                            required
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            placeholder="Guardian Name"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase px-2">الصلة</label>
                            <input
                                name="relation"
                                required
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                placeholder="Relationship"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase px-2">السبب</label>
                            <input
                                name="reason"
                                required
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                placeholder="Reason"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-zinc-800 text-white py-4 rounded-2xl font-bold text-sm hover:bg-zinc-700 transition-all"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            className="flex-1 bg-indigo-500 text-white py-4 rounded-2xl font-bold text-sm hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20"
                        >
                            تأكيد الخروج
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
