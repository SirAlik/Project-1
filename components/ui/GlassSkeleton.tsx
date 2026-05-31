'use client';

interface GlassSkeletonProps {
    className?: string;
    variant?: 'card' | 'text' | 'circle';
}

/**
 * GlassSkeleton - CLS-optimized loading placeholder
 * Uses CSS keyframe animation for global sync across all skeleton instances
 */
export function GlassSkeleton({ className = '', variant = 'card' }: GlassSkeletonProps) {
    const baseClasses = "relative overflow-hidden bg-muted/40 border border-border/20 backdrop-blur-md skeleton-shimmer-sync";

    const variantClasses = {
        card: "rounded-3xl h-64 w-full",
        text: "rounded-lg h-4 w-3/4",
        circle: "rounded-full h-12 w-12"
    };

    return (
        <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
            {/* Holographic noise texture overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        </div>
    );
}
