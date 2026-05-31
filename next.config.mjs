/** @type {import('next').NextConfig} */
const nextConfig = {
    // ── Explicit Safety Locks ──
    // These match the current defaults but are locked explicitly
    // so no accidental override can sneak in.
    typescript: {
        ignoreBuildErrors: false,
    },

    // ── Demo Mode ──
    // يُفعَّل Demo Mode تلقائياً بدون .env.local — لإيقافه أزل هذا السطر
    env: {
        NEXT_PUBLIC_DEMO_MODE: 'true',
    },

    // ── Security Headers ──
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    { key: "X-Frame-Options", value: "DENY" },
                    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                ],
            },
        ];
    },
};

export default nextConfig;