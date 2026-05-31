"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ChartContainer } from "@/components/ui/chart-container";
import { Trophy, Book, User, TrendingDown, AlertCircle, CheckCircle, Clock } from "lucide-react";

interface NameCount { name: string; count: number; }
interface TitleCount { title: string; count: number; }

interface LrcStats {
    returnRate: number;
    activeRate: number;
    overdueRate: number;
    topStudents: NameCount[];
    topBooks: TitleCount[];
    topAuthors: NameCount[];
    rankedClasses: NameCount[];
    bottomClasses: NameCount[];
    totalBooks: number;
    activeLoansCount: number;
    returnedCount: number;
    overdueCount: number;
    visitsToday: number;
}

interface LrcDashboardProps {
    stats: LrcStats;
    onGenerateCertificate: (studentName: string) => void;
}

export function LrcDashboard({ stats, onGenerateCertificate }: LrcDashboardProps) {
    if (!stats) return null;

    const COLORS = ["hsl(var(--gold))", "#6366f1", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"];

    return (
        <div className="space-y-6">
            {/* Top Row: Quick Analysis Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            نسبة الكتب المعادة
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-400">{stats.returnRate}%</div>
                        <div className="w-full bg-zinc-800 h-2 rounded-full mt-2 overflow-hidden">
                            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${stats.returnRate}%` }} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-indigo-500" />
                            نسبة الكتب قيد الإعارة
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-indigo-400">{stats.activeRate}%</div>
                        <div className="w-full bg-zinc-800 h-2 rounded-full mt-2 overflow-hidden">
                            <div className="bg-indigo-500 h-full transition-all" style={{ width: `${stats.activeRate}%` }} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-500" />
                            تنبيه التأخير (+7 أيام)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rose-400">{stats.overdueRate}%</div>
                        <div className="w-full bg-zinc-800 h-2 rounded-full mt-2 overflow-hidden">
                            <div className="bg-rose-500 h-full transition-all" style={{ width: `${stats.overdueRate}%` }} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top 10 Students */}
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-[hsl(var(--gold))]" />
                            أكثر 10 طلاب استعارة
                        </CardTitle>
                        {stats.topStudents?.[0] && (
                            <button
                                onClick={() => onGenerateCertificate(stats.topStudents[0].name)}
                                className="text-xs px-3 py-1 bg-[hsl(var(--gold),.10)] hover:bg-[hsl(var(--gold),.20)] text-[hsl(var(--gold))] rounded-lg border border-[hsl(var(--gold),.20)] transition-colors"
                            >
                                إصدار شهادة للأول
                            </button>
                        )}
                    </CardHeader>
                    <CardContent>
                        <ChartContainer height={300}>
                            <BarChart data={stats.topStudents} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                                    itemStyle={{ color: 'hsl(var(--gold))' }}
                                />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                    {stats.topStudents?.map((entry: NameCount, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                {/* Top 10 Books */}
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Book className="w-5 h-5 text-indigo-500" />
                            أكثر 10 كتب استعارة
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer height={300}>
                            <BarChart data={stats.topBooks} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="title" type="category" width={150} tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                                    itemStyle={{ color: '#6366f1' }}
                                />
                                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Authors */}
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <User className="w-5 h-5 text-emerald-500" />
                            أكثر 10 مؤلفين طلباً
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {stats.topAuthors?.map((author: NameCount, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/50">
                                    <span className="text-sm text-zinc-300">{author.name}</span>
                                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">{author.count}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Class Ranking */}
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold">ترتيب الفصول (الأكثر استعارة)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {stats.rankedClasses?.map((cls: NameCount, idx: number) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${idx < 3 ? 'bg-[hsl(var(--gold))] text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>{cls.name}</span>
                                            <span className="text-zinc-500">{cls.count}</span>
                                        </div>
                                        <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                            <div
                                                className="bg-indigo-500 h-full transition-all"
                                                style={{ width: `${(cls.count / (stats.rankedClasses[0]?.count || 1)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Bottom Classes Area */}
                <Card className="bg-zinc-900 border-zinc-800 border-dashed border-rose-500/20">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold text-rose-400 flex items-center gap-2">
                            <TrendingDown className="w-5 h-5" />
                            فصول تحتاج تشجيع
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-zinc-500 mb-4">هذه الفصول لديها أقل معدلات استعارة هذا الشهر.</p>
                        <div className="space-y-3">
                            {stats.bottomClasses?.map((cls: NameCount, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-rose-500/5 border border-rose-500/10">
                                    <span className="text-sm font-medium text-rose-200">{cls.name}</span>
                                    <span className="text-xs text-rose-500/70">{cls.count} إعارات</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
