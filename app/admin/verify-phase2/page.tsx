"use client";

import { useEffect, useState, useCallback, startTransition } from "react";
import { verifyPhase2Data } from "@/app/_actions/verify_phase2";
import { ShieldCheck, RefreshCw, Activity } from "lucide-react";
import { Card } from "@/components/ui/Card";

type VerifyReport = Awaited<ReturnType<typeof verifyPhase2Data>>;

export default function VerifyPhase2Page() {
    const [report, setReport] = useState<VerifyReport | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const runCheck = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await verifyPhase2Data();
            setReport(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        startTransition(async () => { await runCheck(); });
    }, [runCheck]);

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-12 font-sans" dir="rtl">
            <div className="max-w-4xl mx-auto space-y-8">
                <header className="flex items-center justify-between border-b border-white/10 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
                            <ShieldCheck size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">System Integrity Check</h1>
                            <p className="text-zinc-400">Phase 2.2 Validation Gate</p>
                        </div>
                    </div>
                    <button
                        onClick={runCheck}
                        disabled={isLoading}
                        className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition flex items-center gap-2"
                    >
                        <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
                        <span>Re-run Checks</span>
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Summary Card */}
                    <Card className={`p-8 border-l-4 ${report?.errors === 0 ? 'border-l-emerald-500 bg-emerald-950/10' : 'border-l-rose-500 bg-rose-950/10'}`}>
                        <h2 className="text-xl font-bold mb-2">Diagnostic Result</h2>
                        <div className="text-4xl font-black tracking-tighter">
                            {isLoading ? "Analyzing..." : report?.summary}
                        </div>
                        <div className="mt-4 text-sm opacity-70">
                            {report?.errors === 0
                                ? "All systems nominal. Ready for cleanup."
                                : `${report?.errors} critical issues detected.`
                            }
                        </div>
                    </Card>

                    {/* Instruction Card */}
                    <Card className="p-8 bg-zinc-900/50 border-white/5">
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                            <Activity className="text-indigo-400" />
                            Manual Verifications
                        </h2>
                        <ul className="space-y-3 text-sm text-zinc-400 list-disc list-inside">
                            <li>Check <strong>RoleSwitcher</strong> UI label (No &apos;Admin&apos;).</li>
                            <li>Generate a new Invite.</li>
                            <li>Join via incognito window.</li>
                            <li>Check Audit Log below for activity.</li>
                        </ul>
                    </Card>
                </div>

                {/* Detailed Checks */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-zinc-500 uppercase tracking-widest text-xs">Integrity Matrix</h3>
                    {report?.checks.map((check: VerifyReport["checks"][number], i: number) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5">
                            <div className="flex items-center gap-4">
                                <div className={`w-2 h-2 rounded-full ${check.status === 'PASS' ? 'bg-emerald-500' : check.status === 'FAIL' ? 'bg-rose-500' : 'bg-[hsl(var(--gold))]'}`} />
                                <div>
                                    <div className="font-bold">{check.name}</div>
                                    <div className="text-xs text-zinc-500">Expected: {String(check.expected ?? '')}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`font-mono font-bold ${check.status === 'PASS' ? 'text-emerald-400' : check.status === 'FAIL' ? 'text-rose-400' : 'text-[hsl(var(--gold))]'}`}>
                                    {String(check.actual ?? '')}
                                </div>
                                <div className="text-[10px] uppercase font-bold tracking-wider opacity-50">{check.status}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
