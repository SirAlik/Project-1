"use client";

import React, { useRef, useState, useCallback } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";

interface HolographicCardProps {
    children: React.ReactNode;
    className?: string;
    /** Enable the holographic effect? Default: true */
    enabled?: boolean;
    /** Scale of the tilt effect. Default: 15 */
    tiltScale?: number;
    onClick?: () => void;
}

/**
 * Holographic 3D Card
 * 
 * Features:
 * - Mouse-tracking 3D tilt
 * - Internal parallax (content moves opposite to tilt)
 * - Glare effect
 * - Opt-in (enabled prop)
 */
export function HolographicCard({
    children,
    className = "",
    enabled = true,
    tiltScale = 15,
    onClick
}: HolographicCardProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    // Mouse coordinates (0 to 1)
    const mouseX = useMotionValue(0.5);
    const mouseY = useMotionValue(0.5);

    // Smooth springs for rotation
    const rotateX = useSpring(0, { damping: 20, stiffness: 100 });
    const rotateY = useSpring(0, { damping: 20, stiffness: 100 });

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current || !enabled) return;

        const rect = ref.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        const x = (e.clientX - rect.left) / width;
        const y = (e.clientY - rect.top) / height;

        mouseX.set(x);
        mouseY.set(y);

        // Calculate rotation: center is (0.5, 0.5) -> 0 deg
        const rY = (x - 0.5) * tiltScale; // Tilt based on X position
        const rX = (0.5 - y) * tiltScale; // Tilt based on Y position (inverted)

        rotateX.set(rX);
        rotateY.set(rY);
    }, [enabled, tiltScale, mouseX, mouseY, rotateX, rotateY]);

    const handleMouseEnter = () => {
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        // Reset to center
        rotateX.set(0);
        rotateY.set(0);
        mouseX.set(0.5);
        mouseY.set(0.5);
    };

    // Dynamic styles
    const transformStyle = useMotionTemplate`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${isHovered ? 1.02 : 1}, ${isHovered ? 1.02 : 1}, 1)`;

    // Glare gradient
    const glareBackground = useMotionTemplate`radial-gradient(
        farthest-corner circle at ${mouseX.get() * 100}% ${mouseY.get() * 100}%,
        rgba(255, 255, 255, 0.1) 0%,
        rgba(255, 255, 255, 0) 80%
    )`;

    if (!enabled) {
        return (
            <div className={`relative ${className}`} onClick={onClick}>
                {children}
            </div>
        );
    }

    return (
        <motion.div
            ref={ref}
            className={`relative transform-gpu will-change-transform ${className}`}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
            style={{
                transform: transformStyle,
                transformStyle: "preserve-3d",
            }}
        >
            {/* Content Layer (Parallaxed) */}
            <motion.div
                className="w-full h-full"
                style={{
                    transformStyle: "preserve-3d",
                    translateZ: "20px", // Push content forward
                }}
            >
                {children}
            </motion.div>

            {/* Glare Overlay */}
            <motion.div
                className="absolute inset-0 pointer-events-none rounded-[inherit] z-50 mix-blend-overlay opacity-0 transition-opacity duration-300"
                animate={{ opacity: isHovered ? 1 : 0 }}
                style={{
                    background: glareBackground,
                }}
            />
        </motion.div>
    );
}
