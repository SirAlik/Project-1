"use client";

import React, { useRef, useEffect } from "react";
import gsap from "gsap";

// Shared mouse position state to avoid multiple window listeners
const mouse = { x: 0, y: 0 };
let isMouseListenerActive = false;

// Initialize shared listener once
const initMouseListener = () => {
    if (isMouseListenerActive) return;
    if (typeof window === 'undefined') return;

    window.addEventListener("mousemove", (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });
    isMouseListenerActive = true;
};

interface AntigravityMagneticTextProps {
    children: React.ReactNode;
    className?: string; // Pull factor (0.1 - 1.0 recommended)
    strength?: number; // Activation radius in px
    radius?: number;
}

export function AntigravityMagneticText({
    children,
    className = "",
    strength = 0.5,
    radius = 100
}: AntigravityMagneticTextProps) {
    const textRef = useRef<HTMLDivElement>(null);

    // GSAP quickTo setters for high performance
    const xTo = useRef<gsap.QuickToFunc | null>(null);
    const yTo = useRef<gsap.QuickToFunc | null>(null);

    useEffect(() => {
        // Ensure shared listener is active
        initMouseListener();

        const element = textRef.current;
        if (!element) return;

        // Initialize quickTo for performant updates
        // We use x/y which maps to translate3d for GPU acceleration
        xTo.current = gsap.quickTo(element, "x", { duration: 0.8, ease: "power3.out" });
        yTo.current = gsap.quickTo(element, "y", { duration: 0.8, ease: "power3.out" });

        // Animation loop
        const tick = () => {
            if (!element || !xTo.current || !yTo.current) return;

            // Calculate distance
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const distanceX = mouse.x - centerX;
            const distanceY = mouse.y - centerY;
            const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

            if (distance < radius) {
                // Inside radius: move towards mouse with strength factor
                const moveX = distanceX * strength;
                const moveY = distanceY * strength;
                xTo.current(moveX);
                yTo.current(moveY);
            } else {
                // Outside radius: return to 0,0
                // quickTo handles the smooth interpolation automatically
                xTo.current(0);
                yTo.current(0);
            }
        };

        // Add to GSAP ticker
        gsap.ticker.add(tick);

        return () => {
            // Cleanup: remove from ticker
            gsap.ticker.remove(tick);
        };
    }, [strength, radius]);

    return (
        <div
            ref={textRef}
            className={`inline-block cursor-default will-change-transform ${className}`}
        >
            {children}
        </div>
    );
}
