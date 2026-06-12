'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth, Persona } from '@/app/_context/AuthContext';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { switchPersonaAction } from '@/app/_actions/switch-persona';
import { getRoleInfo } from '@/lib/auth/roles';

export const RoleSwitcher = () => {
    const { user, role: currentRole, schoolId: currentSchoolId, allPersonas } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [pendingPersona, setPendingPersona] = useState<Persona | null>(null);

    // Stable id to connect trigger <-> menu for assistive tech
    const menuId = 'role-switcher-menu';

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Clean guard: do not render until currentRole is available (prevents null -> wrong label fallback)
    if (!user || !currentRole || !allPersonas || allPersonas.length <= 1) return null;

    const initiateSwitch = (persona: Persona) => {
        const isSameRole = persona.role === currentRole && persona.schoolId === currentSchoolId;

        if (isSameRole) {
            setIsOpen(false);
            return;
        }

        // Close dropdown and show confirmation
        setIsOpen(false);
        setPendingPersona(persona);
    };

    const confirmSwitch = async () => {
        if (!pendingPersona) return;

        setIsLoading(true);
        try {
            // First call server action to verify/log
            const result = await switchPersonaAction({
                role: pendingPersona.role,
                schoolId: pendingPersona.schoolId
            });

            if (result?.success) {
                if (result.redirectPath) {
                    window.location.href = result.redirectPath;
                } else {
                    window.location.reload();
                }
            } else {
                console.error('Failed to switch role on server', result.error);
                window.location.reload(); // Fallback
            }
        } catch (error) {
            console.error('Role switch error:', error);
            window.location.reload();
        } finally {
            setIsLoading(false);
            setPendingPersona(null);
        }
    };

    // No null fallback: currentRole is guaranteed by guard above
    const currentConfig = getRoleInfo(currentRole);
    const pendingConfig = pendingPersona ? getRoleInfo(pendingPersona.role) : null;

    return (
        <>
            <div className="relative z-50" ref={dropdownRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    disabled={isLoading}
                    className={`
            flex items-center gap-2 px-3 py-2 rounded-xl transition-all border border-transparent
            hover:bg-muted/50 hover:border-border
            ${isOpen ? 'bg-muted/50 border-border' : ''}
            ${isLoading ? 'opacity-50 cursor-wait' : ''}
          `}
                    aria-label="تبديل الدور"
                    aria-expanded={isOpen}
                    aria-haspopup="menu"
                    aria-controls={menuId}
                >
                    {isLoading ? (
                        <Loader2 size={16} className="animate-spin text-primary" />
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                            <span className="font-bold text-sm hidden sm:block text-foreground">{currentConfig.labelAr}</span>
                            <ChevronDown
                                size={14}
                                className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            />
                        </div>
                    )}
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            id={menuId}
                            role="menu"
                            aria-label="تبديل حساب المستخدم"
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-full right-0 mt-2 w-64 p-2 rounded-2xl bg-card text-card-foreground shadow-xl border border-border origin-top-right overflow-hidden"
                        >
                            <div className="text-[10px] font-bold opacity-80 px-3 py-2 uppercase tracking-wider text-muted-foreground">
                                تبديل حساب المستخدم
                            </div>

                            <div className="space-y-1">
                                {allPersonas.map((persona, index) => {
                                    const role = persona.role;
                                    const isActive = role === currentRole && persona.schoolId === currentSchoolId;
                                    const Config = getRoleInfo(role);
                                    const Icon = Config.icon;

                                    return (
                                        <button
                                            key={`${role}-${persona.schoolId || index}`}
                                            onClick={() => initiateSwitch(persona)}
                                            className={`
                        w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all text-right
                        ${isActive ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted border border-transparent'}
                      `}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`p-1.5 rounded-lg ${isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                                                        }`}
                                                >
                                                    <Icon size={14} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
                                                </div>
                                                <div className="flex flex-col items-start leading-none gap-1">
                                                    <span className={`font-bold text-xs ${isActive ? 'text-primary' : 'text-foreground'}`}>
                                                        {Config.labelAr}
                                                    </span>
                                                    {persona.schoolName && (
                                                        <span className="text-[9px] text-muted-foreground/70 truncate max-w-[150px]">
                                                            {persona.schoolName}
                                                        </span>
                                                    )}
                                                    {persona.jobTitle && (
                                                        <span className="text-[9px] font-medium text-success/80 truncate max-w-[150px]">
                                                            {persona.jobTitle}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {isActive && <Check size={14} className="text-primary" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Confirmation Dialog Overlay */}
            <AnimatePresence>
                {pendingPersona && pendingConfig && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm"
                        onClick={() => setPendingPersona(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-card w-full max-w-sm rounded-2xl shadow-2xl border border-border overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 text-center">
                                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                                    {(() => {
                                        const PendingIcon = pendingConfig.icon;
                                        return <PendingIcon size={24} />;
                                    })()}
                                </div>
                                <h3 className="text-lg font-bold mb-2">تأكيد تغيير الدور</h3>
                                <p className="text-sm text-muted-foreground mb-6">
                                    هل أنت متأكد من رغبتك بالانتقال إلى دور
                                    <span className="font-bold text-foreground mx-1">{pendingConfig.labelAr}</span>
                                    {pendingPersona.schoolName && <span> في {pendingPersona.schoolName}</span>}؟
                                </p>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setPendingPersona(null)}
                                        className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                                    >
                                        إلغاء
                                    </button>
                                    <button
                                        onClick={confirmSwitch}
                                        disabled={isLoading}
                                        className="px-4 py-2 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                                    >
                                        {isLoading && <Loader2 size={14} className="animate-spin" />}
                                        تأكيد الانتقال
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
