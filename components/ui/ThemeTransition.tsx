"use client";

import { useTheme } from "next-themes";
import { useEffect, useState, startTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Focus Pull Effect on Theme Change
 * Simulates a camera refocusing when the environment changes.
 * 
 * CONSTRAINT: Blur overlay only, not full body filter.
 * CONSTRAINT: Respects prefers-reduced-motion.
 */
export function ThemeTransition() {
    const { resolvedTheme } = useTheme();
    const [isMounted, setIsMounted] = useState(false);
    const [trigger, setTrigger] = useState(false);

    // Initial Mount
    useEffect(() => {
        startTransition(() => setIsMounted(true));
    }, []);

    // Defocus Trigger
    useEffect(() => {
        if (!isMounted) return;

        // Skip effect if user prefers reduced motion
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) return;

        startTransition(() => setTrigger(true));
        const timer = setTimeout(() => startTransition(() => setTrigger(false)), 600);
        return () => clearTimeout(timer);
    }, [resolvedTheme, isMounted]);

    if (!isMounted) return null;

    return (
        <AnimatePresence>
            {trigger && (
                <motion.div
                    initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                    animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
                    exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="fixed inset-0 z-[9999] pointer-events-none bg-background/5"
                    aria-hidden="true"
                />
            )}
        </AnimatePresence>
    );
}
