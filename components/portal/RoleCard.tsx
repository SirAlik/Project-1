"use client";

import React from "react";
import { motion } from "framer-motion";
import { Shield, School, Bell, ArrowRight, User, GraduationCap, Users, BookOpen, ClipboardCheck, Layers } from "lucide-react";

export interface Persona {
    role: string;
    schoolId?: string;
    schoolName?: string;
    unreadMap?: { urgent: number, normal: number };
}

interface RoleCardProps {
    persona: Persona;
    onClick: () => void;
}

interface RoleConfig { label: string; icon: React.ReactElement<{ size?: number }>; color: string; bg: string; border: string; }
const ROLE_CONFIG: Record<string, RoleConfig> = {
    system_owner: { label: "مالك النظام", icon: <Shield />, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" },
    school_admin: { label: "منسق المدرسة", icon: <Layers />, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
    school_principal: { label: "مدير المدرسة", icon: <School />, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" },
    school_affairs_vp: { label: "وكيل الشؤون المدرسية", icon: <Shield />, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    academic_vp: { label: "وكيل الشؤون التعليمية", icon: <GraduationCap />, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    student_affairs_vp: { label: "وكيل شؤون الطلاب", icon: <Users />, color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
    school_librarian: { label: "أمين مصادر التعلم", icon: <BookOpen />, color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
    quality_coordinator: { label: "منسق الجودة", icon: <ClipboardCheck />, color: "text-teal-500", bg: "bg-teal-500/10", border: "border-teal-500/20" },
    teacher: { label: "معلم", icon: <GraduationCap />, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
    student: { label: "طالب", icon: <User />, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    parent: { label: "ولي أمر", icon: <Users />, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" },
};

export function RoleCard({ persona, onClick }: RoleCardProps) {
    const config = ROLE_CONFIG[persona.role] || ROLE_CONFIG['student'];
    const unreadCount = (persona.unreadMap?.urgent || 0) + (persona.unreadMap?.normal || 0);

    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`cursor-pointer relative overflow-hidden bg-panel p-6 rounded-[2rem] border border-glass shadow-panel hover:border-primary/50 transition-all group`}
        >
            <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-20 ${config.bg.replace('/10', '')}`} />

            <div className="relative z-10 flex flex-col h-full justify-between min-h-[180px]">
                <div className="flex justify-between items-start">
                    <div className={`w-12 h-12 rounded-2xl ${config.bg} flex items-center justify-center ${config.color}`}>
                        {React.cloneElement(config.icon, { size: 24 })}
                    </div>
                    {unreadCount > 0 && (
                        <div className="flex items-center gap-1 bg-destructive text-destructive-foreground px-2.5 py-1 rounded-full text-[10px] font-bold shadow-lg shadow-destructive/20 animate-pulse">
                            <Bell size={10} />
                            <span>{unreadCount}</span>
                        </div>
                    )}
                </div>

                <div>
                    <h3 className="text-xl font-bold mb-1 text-foreground">{config.label}</h3>
                    {persona.schoolName && (
                        <p className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                            <School size={10} />
                            {persona.schoolName}
                        </p>
                    )}
                    {!persona.schoolName && persona.role === 'system_owner' && (
                        <p className="text-xs font-bold text-muted-foreground">النظام المركزي</p>
                    )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
                    <div className="flex gap-1">
                        {['R', 'W', 'X'].map((p, i) => (
                            <span key={i} className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${i === 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-muted text-muted-foreground opacity-50'}`}>
                                {p}
                            </span>
                        ))}
                    </div>
                    <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground text-muted-foreground transition-all">
                        <ArrowRight size={14} className="rotate-180" />
                    </span>
                </div>
            </div>
        </motion.div>
    );
}
