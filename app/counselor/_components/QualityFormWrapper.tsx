import React from "react";
import Image from "next/image";
import { Download } from "lucide-react";
import { exportToOfficialPDF } from "@/lib/utils/pdfExport";

interface QualityFormWrapperProps {
    children: React.ReactNode;
    id: string;
    title: string;
    code: string;
    fileName: string;
}

export function QualityFormWrapper({ children, id, title, code, fileName }: QualityFormWrapperProps) {
    return (
        <div className="glass-panel p-6 md:p-10 rounded-[2.5rem] border border-stone-200 shadow-2xl relative overflow-hidden">
            {/* Decorative official elements */}
            <div className="absolute top-0 right-0 p-6 text-[10px] text-stone-500 font-black tracking-[0.3em] hidden md:block uppercase opacity-50">
                {code}
            </div>

            <header className="flex flex-col md:flex-row items-center justify-between mb-8 border-b border-stone-200 pb-8 gap-4">
                <div className="text-center md:text-right">
                    <h2 className="text-xl font-black text-foreground mb-1 italic tracking-tighter">مدارس الفلاح الأهلية</h2>
                    <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Al-Falah Private Schools</p>
                </div>

                <div className="text-center">
                    <div className="w-20 h-20 mb-4 mx-auto relative group">
                        <Image
                            src="/school_official_logo.png"
                            alt="Al-Falah Schools Logo"
                            width={80}
                            height={80}
                            className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(124,58,237,0.3)] group-hover:scale-110 transition-transform duration-500"
                        />
                    </div>
                    <h1 className="text-xs font-black text-purple-400 bg-purple-500/10 px-8 py-2 rounded-full border border-purple-500/20 shadow-inner tracking-widest uppercase">
                        {title}
                    </h1>
                </div>

                <div className="text-center md:text-left">
                    <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1">QMS Standard</p>
                    <p className="text-[10px] text-purple-500 font-bold">{code}</p>
                </div>
            </header>

            <div id={id} className="quality-form-content relative z-10">
                {children}
            </div>

            <footer className="mt-10 pt-6 border-t border-stone-200 flex justify-between items-center bg-white/5 -mx-10 -mb-10 p-8">
                <div className="text-[10px] text-stone-500 font-black uppercase tracking-widest">
                    Generated via Antigravity School OS
                </div>
                <button
                    onClick={() => exportToOfficialPDF(id, fileName, code)}
                    className="flex items-center gap-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:scale-105 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-purple-600/20 active:scale-95"
                >
                    <Download className="w-4 h-4" /> تصدير PDF رسمي
                </button>
            </footer>
        </div>
    );
}

