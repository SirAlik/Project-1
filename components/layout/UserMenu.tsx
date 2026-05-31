"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, Persona } from "@/app/_context/AuthContext";
import { getRoleInfo } from "@/lib/auth/roles";
import { switchPersonaAction } from "@/app/_actions/switch-persona";
import {
    User,
    LogOut,
    Check,
    Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const UserMenu = () => {
    const { user, role, allPersonas, schoolName, fullName, supabase } = useAuth();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    if (!user) return null;

    const currentRoleInfo = role ? getRoleInfo(role) : null;
    const hasMultiplePersonas = allPersonas && allPersonas.length > 1;

    // DEBUG: trace role for identity display
    if (process.env.NODE_ENV === 'development') {
        console.log('[UserMenu] role context:', { activeRole: role, label: currentRoleInfo?.label });
    }

    const handleSignOut = async () => {
        setIsLoading(true);
        // Use singleton client from context
        await supabase.auth.signOut();
        window.location.href = "/login";
    };

    const handleRoleSwitch = async (persona: Persona) => {
        const isSameRole =
            persona.role === role &&
            persona.schoolId === allPersonas.find((p) => p.role === role)?.schoolId;
        if (isSameRole) return;

        setIsLoading(true);
        try {
            const result = await switchPersonaAction({
                role: persona.role,
                schoolId: persona.schoolId,
            });

            if (result?.success) {
                if (result.redirectPath) {
                    router.refresh();
                    router.replace(result.redirectPath);
                } else {
                    window.location.reload();
                }
            } else {
                console.error("Failed to switch role", result.error);
                window.location.reload();
            }
        } catch (e) {
            console.error(e);
            window.location.reload();
        }
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isLoading}
                className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-[var(--bg-primary)] transition-all group"
            >
                <div className="hidden md:block text-left">
                    <p className="text-xs font-bold whitespace-nowrap text-foreground group-hover:text-primary transition-colors">
                        {fullName || "مستخدم"}
                    </p>
                    <p className="text-[10px] opacity-80 truncate max-w-[100px] text-muted-foreground">
                        {currentRoleInfo?.label || "ضيف"}
                    </p>
                </div>

                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-transparent group-hover:ring-[var(--primary)]/20 transition-all">
                    {isLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : fullName ? (
                        fullName[0].toUpperCase()
                    ) : (
                        <User size={18} />
                    )}
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 mt-2 w-72 bg-popover border border-border shadow-xl rounded-2xl overflow-hidden z-[1000]"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-border bg-muted/30">
                            <p className="font-bold text-sm text-foreground">
                                {fullName || "مستخدم"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {user.email}
                            </p>
                        </div>

                        <div className="p-2 space-y-1">
                            {/* Role Context Display (Or Switcher if multiple) */}
                            <div className="px-2 py-1.5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                                    سياق العمل
                                </p>

                                {hasMultiplePersonas ? (
                                    <div className="space-y-1">
                                        {allPersonas.map((p, idx) => {
                                            const rInfo = getRoleInfo(p.role);
                                            const isActive =
                                                p.role === role &&
                                                p.schoolId ===
                                                allPersonas.find((cp) => cp.role === role)?.schoolId;

                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleRoleSwitch(p)}
                                                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors ${isActive
                                                        ? "bg-primary/10 text-primary"
                                                        : "hover:bg-muted text-foreground"
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {(() => {
                                                            const RoleIcon = rInfo.icon;
                                                            return <RoleIcon size={12} />;
                                                        })()}
                                                        <span>{rInfo.label}</span>
                                                        {p.schoolName && (
                                                            <span className="opacity-70 text-[10px]">
                                                                ({p.schoolName})
                                                            </span>
                                                        )}
                                                    </div>
                                                    {isActive && <Check size={12} />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/50 text-xs text-foreground">
                                        {currentRoleInfo ? (
                                            <>
                                                {(() => {
                                                    const CurrentIcon = currentRoleInfo.icon;
                                                    return <CurrentIcon size={14} className="text-primary" />;
                                                })()}
                                                <span>{currentRoleInfo.label}</span>
                                            </>
                                        ) : (
                                            <span>ضيف</span>
                                        )}
                                        {schoolName && (
                                            <span className="opacity-50"> - {schoolName}</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="h-px bg-border my-1" />

                            <button
                                onClick={handleSignOut}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                            >
                                <LogOut size={14} />
                                <span>تسجيل الخروج</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};