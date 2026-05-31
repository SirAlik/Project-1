'use client';

import { GlassSkeleton } from '@/components/ui/GlassSkeleton';

/**
 * Student Affairs Dashboard Loading Skeleton
 * Matches the exact tabbed layout to eliminate CLS
 * Layout: Sticky Header → Rotating Stats Hero → 4-col KPI → Lateness Queue + Charts → Risk Radar + Action Stream → Floating Nav
 */
export default function StudentAffairsDashboardLoading() {
    return (
        <main className="min-h-screen pb-32 text-[var(--text)]" dir="rtl">

            {/* Futuristic Sticky Header - matches glass-panel styling */}
            <header className="sticky top-0 z-40 glass-panel border-b px-8 py-5 min-h-[76px]">
                <div className="flex justify-between items-center max-w-7xl mx-auto">
                    <div className="flex items-center gap-5">
                        <div className="relative w-12 h-12 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-2xl flex items-center justify-center shadow-lg">
                            <GlassSkeleton variant="circle" className="w-6 h-6" />
                        </div>
                        <div>
                            <GlassSkeleton variant="text" className="w-32 h-6 mb-1" />
                            <GlassSkeleton variant="text" className="w-56 h-3" />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <GlassSkeleton variant="card" className="w-36 h-10 rounded-xl" />
                        <div className="flex glass-panel p-1 rounded-2xl">
                            <GlassSkeleton variant="card" className="w-24 h-10 rounded-xl" />
                            <GlassSkeleton variant="card" className="w-28 h-10 rounded-xl" />
                        </div>
                        <GlassSkeleton variant="circle" className="w-11 h-11 rounded-2xl" />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto p-8">
                <div className="glass-panel rounded-[2.5rem] p-10 min-h-[600px] relative overflow-hidden">
                    <div className="relative z-10 space-y-8">

                        {/* Rotating Stats Hero - matches rounded-[3rem] p-10 */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500/10 via-zinc-900 to-zinc-950 border border-indigo-500/20 rounded-[3rem] p-10 min-h-[180px]">
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <GlassSkeleton variant="circle" className="w-5 h-5" />
                                        <GlassSkeleton variant="text" className="w-32 h-3" />
                                    </div>
                                    <GlassSkeleton variant="text" className="w-40 h-4 mb-2" />
                                    <GlassSkeleton variant="text" className="w-24 h-14" />
                                </div>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4].map((i) => (
                                        <GlassSkeleton key={i} variant="circle" className="w-2 h-2" />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* KPI Cards - 4 columns with rounded-[2.5rem] */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { color: 'from-indigo-500/10 to-indigo-500/5 border-indigo-500/20' },
                                { color: 'from-rose-500/10 to-rose-500/5 border-rose-500/20' },
                                { color: 'from-[hsla(var(--gold),.15)] to-[hsla(var(--gold),.05)] border-[hsla(var(--gold),.25)]' },
                                { color: 'from-indigo-500/10 to-indigo-500/5 border-indigo-500/20' },
                            ].map((item, i) => (
                                <div key={i} className={`bg-gradient-to-br ${item.color} border p-8 rounded-[2.5rem] min-h-[140px]`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-zinc-950/50 rounded-2xl border border-white/5">
                                            <GlassSkeleton variant="circle" className="w-5 h-5" />
                                        </div>
                                    </div>
                                    <GlassSkeleton variant="text" className="w-32 h-3 mb-1" />
                                    <GlassSkeleton variant="text" className="w-16 h-8" />
                                </div>
                            ))}
                        </div>

                        {/* Lateness Queue + Discipline Trends - 1+2 columns */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Lateness Queue */}
                            <div className="lg:col-span-1 bg-zinc-900/50 border border-[hsla(var(--gold),.25)] rounded-[2.5rem] p-8 min-h-[380px]">
                                <div className="flex items-center gap-2 mb-6">
                                    <GlassSkeleton variant="circle" className="w-4 h-4" />
                                    <GlassSkeleton variant="text" className="w-32 h-4" />
                                </div>
                                <div className="space-y-3 max-h-72">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-zinc-950/70 border border-zinc-800 rounded-2xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-[hsla(var(--gold),.15)] rounded-xl flex items-center justify-center">
                                                    <GlassSkeleton variant="circle" className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <GlassSkeleton variant="text" className="w-24 h-4 mb-1" />
                                                    <GlassSkeleton variant="text" className="w-20 h-3" />
                                                </div>
                                            </div>
                                            <GlassSkeleton variant="text" className="w-12 h-6 rounded-lg" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Discipline Trends Chart */}
                            <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] p-8 min-h-[380px]">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <GlassSkeleton variant="circle" className="w-4 h-4" />
                                        <GlassSkeleton variant="text" className="w-32 h-4" />
                                    </div>
                                    <GlassSkeleton variant="circle" className="w-8 h-8" />
                                </div>
                                <div className="h-64 flex items-end justify-around gap-4 pt-8">
                                    {[70, 40, 55, 30].map((h, i) => (
                                        <div key={i} className="flex flex-col items-center gap-2 flex-1">
                                            <GlassSkeleton variant="card" className={`w-full rounded-t-lg ${h === 70 ? 'h-[70%]' : h === 40 ? 'h-[40%]' : h === 55 ? 'h-[55%]' : 'h-[30%]'}`} />
                                            <GlassSkeleton variant="text" className="w-12 h-3" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Risk Radar + Action Stream - 2 columns */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Risk Radar */}
                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] p-8 min-h-[300px]">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <GlassSkeleton variant="circle" className="w-4 h-4" />
                                        <GlassSkeleton variant="text" className="w-24 h-4" />
                                    </div>
                                    <GlassSkeleton variant="circle" className="w-8 h-8" />
                                </div>
                                <div className="space-y-4">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-zinc-950/50 border border-zinc-800/50 rounded-2xl">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center">
                                                    <GlassSkeleton variant="text" className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <GlassSkeleton variant="text" className="w-24 h-4 mb-1" />
                                                    <GlassSkeleton variant="text" className="w-16 h-3" />
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <GlassSkeleton variant="text" className="w-16 h-6 rounded-lg" />
                                                <GlassSkeleton variant="text" className="w-16 h-6 rounded-lg" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Action Stream */}
                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] p-8 min-h-[300px]">
                                <div className="flex items-center gap-2 mb-6">
                                    <GlassSkeleton variant="circle" className="w-4 h-4" />
                                    <GlassSkeleton variant="text" className="w-28 h-4" />
                                </div>
                                <div className="space-y-4">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-zinc-950/50 border border-zinc-800/50 rounded-2xl">
                                            <GlassSkeleton variant="text" className="w-40 h-4" />
                                            <div className="flex items-center gap-2">
                                                <GlassSkeleton variant="text" className="w-8 h-6 rounded-lg" />
                                                <GlassSkeleton variant="circle" className="w-1.5 h-1.5" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Navigator Skeleton */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
                <nav className="glass-panel px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 border border-[var(--glass-border)]">
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                        <GlassSkeleton
                            key={i}
                            variant="circle"
                            className={`w-14 h-14 ${i === 1 ? 'bg-[var(--primary)]/20' : ''}`}
                        />
                    ))}
                </nav>
            </div>
        </main>
    );
}
