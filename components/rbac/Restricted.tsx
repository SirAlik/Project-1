"use client";

import { useAuth } from "@/app/_context/AuthContext";
import { Role } from "@/lib/auth/roles";

type RestrictedProps = {
    to?: Role | Role[]; // Roles that CAN see this
    except?: Role | Role[]; // Roles that CANNOT see this
    children: React.ReactNode;
};

/**
 * Restricted Component
 * 
 * Usage:
 * <Restricted to="school_admin"> <DeleteButton /> </Restricted>
 * <Restricted except="school_principal"> <SettingsButton /> </Restricted>
 */
export function Restricted({ to, except, children }: RestrictedProps) {
    const { role } = useAuth();

    if (!role) return null;

    // Admin always sees everything? Maybe not if we want to test Principal view.
    // But usually Admin is super user. 
    // Let's strictly follow the props.

    const toArr = Array.isArray(to) ? to : (to ? [to] : []);
    const exceptArr = Array.isArray(except) ? except : (except ? [except] : []);

    // If 'except' is provided, and user has that role, HIDE.
    if (exceptArr.length > 0 && exceptArr.includes(role)) {
        return null; // Hidden
    }

    // If 'to' is provided, and user does NOT have that role, HIDE.
    if (toArr.length > 0 && !toArr.includes(role)) {
        return null; // Hidden
    }

    // Otherwise show
    return <>{children}</>;
}
