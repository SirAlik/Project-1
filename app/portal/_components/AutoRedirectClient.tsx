"use client";

import { useCallback, useEffect, useRef, useState, startTransition } from "react";
import { useRouter } from "next/navigation";

interface AutoRedirectProps {
    /** Minimal identifiers for server-side verification */
    role: string;
    schoolId?: string;
    targetPath: string;
}

/**
 * AutoRedirectClient: Handles single-persona auto-redirect flow.
 * 
 * Production Hardening:
 * 1. StrictMode Guard: Uses useRef to ensure action runs only once per mount.
 * 2. Minimal Payload: Sends only role + schoolId, server verifies ownership.
 * 3. Error Handling: Shows inline error state with Retry/Sign-out options.
 * 4. Navigation Reliability: Calls router.refresh() before redirect to ensure cookie is reflected.
 */
export function AutoRedirectClient({ role, schoolId, targetPath }: AutoRedirectProps) {
    const router = useRouter();
    const hasExecutedRef = useRef(false);
    const [error, setError] = useState<string | null>(null);
    const [, setIsLoading] = useState(true);

    // GUARD: Prevent self-redirect to /portal (would cause infinite loop)
    const isInvalidTarget = !targetPath || targetPath === "/portal";

    const executeRedirect = useCallback(async () => {
        // StrictMode guard: prevent duplicate execution
        if (hasExecutedRef.current) return;
        hasExecutedRef.current = true;

        setIsLoading(true);
        setError(null);

        // Normalize schoolId: prevent sending "undefined", "null", or "" as strings
        // Belt + suspenders: check typeof AND string equality
        const normalizedSchoolId: string | undefined =
            typeof schoolId === 'string' &&
                schoolId &&
                schoolId !== 'null' &&
                schoolId !== 'undefined' &&
                schoolId !== ''
                ? schoolId
                : undefined;

        // TEMP DEBUG: trace the source
        console.log("[AutoRedirect] Starting redirect for:", {
            role,
            schoolIdProp: schoolId,
            schoolIdType: typeof schoolId,
            normalizedSchoolId: normalizedSchoolId ? "***" : "undefined",
        });
        console.log("[AutoRedirect] Calling /api/persona/select...");

        try {
            // OMIT schoolId key entirely if undefined (not just set to undefined)
            const res = await fetch("/api/persona/select", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    role,
                    redirectTo: targetPath,
                    ...(normalizedSchoolId ? { schoolId: normalizedSchoolId } : {}),
                }),
                credentials: "same-origin",
                cache: "no-store",
            });

            if (res.ok) {
                const { redirectPath } = await res.json();

                // TEMP DEBUG
                console.log("[AutoRedirect] Cookie set by server (response ok).");
                console.log("[AutoRedirect] Refreshing router cache...");

                // Refresh server components to pick up new cookie state
                router.refresh();

                console.log("[AutoRedirect] Redirecting now to:", redirectPath);
                router.replace(redirectPath);
            } else {
                const err = await res.json().catch(() => ({}));
                console.error("[AutoRedirect] Failed:", res.status, err);
                setError(err.error || "Failed to activate persona.");
                setIsLoading(false);
            }
        } catch (err) {
            console.error("[AutoRedirect] Network error:", err);
            setError("An unexpected error occurred. Please try again.");
            setIsLoading(false);
        }
    }, [role, schoolId, targetPath, router]);

    useEffect(() => {
        startTransition(async () => { await executeRedirect(); });
    }, [executeRedirect]);

    const handleRetry = () => {
        hasExecutedRef.current = false;
        executeRedirect();
    };

    const handleSignOut = () => {
        router.replace("/logout");
    };

    // Error State
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="text-center space-y-6 max-w-md">
                    <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                        <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-card-foreground">خطأ في التحويل</h2>
                        <p className="text-muted-foreground text-sm">{error}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={handleRetry}
                            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                        >
                            إعادة المحاولة
                        </button>
                        <button
                            onClick={handleSignOut}
                            className="px-6 py-2.5 border border-border text-card-foreground rounded-lg font-medium hover:bg-muted transition-colors"
                        >
                            تسجيل الخروج
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // EARLY GUARD: Invalid target (would cause loop)
    if (isInvalidTarget) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="text-center space-y-6 max-w-md">
                    <div className="w-16 h-16 mx-auto rounded-full bg-warning/10 flex items-center justify-center">
                        <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-card-foreground">سياق العمل غير مكتمل</h2>
                        <p className="text-muted-foreground text-sm">
                            هذا الدور يتطلب تحديد المدرسة. يرجى التواصل مع المسؤول.
                        </p>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="px-6 py-2.5 border border-border text-card-foreground rounded-lg font-medium hover:bg-muted transition-colors"
                    >
                        تسجيل الخروج
                    </button>
                </div>
            </div>
        );
    }

    // Loading State
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center space-y-4">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="text-muted-foreground font-saudi">جاري التحويل...</p>
            </div>
        </div>
    );
}
