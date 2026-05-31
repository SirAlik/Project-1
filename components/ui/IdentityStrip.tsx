"use client";

import React from "react";
import { Shield, School } from "lucide-react";

import { useAuth } from "@/app/_context/AuthContext";
import { getRoleInfo } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/auth/roles";

interface IdentityStripProps {
    role?: UserRole;
    schoolName?: string;
}

export function IdentityStrip({
    role: propRole,
    schoolName: propSchoolName,
}: IdentityStripProps) {
    const { role: contextRole, schoolName: contextSchoolName } = useAuth();

    const role: UserRole = propRole || contextRole || "system_owner";
    const schoolName = propSchoolName || contextSchoolName;

    if (process.env.NODE_ENV === 'development') {
        console.log('[Identity] roles', { activePersonaRole: role, contextRole });
    }

    const roleInfo = getRoleInfo(role);

    return (
        <div className="bg-panel border-b border-border px-4 py-2 flex justify-between items-center sticky top-0 z-50">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs font-bold text-primary">
                    <Shield size={14} />
                    <span className="uppercase tracking-wider opacity-80 text-muted-foreground">
                        السياق الحالي:
                    </span>
                    <span className="text-primary-foreground bg-primary/90 px-2 py-0.5 rounded border border-primary/20">
                        {roleInfo.label}
                    </span>
                </div>

                {schoolName && (
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground border-r border-border pr-4 mr-4">
                        <School size={14} />
                        <span>{schoolName}</span>
                    </div>
                )}
            </div>
        </div>
    );
}