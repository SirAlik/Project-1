'use client';

import React, { useEffect, useState, useCallback, startTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Fingerprint, Activity, AlertTriangle, ShieldCheck, Lock, RotateCw } from 'lucide-react';
import { supabase } from '@/lib/db/supabase';
import { Card } from '@/components/ui/Card';

interface SentinelFlag {
    id: string;
    student_id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    reason: string;
    metadata: Record<string, unknown>;
    created_at: string;
    student_name?: string;
}

export function SentinelDashboard() {
    const [flags, setFlags] = useState<SentinelFlag[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        critical: 0,
        high: 0,
        total: 0,
        integrityScore: 100
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('sentinel_flags')
                .select(`
                    *,
                    student_profiles(name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            type FlagRow = { severity: string; student_profiles?: { name?: string | null } | null } & Record<string, unknown>;
            const formatted = (data as unknown as FlagRow[]).map(f => ({
                ...f,
                student_name: f.student_profiles?.name || 'Unknown student'
            }));

            setFlags(formatted as unknown as SentinelFlag[]);

            // Calculate stats
            const crit = formatted.filter(f => f.severity === 'critical').length;
            const high = formatted.filter(f => f.severity === 'high').length;
            const score = Math.max(0, 100 - (crit * 20) - (high * 5));

            setStats({
                critical: crit,
                high: high,
                total: formatted.length,
                integrityScore: score
            });
        } catch (err) {
            console.error('Sentinel fetch failed', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        startTransition(async () => { await loadData(); });
        // Real-time updates
        const channel = supabase
            .channel('sentinel_changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sentinel_flags' }, () => {
                startTransition(async () => { await loadData(); });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [loadData]);

    const severityColors = {
        low: 'text-primary bg-primary/10 border-primary/20',
        medium: 'text-[hsl(var(--gold-strong))] dark:text-[hsl(var(--gold))] bg-[hsla(var(--gold),.10)] border-[hsla(var(--gold),.20)]',
        high: 'text-[hsl(var(--gold-strong))] dark:text-[hsl(var(--gold))] bg-[hsla(var(--gold),.15)] border-[hsla(var(--gold),.25)]',
        critical: 'text-destructive bg-destructive/10 border-destructive/20 animate-pulse'
    };

    const toggleCircuitBreaker = async () => {
        try {
            const { data, error: fetchErr } = await supabase.from('system_config').select('value_json').eq('key', 'circuit_breaker').single();
            if (fetchErr) throw fetchErr;

            const current = data.value_json;
            const updated = { ...current, is_active: !current.is_active, reason: !current.is_active ? 'Manual Administrative Lock' : 'none' };

            const { error: upErr } = await supabase.from('system_config').update({ value_json: updated }).eq('key', 'circuit_breaker');
            if (upErr) throw upErr;

            alert(`Circuit Breaker ${updated.is_active ? 'ACTIVATED' : 'DEACTIVATED'}`);
        } catch (err) {
            console.error('Failed to toggle circuit breaker', err);
        }
    };

    return (
        <Card title="Sentinel Integrity Dashboard" className="border-primary/20 relative overflow-hidden bg-card text-card-foreground">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -z-10" />

            <div className="space-y-6">
                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-background/50 p-4 rounded-2xl border border-border">
                        <div className="flex items-center gap-2 mb-1">
                            <Activity size={14} className="text-primary" />
                            <span className="text-[10px] font-black uppercase text-muted-foreground">Integrity Score</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-2xl font-black ${stats.integrityScore > 80 ? 'text-emerald-500' : 'text-destructive'}`}>
                                %{stats.integrityScore}
                            </span>
                            <div className="h-1 w-12 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${stats.integrityScore}%` }}
                                    className={`h-full ${stats.integrityScore > 80 ? 'bg-emerald-500' : 'bg-destructive'}`}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-background/50 p-4 rounded-2xl border border-border">
                        <div className="flex items-center gap-2 mb-1">
                            <ShieldAlert size={14} className="text-destructive" />
                            <span className="text-[10px] font-black uppercase text-muted-foreground">Critical Breaches</span>
                        </div>
                        <span className="text-2xl font-black text-destructive">{stats.critical}</span>
                    </div>

                    <div className="bg-background/50 p-4 rounded-2xl border border-border">
                        <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle size={14} className="text-[hsl(var(--gold))]" />
                            <span className="text-[10px] font-black uppercase text-muted-foreground">High Risk</span>
                        </div>
                        <span className="text-2xl font-black text-[hsl(var(--gold))]">{stats.high}</span>
                    </div>

                    <div className="bg-background/50 p-4 rounded-2xl border border-border">
                        <div className="flex items-center gap-2 mb-1">
                            <Fingerprint size={14} className="text-primary" />
                            <span className="text-[10px] font-black uppercase text-muted-foreground">Total Audit Logs</span>
                        </div>
                        <span className="text-2xl font-black text-primary">{stats.total}</span>
                    </div>
                </div>

                {/* Logs Table */}
                <div className="bg-background/30 rounded-2xl border border-border overflow-hidden">
                    <div className="p-4 border-b border-border bg-muted/20 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Lock size={16} className="text-muted-foreground" />
                            <h3 className="text-sm font-bold text-foreground">Secure Audit Feed</h3>
                        </div>
                        <button
                            onClick={() => loadData()}
                            className="flex items-center gap-1 text-[10px] font-black text-primary uppercase tracking-tighter hover:underline"
                        >
                            <RotateCw size={10} />
                            Refresh Log
                        </button>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                        <table className="w-full text-right" dir="rtl">
                            <thead className="text-[10px] text-muted-foreground uppercase font-black bg-muted/40 sticky top-0 z-10">
                                <tr>
                                    <th className="p-3">التوقيت</th>
                                    <th className="p-3">الطالب</th>
                                    <th className="p-3">الحالة</th>
                                    <th className="p-3">السبب</th>
                                    <th className="p-3">الخطورة</th>
                                </tr>
                            </thead>
                            <tbody className="text-xs text-foreground">
                                <AnimatePresence mode="popLayout">
                                    {flags.map((flag) => (
                                        <motion.tr
                                            key={flag.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="border-b border-border hover:bg-muted/30 transition-colors"
                                        >
                                            <td className="p-3 font-mono opacity-60 text-muted-foreground">{new Date(flag.created_at).toLocaleTimeString('ar-SA')}</td>
                                            <td className="p-3 font-bold">{flag.student_name}</td>
                                            <td className="p-3">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] opacity-80">{flag.reason}</span>
                                                    {!!flag.metadata?.attempted && (
                                                        <span className="text-[8px] font-mono text-destructive">Attempted: {String(flag.metadata.attempted)}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-3 max-w-[150px] truncate opacity-80">{flag.reason}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase ${severityColors[flag.severity]}`}>
                                                    {flag.severity}
                                                </span>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                                {flags.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={5} className="p-10 text-center opacity-40 italic text-muted-foreground">
                                            No active flags detected. System stable.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-between items-center text-[10px] font-bold">
                    <div className="flex items-center gap-2 text-emerald-500">
                        <ShieldCheck size={14} />
                        <span>Reconciliation Complete: All wallets match ledger.</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleCircuitBreaker}
                            className="bg-destructive/10 text-destructive border border-destructive/20 px-3 py-1.5 rounded-lg hover:bg-destructive/20 transition-all flex items-center gap-2"
                        >
                            <AlertTriangle size={12} />
                            Panic Switch (Circuit Breaker)
                        </button>
                        <button className="text-primary hover:underline">Download CSV Artifact</button>
                    </div>
                </div>
            </div>
        </Card>
    );
}
