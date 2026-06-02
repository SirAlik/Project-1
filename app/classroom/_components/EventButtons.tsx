import React from "react";
import { EventType } from "@/lib/types/classroom";

interface Props {
    onAdd: (type: EventType) => void;
    onOpenReferral: () => void;
    onOpenExcuse: () => void;
    onOpenBadges: () => void;
    onOpenParentNote: () => void;
    subject: string;
}

export function EventButtons({ onAdd, onOpenReferral, onOpenExcuse, onOpenBadges, onOpenParentNote, subject }: Props) {
    return (
        <div className="space-y-6">
            {/* Attendance & Movement - PRESERVED */}
            <div className="rounded-2xl border border-stone-200 bg-white/5 p-6 backdrop-blur-sm shadow-lg">
                <h3 className="text-sm font-semibold text-stone-600 mb-4 border-b border-stone-200 pb-2">
                    🚀 الحضور والحركة
                </h3>
                <div className="flex flex-wrap gap-2">
                    <Btn onClick={() => onAdd("غياب")} variant="danger">⛔ غياب</Btn>
                    <Btn onClick={() => onAdd("تأخر عن دخول الحصة")} variant="warning">⏰ تأخر</Btn>
                    <Btn onClick={onOpenExcuse} variant="neutral">📝 استئذان</Btn>
                    <Btn onClick={() => onAdd("دورة المياه - خرج")}>🏃 خرج دورة مياه</Btn>
                    <Btn onClick={() => onAdd("دورة المياه - عاد")}>↩️ عاد</Btn>
                </div>
            </div>

            {/* Card A: التحفيز والإيجابيات 🌟 (Cyan/Lavender) */}
            <div className="rounded-3xl border border-[var(--primary)]/30 bg-white/80 p-6 backdrop-blur-xl shadow-[0_8px_32px_rgba(62,199,211,0.1)] relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-[var(--primary)]/10 blur-3xl rounded-full" />
                <h3 className="text-sm font-black text-[var(--primary)] mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_8px_rgba(62,199,211,0.8)]" />
                    التحفيز والإيجابيات 🌟
                </h3>
                <div className="flex flex-wrap gap-2">
                    <Btn onClick={() => onAdd("شارك اليوم")} variant="success">🌟 شارك اليوم</Btn>
                    <Btn onClick={() => onAdd("تفكير إبداعي")} variant="accent">💡 تفكير إبداعي</Btn>
                    <Btn onClick={() => onAdd("مبادرة/قيادة")} variant="accent">👑 مبادرة/قيادة</Btn>
                    <Btn onClick={() => onAdd("التزام وانضباط")} variant="success">🛡️ التزام وانضباط</Btn>
                    <Btn onClick={() => onAdd("تميز ملحوظ")} variant="accent">🏆 تميز ملحوظ</Btn>
                </div>
            </div>

            {/* Card B: المخالفات والتنبيهات ⛔ (Red/Orange) */}
            <div className="rounded-3xl border border-[var(--danger)]/30 bg-white/80 p-6 backdrop-blur-xl shadow-[0_8px_32px_rgba(239,68,68,0.1)] relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-[var(--danger)]/10 blur-3xl rounded-full" />
                <h3 className="text-sm font-black text-[var(--danger)] mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--danger)] shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                    المخالفات والتنبيهات ⛔
                </h3>
                <div className="flex flex-wrap gap-2">
                    <Btn onClick={() => onAdd("مقاطعة")} variant="warning">✋ مقاطعة</Btn>
                    <Btn onClick={() => onAdd("حديث جانبي")} variant="warning">🗣️ حديث جانبي</Btn>
                    <Btn onClick={() => onAdd("عدم إحضار واجب")} variant="danger">📚 لا يوجد واجب</Btn>
                    <Btn onClick={() => onAdd("عدم إحضار الأدوات")} variant="danger">🖊️ لا يوجد أدوات</Btn>
                    <Btn onClick={() => onAdd("نوم في الحصة")} variant="danger">😴 نوم في الحصة</Btn>
                    <Btn onClick={() => onAdd("عرقلة سير الحصة")} variant="danger">🚧 عرقلة سير الحصة</Btn>

                    {subject === "إسلامية" && (
                        <Btn onClick={() => onAdd("لم يسمّع القرآن")} variant="danger">📖 لم يسمّع</Btn>
                    )}
                </div>
            </div>

            {/* Card C: التقييم والملاحظات 💌 (Cyan/Lavender) */}
            <div className="rounded-3xl border border-[var(--accent)]/30 bg-white/80 p-6 backdrop-blur-xl shadow-[0_8px_32px_rgba(181,138,246,0.1)] relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-[var(--accent)]/10 blur-3xl rounded-full" />
                <h3 className="text-sm font-black text-[var(--accent)] mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_rgba(181,138,246,0.8)]" />
                    التقييم والملاحظات 💌
                </h3>
                <div className="flex flex-wrap gap-2">
                    <Btn onClick={onOpenBadges} variant="success">🏅 منح وسام استحقاق</Btn>
                    <Btn onClick={onOpenParentNote} variant="neutral">📧 ملاحظة لولي الأمر</Btn>
                </div>

                <div className="mt-6 pt-4 border-t border-stone-200">
                    <button
                        onClick={onOpenReferral}
                        className="w-full rounded-xl border border-[var(--danger)]/20 bg-[var(--danger)]/10 px-4 py-3 text-xs font-bold text-[var(--danger)] hover:bg-[var(--danger)]/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        🚨 تحويل رسمي إلى الوكيل
                    </button>
                </div>
            </div>
        </div>
    );
}

function Btn({
    children,
    onClick,
    variant = "neutral",
}: {
    children: React.ReactNode;
    onClick: () => void;
    variant?: "neutral" | "success" | "danger" | "warning" | "accent";
}) {
    const base = "rounded-xl border px-3 py-2.5 text-[11px] font-black transition-all active:scale-90 shadow-sm whitespace-nowrap";

    const styles = {
        neutral: "border-stone-300 bg-stone-100/80 text-stone-600 hover:bg-stone-300 hover:text-foreground",
        success: "border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/30 hover:shadow-[0_0_15px_rgba(62,199,211,0.2)]",
        accent: "border-[var(--accent)]/30 bg-[var(--accent)]/5 text-[var(--accent)] hover:bg-[var(--accent)]/20 hover:border-[var(--accent)]/50 hover:shadow-[0_0_15px_rgba(181,138,246,0.2)]",
        danger: "border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]",
        warning: "border-[var(--warning)]/30 bg-[var(--warning)]/10 text-[var(--warning)] hover:bg-[var(--warning)]/30",
    };

    return (
        <button onClick={onClick} className={`${base} ${styles[variant]}`}>
            {children}
        </button>
    );
}
