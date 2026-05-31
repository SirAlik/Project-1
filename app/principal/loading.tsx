'use client';

import { GlassSkeleton } from '@/components/ui/GlassSkeleton';

/**
 * Principal Dashboard Loading Skeleton
 * Matches the exact grid layout to eliminate CLS
 * Layout: Header → 4-col KPI → 12-col Hotspots + Audit → Sentinel → Org Hub → Academic Monitoring
 */
export default function PrincipalDashboardLoading() {
    return (
        <main className="min-h-screen text-[var(--text)] font-sans pb-20" dir="rtl">
            <div className="relative z-10 mx-auto max-w-7xl px-8 py-10">

                {/* Futuristic Header - matches flex layout with icon and buttons */}
                <header className="mb-10 flex justify-between items-center min-h-[72px]">
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <div className="relative w-14 h-14 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-2xl flex items-center justify-center shadow-lg">
                                <GlassSkeleton variant="circle" className="w-7 h-7" />
                            </div>
                        </div>
                        <div>
                            <GlassSkeleton variant="text" className="w-48 h-8 mb-2" />
                            <GlassSkeleton variant="text" className="w-72 h-4" />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <GlassSkeleton variant="card" className="w-40 h-12 rounded-2xl" />
                        <GlassSkeleton variant="circle" className="w-12 h-12 rounded-2xl" />
                    </div>
                </header>

                {/* Top KPI Strip - 4 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="glass-card p-6 rounded-[2rem] border border-white/10 min-h-[120px]">
                            <GlassSkeleton variant="text" className="w-24 h-3 mb-2" />
                            <GlassSkeleton variant="text" className="w-20 h-8 mb-2" />
                            <GlassSkeleton variant="text" className="w-16 h-4" />
                        </div>
                    ))}
                </div>

                {/* Operational Command Grid - 8+4 columns */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
                    {/* Hotspots Map - spans 8 columns */}
                    <div className="lg:col-span-8 glass-card p-6 rounded-2xl border border-white/10 min-h-[320px]">
                        <GlassSkeleton variant="text" className="w-64 h-5 mb-6" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                            <div className="space-y-5">
                                <GlassSkeleton variant="text" className="w-40 h-3 mb-4" />
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex justify-between items-center glass-panel p-4 rounded-2xl border-r-4 border-rose-500/40 min-h-[72px]">
                                        <div>
                                            <GlassSkeleton variant="text" className="w-20 h-4 mb-1" />
                                            <GlassSkeleton variant="text" className="w-28 h-3" />
                                        </div>
                                        <div>
                                            <GlassSkeleton variant="text" className="w-12 h-4" />
                                            <GlassSkeleton variant="text" className="w-20 h-1.5 mt-1.5" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-5">
                                <GlassSkeleton variant="text" className="w-36 h-3 mb-4" />
                                {[1, 2].map((i) => (
                                    <div key={i} className="flex justify-between items-center glass-panel p-4 rounded-2xl border-r-4 border-[var(--accent)]/40 min-h-[72px]">
                                        <div>
                                            <GlassSkeleton variant="text" className="w-16 h-4 mb-1" />
                                            <GlassSkeleton variant="text" className="w-20 h-3" />
                                        </div>
                                        <GlassSkeleton variant="text" className="w-20 h-6 rounded-full" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Transparency & Audit - spans 4 columns */}
                    <div className="lg:col-span-4 glass-card p-6 rounded-2xl border border-white/10 min-h-[320px]">
                        <GlassSkeleton variant="text" className="w-40 h-5 mb-6" />
                        <div className="space-y-6 pt-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-start gap-4 border-r-2 border-[var(--primary)]/20 pr-4">
                                    <div className="flex-1">
                                        <GlassSkeleton variant="text" className="w-24 h-4 mb-1" />
                                        <GlassSkeleton variant="text" className="w-20 h-3" />
                                    </div>
                                    <GlassSkeleton variant="text" className="w-12 h-4" />
                                </div>
                            ))}
                            <div className="pt-4 border-t border-[var(--glass-border)]">
                                <GlassSkeleton variant="text" className="w-32 h-3 mx-auto" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sentinel Dashboard Skeleton */}
                <div className="mb-10 glass-card p-6 rounded-2xl border border-white/10 min-h-[200px]">
                    <div className="flex items-center gap-3 mb-6">
                        <GlassSkeleton variant="circle" className="w-10 h-10" />
                        <GlassSkeleton variant="text" className="w-48 h-6" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="p-4 rounded-xl bg-white/5">
                                <GlassSkeleton variant="text" className="w-24 h-4 mb-3" />
                                <GlassSkeleton variant="text" className="w-32 h-8 mb-2" />
                                <GlassSkeleton variant="text" className="w-full h-2" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Organization Hub Grid - 4 columns, 8 items */}
                <section className="mb-10">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="w-2 h-8 bg-[var(--primary)] rounded-full"></span>
                        <GlassSkeleton variant="text" className="w-64 h-6" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                            <div key={i} className="glass-card p-6 rounded-2xl border border-white/10 min-h-[100px]">
                                <GlassSkeleton variant="text" className="w-24 h-5 mb-2" />
                                <GlassSkeleton variant="text" className="w-40 h-3" />
                            </div>
                        ))}
                    </div>
                </section>

                {/* Academic Performance Monitoring - 3 columns */}
                <section className="mb-10">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="glass-card p-6 rounded-2xl border border-white/10 min-h-[280px]">
                                <GlassSkeleton variant="text" className="w-40 h-5 mb-6" />
                                <div className="space-y-6 pt-4">
                                    {[1, 2, 3].map((j) => (
                                        <div key={j}>
                                            <div className="flex justify-between text-[10px] mb-2">
                                                <GlassSkeleton variant="text" className="w-20 h-3" />
                                                <GlassSkeleton variant="text" className="w-8 h-3" />
                                            </div>
                                            <GlassSkeleton variant="text" className="w-full h-2" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </main>
    );
}
