"use client";

import { GlassSkeleton } from "@/components/ui/GlassSkeleton";

/**
 * System Owner Dashboard Loading Skeleton
 * Matches the exact grid layout to eliminate CLS (Cumulative Layout Shift)
 * Layout: Context Banner → Header → 4-col KPI → System Health Grid → Alerts → Schools Table
 */
export default function SystemOwnerDashboardLoading() {
    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-6 lg:p-10" dir="rtl">
            <div className="max-w-7xl mx-auto space-y-10">
                {/* Context Banner Skeleton - matches IdentityStrip */}
                <div className="p-4 rounded-2xl bg-[hsla(var(--gold),.10)] border border-[hsla(var(--gold),.20)] flex items-center justify-between min-h-[56px]">
                    <div className="flex items-center gap-3">
                        <GlassSkeleton variant="circle" className="w-5 h-5" />
                        <GlassSkeleton variant="text" className="w-48 h-4" />
                        <GlassSkeleton variant="text" className="w-24 h-5 rounded-full" />
                    </div>
                    <GlassSkeleton variant="text" className="w-24 h-4" />
                </div>

                {/* Header Skeleton */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 min-h-[72px]">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-[hsla(var(--gold),.10)] flex items-center justify-center">
                                <GlassSkeleton variant="circle" className="w-5 h-5" />
                            </div>
                            <GlassSkeleton variant="text" className="w-40 h-8" />
                        </div>
                        <GlassSkeleton variant="text" className="w-64 h-4" />
                    </div>
                    <GlassSkeleton variant="card" className="w-48 h-12 rounded-xl" />
                </header>

                {/* KPI Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="glass-card p-6 rounded-[2rem] border border-slate-200 relative overflow-hidden min-h-[140px]"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 rounded-lg bg-slate-100">
                                    <GlassSkeleton variant="circle" className="w-6 h-6" />
                                </div>
                            </div>
                            <GlassSkeleton variant="text" className="w-20 h-8 mb-2" />
                            <GlassSkeleton variant="text" className="w-28 h-3" />
                        </div>
                    ))}
                </div>

                {/* System Health & Usage Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* System Health */}
                    <div className="glass-card p-6 rounded-2xl border border-slate-200 min-h-[280px]">
                        <GlassSkeleton variant="text" className="w-48 h-5 mb-4" />
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="p-4 rounded-xl bg-slate-100 border border-slate-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <GlassSkeleton variant="circle" className="w-4 h-4" />
                                        <GlassSkeleton variant="text" className="w-16 h-3" />
                                    </div>
                                    <GlassSkeleton variant="text" className="w-20 h-6" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Usage Chart */}
                    <div className="glass-card p-6 rounded-2xl border border-slate-200 lg:col-span-2 min-h-[280px]">
                        <GlassSkeleton variant="text" className="w-40 h-5 mb-4" />
                        <div className="h-[200px] mt-4 flex items-center justify-center rounded-xl bg-slate-100 border border-dashed border-slate-300">
                            <GlassSkeleton variant="circle" className="w-10 h-10" />
                        </div>
                    </div>
                </div>

                {/* Alerts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className={`glass-card p-6 rounded-2xl border border-slate-200 min-h-[160px] ${i === 1 ? "border-l-4 border-l-[hsl(var(--gold))]" : ""
                                }`}
                        >
                            <GlassSkeleton variant="text" className="w-32 h-5 mb-4" />
                            <div className="space-y-4 mt-2">
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-100">
                                    <GlassSkeleton variant="circle" className="w-4 h-4 mt-1" />
                                    <div className="flex-1">
                                        <GlassSkeleton variant="text" className="w-full h-4 mb-1" />
                                        <GlassSkeleton variant="text" className="w-3/4 h-3" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Schools Table */}
                <div className="glass-card rounded-2xl border border-slate-200 overflow-hidden min-h-[400px]">
                    <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <GlassSkeleton variant="circle" className="w-5 h-5" />
                            </div>
                            <div>
                                <GlassSkeleton variant="text" className="w-32 h-5 mb-1" />
                                <GlassSkeleton variant="text" className="w-20 h-3" />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-slate-100">
                                <tr>
                                    {["اسم المدرسة", "المعرف", "النوع", "تاريخ التسجيل", "الحالة", "إجراءات"].map((h, i) => (
                                        <th key={i} className="px-6 py-4">
                                            <GlassSkeleton variant="text" className="w-20 h-3" />
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-white/5">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <GlassSkeleton variant="text" className="w-32 h-4" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <GlassSkeleton variant="text" className="w-20 h-4" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <GlassSkeleton variant="text" className="w-12 h-4" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <GlassSkeleton variant="text" className="w-24 h-4" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <GlassSkeleton variant="text" className="w-12 h-5 rounded-full" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <GlassSkeleton variant="circle" className="w-7 h-7" />
                                                <GlassSkeleton variant="circle" className="w-7 h-7" />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}