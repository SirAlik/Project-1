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

    const COLORS = ["#0D9488", "#3B6FE0", "#10b981", "#0891B2", "#0EA5E9", "#14B8A6"];

    return (
        <div className="space-y-6">
            {/* Top Row: Quick Analysis Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-surface-soft border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            نسبة الكتب المعادة
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">{stats.returnRate}%</div>
                        <div className="w-full bg-muted h-2 rounded-full mt-2 overflow-hidden">
                            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${stats.returnRate}%` }} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-surface-soft border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Clock className="w-4 h-4 text-indigo-500" />
                            نسبة الكتب قيد الإعارة
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-indigo-600">{stats.activeRate}%</div>
                        <div className="w-full bg-muted h-2 rounded-full mt-2 overflow-hidden">
                            <div className="bg-indigo-500 h-full transition-all" style={{ width: `${stats.activeRate}%` }} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-surface-soft border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-500" />
                            تنبيه التأخير (+7 أيام)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rose-600">{stats.overdueRate}%</div>
                        <div className="w-full bg-muted h-2 rounded-full mt-2 overflow-hidden">
                            <div className="bg-rose-500 h-full transition-all" style={{ width: `${stats.overdueRate}%` }} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top 10 Students */}
                <Card className="bg-surface-soft border-border">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-primary" />
                            أكثر 10 طلاب استعارة
                        </CardTitle>
                        {stats.topStudents?.[0] && (
                            <button
                                onClick={() => onGenerateCertificate(stats.topStudents[0].name)}
                                className="text-xs px-3 py-1 bg-primary/10 hover:bg-primary/10 text-primary rounded-lg border border-primary/20 transition-colors"
                            >
                                إصدار شهادة للأول
                            </button>
                        )}
                    </CardHeader>
                    <CardContent>
                        <ChartContainer height={300}>
                            <BarChart data={stats.topStudents} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#E8E1D4" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#6B7280', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E1D4', borderRadius: '12px', color: '#111827' }}
                                    itemStyle={{ color: '#0D9488' }}
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
                <Card className="bg-surface-soft border-border">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Book className="w-5 h-5 text-indigo-500" />
                            أكثر 10 كتب استعارة
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer height={300}>
                            <BarChart data={stats.topBooks} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#E8E1D4" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="title" type="category" width={150} tick={{ fill: '#6B7280', fontSize: 11 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E1D4', borderRadius: '12px', color: '#111827' }}
                                    itemStyle={{ color: '#3B6FE0' }}
                                />
                                <Bar dataKey="count" fill="#3B6FE0" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Authors */}
                <Card className="bg-surface-soft border-border">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <User className="w-5 h-5 text-emerald-500" />
                            أكثر 10 مؤلفين طلباً
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {stats.topAuthors?.map((author: NameCount, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-surface-soft">
                                    <span className="text-sm text-foreground">{author.name}</span>
                                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-600">{author.count}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Class Ranking */}
                <Card className="bg-surface-soft border-border">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold">ترتيب الفصول (الأكثر استعارة)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {stats.rankedClasses?.map((cls: NameCount, idx: number) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${idx < 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>{cls.name}</span>
                                            <span className="text-muted-foreground">{cls.count}</span>
                                        </div>
                                        <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
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
                <Card className="bg-surface-soft border-border border-dashed border-rose-200">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold text-rose-600 flex items-center gap-2">
                            <TrendingDown className="w-5 h-5" />
                            فصول تحتاج تشجيع
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground mb-4">هذه الفصول لديها أقل معدلات استعارة هذا الشهر.</p>
                        <div className="space-y-3">
                            {stats.bottomClasses?.map((cls: NameCount, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-rose-50 border border-rose-200">
                                    <span className="text-sm font-medium text-rose-700">{cls.name}</span>
                                    <span className="text-xs text-rose-600/70">{cls.count} إعارات</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
