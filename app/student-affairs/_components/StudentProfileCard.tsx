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
            title: "الهوية والأصل",
            icon: Globe,
            fields: [
                { key: 'national_id', label: 'رقم الهوية', placeholder: 'رقم الهوية' },
                { key: 'passport_number', label: 'رقم الجواز', placeholder: 'رقم الجواز' },
                { key: 'birth_date', label: 'تاريخ الميلاد', placeholder: 'تاريخ الميلاد' },
                { key: 'nationality', label: 'الجنسية', placeholder: 'الجنسية' },
            ]
        },
        {
            title: "بيانات ولي الأمر",
            icon: Phone,
            fields: [
                { key: 'guardian_name', label: 'اسم ولي الأمر', placeholder: 'اسم ولي الأمر' },
                { key: 'guardian_relation', label: 'صلة القرابة', placeholder: 'صلة القرابة' },
                { key: 'guardian_phone', label: 'رقم الجوال', placeholder: 'رقم الجوال' },
                { key: 'guardian_work', label: 'جهة العمل', placeholder: 'جهة العمل' },
            ]
        }
    ];

    return (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {/* Header */}
            <div className="border-b border-border bg-surface-soft p-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-5">
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                            <User className="h-10 w-10" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-foreground">{student.name}</h2>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{student.student_id} • {student.grade_level}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => isEditing ? handleSubmit() : setIsEditing(true)}
                        className={`rounded-2xl border p-3 transition-colors ${isEditing ? 'border-success bg-success text-success-foreground' : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                        aria-label={isEditing ? "حفظ التعديلات" : "تعديل الملف"}
                    >
                        {isEditing ? <Check className="h-5 w-5" /> : <Edit3 className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="grid grid-cols-1 gap-8 p-6 text-right md:grid-cols-2" dir="rtl">
                {sections.map((section, idx) => (
                    <div key={idx} className="space-y-4">
                        <div className="mb-2 flex items-center gap-3 px-1">
                            <div className="rounded-xl bg-surface-soft p-2 text-primary">
                                <section.icon className="h-4 w-4" />
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">{section.title}</h3>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {section.fields.map(field => (
                                <div key={field.key} className="rounded-2xl border border-border bg-surface-soft p-4 transition-colors hover:border-primary/30">
                                    <label className="mb-1 block text-[9px] font-black uppercase text-muted-foreground">{field.label}</label>
                                    {isEditing ? (
                                        <input
                                            className="w-full border-none bg-transparent p-0 text-sm text-foreground focus:ring-0"
                                            value={(formData[field.key] as string | undefined) || ""}
                                            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                            placeholder={field.placeholder}
                                            title={field.label}
                                        />
                                    ) : (
                                        <span className="text-sm font-bold text-foreground">{(student[field.key] as string | undefined) || "---"}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Extra Section: Medical */}
            <div className="px-6 pb-6">
                <div className="rounded-2xl border border-destructive/15 bg-destructive/5 p-5 text-right" dir="rtl">
                    <div className="mb-3 flex items-center gap-2">
                        <Heart className="h-4 w-4 text-destructive" />
                        <h4 className="text-xs font-black uppercase text-destructive">ملاحظات صحية</h4>
                    </div>
                    {isEditing ? (
                        <textarea
                            className="w-full rounded-xl border border-border bg-card p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-destructive/30"
                            rows={2}
                            value={formData.medical_notes || ""}
                            onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
                            title="ملاحظات طبية"
                            placeholder="أدخل الملاحظات الطبية..."
                        />
                    ) : (
                        <p className="text-sm font-medium leading-relaxed text-foreground/80">
                            {student.medical_notes || "لا يوجد سجل طبي محفوظ"}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
