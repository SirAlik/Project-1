import React from "react";
import { StudentOption } from "@/lib/types/classroom";

interface Props {
    students: StudentOption[];
    stars: string[]; // List of names currently selected
    onToggle: (name: string) => void;
    onSave: () => void;
    saving: boolean;
}

export function StarSelector({ students, stars, onToggle, onSave, saving }: Props) {
    // We show buttons for all students to pick stars
    // In a real huge class, maybe searchable. Assuming reasonable class size < 40.

    return (
        <div className="rounded-2xl border border-[hsla(var(--gold),.20)] bg-[hsla(var(--gold),.05)] p-6 backdrop-blur-sm shadow-lg">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[hsl(var(--gold))] flex items-center gap-2">
                    ⭐ نجوم الحصة
                </h2>
                <span className="text-xs text-[hsla(var(--gold),.70)] bg-[hsla(var(--gold),.10)] px-2 py-1 rounded-full">
                    تم اختيار {stars.length} / 3
                </span>
            </div>

            <p className="text-xs text-zinc-400 mb-4">
                اختر أفضل 3 طلاب لهذا اليوم ثم اضغط حفظ.
            </p>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {students.map((s) => {
                    const active = stars.includes(s.name);
                    return (
                        <button
                            key={s.id}
                            onClick={() => onToggle(s.name)}
                            className={`
                relative rounded-xl border px-3 py-2 text-sm transition-all text-right
                ${active
                                    ? "border-[hsla(var(--gold),.50)] bg-[hsla(var(--gold),.20)] text-[hsl(var(--gold))] shadow-[0_0_10px_hsla(var(--gold),.20)]"
                                    : "border-white/5 bg-white/5 text-zinc-400 hover:bg-white/10"
                                }
              `}
                        >
                            {s.name}
                            {active && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[hsl(var(--gold))]">★</span>}
                        </button>
                    );
                })}
            </div>

            <div className="mt-5 pt-4 border-t border-[hsla(var(--gold),.10)] flex justify-end">
                <button
                    onClick={onSave}
                    disabled={saving || stars.length !== 3}
                    className="rounded-xl bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--gold-strong))] px-6 py-2 text-sm font-bold text-black shadow-lg hover:shadow-[hsl(var(--gold),.20)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
                >
                    {saving ? "جاري الحفظ..." : "حفظ النجوم"}
                </button>
            </div>
        </div>
    );
}
