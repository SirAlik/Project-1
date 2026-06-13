'use client';

/**
 * Omni-Inspector Panel - DEV ONLY
 * ================================
 * Floating panel that explains authorization decisions, DB operations, and role switches.
 * Toggle with Ctrl+Alt+P.
 * 
 * SECURITY: This component is DEV-ONLY and tree-shaken in production.
 * No PII displayed - only role/action metadata.
 */

import React, { useState, useEffect, useSyncExternalStore, useCallback, startTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Shield, Database, RefreshCw, Download,
    XCircle, Clock, Layers, Eye, EyeOff
} from 'lucide-react';
import {
    getSnapshot,
    subscribe,
    clearTraces,
    exportTracesJson,
    getLastAuthDecision,
    getLastRoleSwitchTrace,
    getRecentDbOperations,
} from '@/lib/dev/inspector-store';
import type {
    TraceEntry,
    AuthDecision,
    DbOperation,
    RoleSwitchTrace,
} from '@/lib/dev/permissions-inspector';

// ============================================================
// COMPONENT
// ============================================================

export function OmniInspector() {
    // Only render in development
    if (process.env.NODE_ENV !== 'development') {
        return null;
    }

    return <OmniInspectorInner />;
}

function OmniInspectorInner() {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'context' | 'decisions' | 'db' | 'timeline'>('context');

    const [mounted, setMounted] = useState(false);
    useEffect(() => { startTransition(() => setMounted(true)); }, []);

    // Subscribe to trace store
    const traces = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    // Keyboard shortcut: Ctrl+Alt+P
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'p') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleExport = useCallback(() => {
        const json = exportTracesJson();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `omni-inspector-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, []);

    const lastAuth = getLastAuthDecision();
    const lastSwitch = getLastRoleSwitchTrace();
    const recentDb = getRecentDbOperations(5);

    if (!mounted) return null;

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-4 right-4 z-[9998] w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                title="Omni-Inspector (Ctrl+Alt+P)"
                aria-label="Toggle Omni-Inspector"
            >
                {isOpen ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>

            {/* Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="fixed bottom-16 right-4 z-[9999] w-[420px] max-h-[70vh] bg-slate-900/95 border border-cyan-500/30 rounded-2xl shadow-2xl backdrop-blur-lg overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-r from-cyan-500/10 to-teal-500/10">
                            <div className="flex items-center gap-2">
                                <Shield size={18} className="text-cyan-400" />
                                <span className="font-bold text-sm text-white">Omni-Inspector</span>
                                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded-full">DEV</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handleExport}
                                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                    title="Export Traces"
                                    aria-label="Export traces"
                                >
                                    <Download size={14} className="text-white/60" />
                                </button>
                                <button
                                    onClick={clearTraces}
                                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                    title="Clear Traces"
                                    aria-label="Clear traces"
                                >
                                    <RefreshCw size={14} className="text-white/60" />
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                    aria-label="Close inspector"
                                >
                                    <X size={14} className="text-white/60" />
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-white/10">
                            {(['context', 'decisions', 'db', 'timeline'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 py-2 text-xs font-medium transition-colors ${activeTab === tab
                                        ? 'text-cyan-400 border-b-2 border-cyan-400'
                                        : 'text-white/50 hover:text-white/80'
                                        }`}
                                >
                                    {tab === 'context' && 'Context'}
                                    {tab === 'decisions' && 'Decisions'}
                                    {tab === 'db' && 'DB Ops'}
                                    {tab === 'timeline' && 'Timeline'}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {activeTab === 'context' && (
                                <ContextTab lastSwitch={lastSwitch} />
                            )}
                            {activeTab === 'decisions' && (
                                <DecisionsTab lastAuth={lastAuth} lastSwitch={lastSwitch} />
                            )}
                            {activeTab === 'db' && (
                                <DbOpsTab operations={recentDb} />
                            )}
                            {activeTab === 'timeline' && (
                                <TimelineTab traces={traces} />
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-2 border-t border-white/10 text-[10px] text-white/30 text-center">
                            {traces.length} traces captured • Ctrl+Alt+P to toggle
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

// ============================================================
// TAB COMPONENTS
// ============================================================

function ContextTab({ lastSwitch }: { lastSwitch: RoleSwitchTrace | null }) {
    return (
        <div className="space-y-3">
            <SectionHeader icon={<Layers size={14} />} title="Active Context" />

            {lastSwitch ? (
                <div className="space-y-2">
                    <InfoRow label="Current Role" value={lastSwitch.toRole} />
                    <InfoRow label="School ID" value={lastSwitch.toSchoolId || 'N/A (Global)'} />
                    <InfoRow label="Last Switch" value={new Date(lastSwitch.timestamp).toLocaleTimeString()} />
                    <InfoRow
                        label="Status"
                        value={lastSwitch.result}
                        status={lastSwitch.result === 'success' ? 'success' : 'error'}
                    />
                </div>
            ) : (
                <div className="text-white/40 text-xs text-center py-4">
                    No role switch recorded yet
                </div>
            )}
        </div>
    );
}

function DecisionsTab({
    lastAuth,
    lastSwitch
}: {
    lastAuth: AuthDecision | null;
    lastSwitch: RoleSwitchTrace | null;
}) {
    return (
        <div className="space-y-4">
            {/* Last Auth Decision */}
            <div className="space-y-3">
                <SectionHeader icon={<Shield size={14} />} title="Last Auth Decision" />

                {lastAuth ? (
                    <div className="space-y-2">
                        <InfoRow label="Action" value={lastAuth.actionName} />
                        <InfoRow
                            label="Decision"
                            value={lastAuth.decision}
                            status={lastAuth.decision === 'allowed' ? 'success' : 'error'}
                        />
                        <InfoRow label="Required Roles" value={lastAuth.required.roles.join(', ') || 'Any'} />
                        <InfoRow label="Effective Role" value={lastAuth.effective.role} />
                        <InfoRow label="Role Matched" value={lastAuth.evidence.roleMatched ? 'Yes' : 'No'} />
                        <InfoRow label="Scope Type" value={lastAuth.evidence.scopeType} />
                        {lastAuth.evidence.grantingRole && (
                            <InfoRow label="Granted By" value={lastAuth.evidence.grantingRole} highlight />
                        )}
                        {lastAuth.evidence.missing.length > 0 && (
                            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-2">
                                <div className="text-[10px] font-bold text-rose-400 mb-1">Missing:</div>
                                <div className="text-xs text-rose-300">{lastAuth.evidence.missing.join(', ')}</div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-white/40 text-xs text-center py-2">
                        No auth decision recorded
                    </div>
                )}
            </div>

            {/* Last Switch Validation Errors */}
            {lastSwitch?.validationErrors && Object.keys(lastSwitch.validationErrors).length > 0 && (
                <div className="space-y-3">
                    <SectionHeader icon={<XCircle size={14} className="text-rose-400" />} title="Validation Errors" />
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 space-y-1">
                        {Object.entries(lastSwitch.validationErrors).map(([field, errors]) => (
                            <div key={field} className="text-xs">
                                <span className="text-rose-400 font-mono">{field}:</span>{' '}
                                <span className="text-rose-200">{errors.join(', ')}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function DbOpsTab({ operations }: { operations: DbOperation[] }) {
    return (
        <div className="space-y-3">
            <SectionHeader icon={<Database size={14} />} title="Recent DB Operations" />

            {operations.length > 0 ? (
                <div className="space-y-2">
                    {operations.map((op) => (
                        <div key={op.traceId} className="bg-white/5 rounded-lg p-2 space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-cyan-400">
                                    {op.method} {op.resource}
                                </span>
                                <span className="text-[10px] text-white/40">
                                    {op.latencyMs}ms
                                </span>
                            </div>
                            <div className="text-[11px] font-mono text-white/60 truncate">
                                {op.sqlLike}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-white/30">
                                <span>Status: {op.responseStatus}</span>
                                <span>Size: {op.payloadSize}B</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-white/40 text-xs text-center py-4">
                    No DB operations recorded
                </div>
            )}
        </div>
    );
}

function TimelineTab({ traces }: { traces: TraceEntry[] }) {
    return (
        <div className="space-y-3">
            <SectionHeader icon={<Clock size={14} />} title="Trace Timeline" />

            {traces.length > 0 ? (
                <div className="space-y-1">
                    {traces.slice(0, 20).map(trace => (
                        <div
                            key={trace.traceId}
                            className={`flex items-center gap-2 py-1 text-[11px] border-l-2 pl-2 ${trace.type === 'auth' ? 'border-cyan-500' :
                                trace.type === 'db' ? 'border-violet-400' :
                                    'border-[hsl(var(--accent-primary))]'
                                }`}
                        >
                            <span className="text-white/40 w-16 shrink-0">
                                {new Date(trace.timestamp).toLocaleTimeString()}
                            </span>
                            <span className="text-white/80 truncate">
                                {getTraceLabel(trace)}
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-white/40 text-xs text-center py-4">
                    No traces recorded
                </div>
            )}
        </div>
    );
}

// ============================================================
// HELPER COMPONENTS
// ============================================================

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
    return (
        <div className="flex items-center gap-2 text-white/70">
            {icon}
            <span className="text-[11px] font-bold uppercase tracking-widest">{title}</span>
        </div>
    );
}

function InfoRow({
    label,
    value,
    status,
    highlight
}: {
    label: string;
    value: string;
    status?: 'success' | 'error';
    highlight?: boolean;
}) {
    return (
        <div className="flex items-center justify-between text-xs">
            <span className="text-white/50">{label}</span>
            <span className={`font-mono ${status === 'success' ? 'text-emerald-400' :
                status === 'error' ? 'text-rose-400' :
                    highlight ? 'text-cyan-400' :
                        'text-white/80'
                }`}>
                {value}
            </span>
        </div>
    );
}

function getTraceLabel(trace: TraceEntry): string {
    switch (trace.type) {
        case 'auth':
            const auth = trace.data as AuthDecision;
            return `Auth: ${auth.actionName} → ${auth.decision}`;
        case 'db':
            const db = trace.data as DbOperation;
            return `DB: ${db.method} ${db.resource}`;
        case 'roleSwitch':
            const sw = trace.data as RoleSwitchTrace;
            return `Switch: ${sw.fromRole} → ${sw.toRole}`;
        default:
            return 'Unknown';
    }
}
