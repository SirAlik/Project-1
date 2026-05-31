import React, { useState } from "react";
import {
    User,
    Phone,
    Heart,
    Edit3,
    Check,
    Globe
} from "lucide-react";
import { StudentProfile } from "@/lib/types/student-affairs";

interface Props {
    student: StudentProfile;
    onUpdate: (id: string, updates: Partial<StudentProfile>) => void;
}

export function StudentProfileCard({ student, onUpdate }: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<StudentProfile>>(student);

    const handleSubmit = () => {
        onUpdate(student.id, formData);
        setIsEditing(false);
    };

    const sections: { title: string; icon: React.ComponentType<{ className?: string }>; fields: { key: keyof StudentProfile; label: string; placeholder: string }[] }[] = [
        {
            title: "Identity & Origin",
            icon: Globe,
            fields: [
                { key: 'national_id', label: 'National ID', placeholder: 'رقم الهوية' },
                { key: 'passport_number', label: 'Passport No.', placeholder: 'رقم الجواز' },
                { key: 'birth_date', label: 'Birth Date', placeholder: 'تاريخ الميلاد' },
                { key: 'nationality', label: 'Nationality', placeholder: 'الجنسية' },
            ]
        },
        {
            title: "Guardian Info",
            icon: Phone,
            fields: [
                { key: 'guardian_name', label: 'Guardian Name', placeholder: 'اسم ولي الأمر' },
                { key: 'guardian_relation', label: 'Relationship', placeholder: 'صلة القرابة' },
                { key: 'guardian_phone', label: 'Phone', placeholder: 'رقم الجوال' },
                { key: 'guardian_work', label: 'Workplace', placeholder: 'جهة العمل' },
            ]
        }
    ];

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
            {/* Header */}
            <div className="bg-zinc-950 p-8 border-b border-zinc-800 relative overflow-hidden">
                <div className="flex justify-between items-start relative z-10">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-indigo-500/10 rounded-[2rem] border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                            <User className="w-10 h-10" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white">{student.name}</h2>
                            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{student.student_id} • {student.grade_level}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => isEditing ? handleSubmit() : setIsEditing(true)}
                        className={`p-3 rounded-2xl border transition-all ${isEditing ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'}`}
                    >
                        {isEditing ? <Check className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
                    </button>
                </div>

                {/* Decorative background circle */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full -mr-32 -mt-32"></div>
            </div>

            {/* Body */}
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 text-right" dir="rtl">
                {sections.map((section, idx) => (
                    <div key={idx} className="space-y-4">
                        <div className="flex items-center gap-3 mb-2 px-2">
                            <div className="p-2 bg-zinc-950 rounded-xl text-zinc-500">
                                <section.icon className="w-4 h-4" />
                            </div>
                            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">{section.title}</h3>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {section.fields.map(field => (
                                <div key={field.key} className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-4 transition-all hover:border-zinc-700">
                                    <label className="block text-[8px] font-black text-zinc-600 uppercase mb-1">{field.label}</label>
                                    {isEditing ? (
                                        <input
                                            className="w-full bg-transparent border-none p-0 text-sm text-white focus:ring-0"
                                            value={(formData[field.key] as string | undefined) || ""}
                                            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                            placeholder={field.placeholder}
                                            title={field.label}
                                        />
                                    ) : (
                                        <span className="text-sm font-bold text-zinc-300">{(student[field.key] as string | undefined) || "---"}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Extra Section: Medical */}
            <div className="px-8 pb-8">
                <div className="bg-rose-500/5 border border-rose-500/10 rounded-[2rem] p-6 text-right" dir="rtl">
                    <div className="flex items-center gap-2 mb-3">
                        <Heart className="w-4 h-4 text-rose-500" />
                        <h4 className="text-xs font-black text-rose-500/80 uppercase">ملاحظات صحية (Medical)</h4>
                    </div>
                    {isEditing ? (
                        <>
                            <input
                                type="text"
                                placeholder="بحث عن طالب..."
                                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-indigo-500 focus:bg-zinc-900 outline-none transition-all placeholder:text-zinc-600 font-medium mb-3"
                                aria-label="بحث عن طالب"
                            />
                            <textarea
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:ring-1 focus:ring-rose-500"
                                rows={2}
                                value={formData.medical_notes || ""}
                                onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
                                title="ملاحظات طبية"
                                placeholder="أدخل الملاحظات الطبية..."
                            />
                        </>
                    ) : (
                        <p className="text-sm font-medium text-rose-200/60 leading-relaxed">
                            {student.medical_notes || "لا يوجد سجل طبي محفوظ"}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
