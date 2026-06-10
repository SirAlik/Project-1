"use client";

import { useEffect, useRef, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/_context/AuthContext";
import { PortalClient } from "./PortalClient";

interface PortalClientGateProps {
    /** Pre-fetched user display name (from server) */
    serverUserName?: string;
}

/**
 * PortalClientGate: Client-side auth gating for /portal.
 */
export function PortalClientGate({ serverUserName }: PortalClientGateProps) {
    const router = useRouter();
    const { user, isLoading, allPersonas } = useAuth();
    const hasRedirectedRef = useRef(false);
    const hasAutoSelectedRef = useRef(false);
    const [showContent, setShowContent] = useState(false);
    const [autoRedirectError, setAutoRedirectError] = useState<string | null>(null);

    // Instrumentation
    const devLog = (msg: string, ...args: unknown[]) => {
        if (process.env.NODE_ENV === "development") {
            console.debug(`[PortalGate] ${msg}`, ...args);
        }
    };

    useEffect(() => {
        // 1. Loading
        if (isLoading) return;

        // 2. No User -> Redirect Login
        if (!user) {
            if (hasRedirectedRef.current) return;
            hasRedirectedRef.current = true;
            router.replace("/login");
            return;
        }

        // 3. User authenticated
        startTransition(() => setShowContent(true));
    }, [isLoading, user, router]);

    // Auto-redirect effect for single persona
    useEffect(() => {
        if (!showContent || allPersonas.length !== 1 || hasAutoSelectedRef.current) return;

        // If we already failed an auto-redirect, don't try again (show selector)
        if (autoRedirectError) return;

        const performAutoRedirect = async () => {
            hasAutoSelectedRef.current = true;
            const persona = allPersonas[0];

            devLog("Single persona detected, attempting API auto-redirect:", persona.role);

            try {
                // Prepare payload similar to PortalClient
                const normalizedSchoolId: string | undefined =
                    typeof persona.schoolId === 'string' &&
                        persona.schoolId &&
                        persona.schoolId !== 'null' &&
                        persona.schoolId !== 'undefined' &&
                        persona.schoolId.trim() !== ''
                        ? persona.schoolId
                        : undefined;

                const isGlobal = persona.role === 'system_owner';

                const res = await fetch("/api/persona/select", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        role: persona.role,
                        ...(!isGlobal && normalizedSchoolId ? { schoolId: normalizedSchoolId } : {}),
                    }),
                    credentials: "same-origin",
                    cache: "no-store",
                });

                if (res.ok) {
                    const { redirectPath } = await res.json();
                    devLog("Auto-redirect successful, navigating to:", redirectPath);
                    // NO router.refresh() here to avoid AbortError conflicts
                    router.replace(redirectPath);
                } else {
                    console.error("Auto-redirect failed status:", res.status);
                    setAutoRedirectError("فشل التوجيه التلقائي");
                    // Allow UI to render the card for manual retry
                }
            } catch (err) {
                console.error("Auto-redirect network error:", err);
                setAutoRedirectError("خطأ في الاتصال");
            }
        };

        startTransition(async () => { await performAutoRedirect(); });
    }, [showContent, allPersonas, autoRedirectError, router]);


    // Loading state
    if (isLoading || !showContent) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                    <p className="text-muted-foreground">جاري التحميل...</p>
                </div>
            </div>
        );
    }

    // No personas
    if (allPersonas.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center text-center">
                <div className="space-y-3">
                    <h1 className="text-xl font-bold">الحساب قيد الانتظار</h1>
                    <p className="text-muted-foreground">
                        لا توجد أدوار مسندة لهذا الحساب حالياً.
                    </p>
                </div>
            </div>
        );
    }

    // Render PortalClient (Selector)
    // This happens if:
    // 1. Multiple personas exist
    // 2. Single persona exists but auto-redirect failed (error state)
    // 3. While auto-redirect is in progress (we could show a loader, but PortalClient is fine)

    // Ideally hide while auto-redirecting purely?
    if (allPersonas.length === 1 && !autoRedirectError && hasAutoSelectedRef.current) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                    <p className="text-muted-foreground">جاري توجيهك...</p>
                </div>
            </div>
        );
    }

    const displayName = serverUserName || user?.email?.split("@")[0] || "المستخدم";
    return <PortalClient personas={allPersonas} userName={displayName} />;
}
