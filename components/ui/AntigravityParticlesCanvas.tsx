'use client';

import React, { useEffect, useRef } from 'react';

// =============================================================================
// CONFIGURATION
// =============================================================================
const CONFIG = {
    // "Ambient Atmosphere" - Barely visible dust
    PARTICLE_COUNT: { MOBILE: 15, DESKTOP: 40 },
    BASE_SPEED: 0.05, // Almost static
    DAMPING: 0.99,
    MOUSE_INFLUENCE_RADIUS: 150,
    MOUSE_FORCE: 0.5,
    MOUSE_ENERGY_DECAY: 0.90,
    NOISE_SCALE: 0.0005,
    NOISE_Z_SPEED: 0.00001,
    DASH_LENGTH_FACTOR: 1.0,
    COLOR_PALETTE: {
        DARK: { hue: 43, sat: 70, light: 50, alpha: 0.1 },  // Faint Gold
        LIGHT: { hue: 43, sat: 70, light: 50, alpha: 0.1 },  // Faint Gold
    }
};

// Fast Simplex-like flow field function
function getFlowAngle(x: number, y: number, z: number): number {
    // Super simple, fast flow field math
    // Mix of sines/cosines at different scales
    const angle = (Math.sin(x * CONFIG.NOISE_SCALE) + Math.cos(y * CONFIG.NOISE_SCALE) + z) * Math.PI * 2;
    // Add some turbulence
    const turb = Math.sin(x * 0.01 + z) * Math.cos(y * 0.01 - z);
    return angle + turb;
}

export const AntigravityParticlesCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        // State refs
        let width = 0;
        let height = 0;
        let time = 0;
        let animationFrameId: number;

        // Mouse state
        const mouse = { x: -9999, y: -9999, vx: 0, vy: 0, energy: 0 };
        const lastMouse = { x: -9999, y: -9999, ts: 0 };

        // Particle Data (Struct of Arrays for performance)
        // x, y, vx, vy, speed_mult
        let pCount = 0;
        let pData: Float32Array;

        // Initialize System
        const init = () => {
            const isDesktop = window.innerWidth >= 768;
            pCount = isDesktop ? CONFIG.PARTICLE_COUNT.DESKTOP : CONFIG.PARTICLE_COUNT.MOBILE;

            // 5 floats per particle: x, y, vx, vy, speedVariance
            pData = new Float32Array(pCount * 5);

            for (let i = 0; i < pCount; i++) {
                const idx = i * 5;
                pData[idx] = Math.random() * width;      // x
                pData[idx + 1] = Math.random() * height; // y
                pData[idx + 2] = 0;                      // vx
                pData[idx + 3] = 0;                      // vy
                pData[idx + 4] = 0.5 + Math.random();    // speedVariance (0.5 - 1.5)
            }
        };

        // Resize Handler
        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            const dpr = window.devicePixelRatio || 1;

            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = '100%';
            canvas.style.height = '100%';

            ctx.scale(dpr, dpr);

            // Re-init if needed or just let them wrap
            if (!pData) init();
        };

        // Mouse Handlers
        const handleMouseMove = (e: MouseEvent) => {
            const now = performance.now();
            const dt = now - lastMouse.ts;

            // Calculate velocity of mouse
            if (lastMouse.x !== -9999 && dt > 0) {
                const dx = e.clientX - lastMouse.x;
                const dy = e.clientY - lastMouse.y;
                mouse.vx = dx / dt * 16; // Normalized to pixels per frame approx
                mouse.vy = dy / dt * 16;

                // Add energy based on speed
                const speed = Math.sqrt(mouse.vx * mouse.vx + mouse.vy * mouse.vy);
                mouse.energy = Math.min(mouse.energy + speed * 0.1, 5.0); // Cap energy
            }

            mouse.x = e.clientX;
            mouse.y = e.clientY;

            lastMouse.x = e.clientX;
            lastMouse.y = e.clientY;
            lastMouse.ts = now;
        };

        const handleMouseLeave = () => {
            mouse.x = -9999;
            mouse.y = -9999;
            mouse.energy = 0;
        };

        // Setup
        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);
        handleResize();
        init();

        // Loop
        const render = () => {
            // Clear (transparent)
            ctx.clearRect(0, 0, width, height);

            time += CONFIG.NOISE_Z_SPEED;

            // Decay mouse energy
            mouse.energy *= CONFIG.MOUSE_ENERGY_DECAY;
            if (mouse.energy < 0.01) mouse.energy = 0;

            const mX = mouse.x;
            const mY = mouse.y;
            const mEnergy = mouse.energy;
            const mRadiusSq = CONFIG.MOUSE_INFLUENCE_RADIUS * CONFIG.MOUSE_INFLUENCE_RADIUS;

            // Define colors based on theme using CSS variables
            // LUXURY HIGH-CONTRAST PALETTE: Gold / Bronze / Charcoal / White
            const getThemeColors = () => {
                // Premium palette optimized for white canvas visibility
                // Higher opacity for elegance without overwhelming the UI
                return [
                    'hsla(43, 74%, 49%, 0.35)',    // Metallic Gold - primary accent
                    'hsla(30, 60%, 40%, 0.25)',   // Bronze - warm depth
                    'hsla(220, 15%, 20%, 0.20)',  // Charcoal - subtle grounding
                    'hsla(0, 0%, 100%, 0.15)'     // Soft white - ambient dust
                ];
            };

            const colors = getThemeColors();

            // Render in batches by color for performance (fewer state changes)
            const batchSize = Math.floor(pCount / colors.length);

            ctx.lineWidth = 2;
            ctx.lineCap = 'round';

            for (let c = 0; c < colors.length; c++) {
                ctx.strokeStyle = colors[c];
                ctx.beginPath();

                const startIdx = c * batchSize;
                const endIdx = (c === colors.length - 1) ? pCount : (c + 1) * batchSize;

                for (let i = startIdx; i < endIdx; i++) {
                    const idx = i * 5;
                    let x = pData[idx];
                    let y = pData[idx + 1];
                    let vx = pData[idx + 2];
                    let vy = pData[idx + 3];
                    const speedVar = pData[idx + 4];

                    // 1. Flow Field Force
                    const angle = getFlowAngle(x, y, time);

                    const ax = Math.cos(angle) * 0.05 * speedVar;
                    const ay = Math.sin(angle) * 0.05 * speedVar;

                    vx += ax;
                    vy += ay;

                    // 2. Mouse Interaction
                    if (mEnergy > 0.1 && mX !== -9999) {
                        const dx = mX - x;
                        const dy = mY - y;
                        const distSq = dx * dx + dy * dy;

                        if (distSq < mRadiusSq) {
                            const dist = Math.sqrt(distSq);
                            const influence = 1 - (dist / CONFIG.MOUSE_INFLUENCE_RADIUS);

                            const tx = -dy / dist;
                            const ty = dx / dist;

                            const attX = dx / dist;
                            const attY = dy / dist;

                            const force = influence * mEnergy * CONFIG.MOUSE_FORCE * 0.02;

                            vx += (tx * 0.8 + attX * 0.2) * force;
                            vy += (ty * 0.8 + attY * 0.2) * force;
                        }
                    }

                    // 3. Physics
                    const speedSq = vx * vx + vy * vy;
                    const maxSpeed = 4 * speedVar + mEnergy;
                    if (speedSq > maxSpeed * maxSpeed) {
                        const scale = maxSpeed / Math.sqrt(speedSq);
                        vx *= scale;
                        vy *= scale;
                    }

                    vx *= CONFIG.DAMPING;
                    vy *= CONFIG.DAMPING;

                    if (Math.abs(vx) < 0.01) vx += (Math.random() - 0.5) * 0.01;
                    if (Math.abs(vy) < 0.01) vy += (Math.random() - 0.5) * 0.01;

                    x += vx;
                    y += vy;

                    // 4. Wrap around
                    if (x < -10) x = width + 10;
                    if (x > width + 10) x = -10;
                    if (y < -10) y = height + 10;
                    if (y > height + 10) y = -10;

                    // 5. Save state
                    pData[idx] = x;
                    pData[idx + 1] = y;
                    pData[idx + 2] = vx;
                    pData[idx + 3] = vy;

                    // 6. Draw Dash
                    ctx.moveTo(x, y);
                    ctx.lineTo(x - vx * CONFIG.DASH_LENGTH_FACTOR, y - vy * CONFIG.DASH_LENGTH_FACTOR);
                }
                ctx.stroke();
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 pointer-events-none z-[1] overflow-hidden"
            aria-hidden="true"
        >
            <canvas ref={canvasRef} />
        </div>
    );
};
