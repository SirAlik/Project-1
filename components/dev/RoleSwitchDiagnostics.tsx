'use client';

/**
 * RoleSwitchDiagnostics Component (DEV-ONLY)
 * ===========================================
 * Shows detailed error information when role switching fails.
 * Only renders in development mode.
 */

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { SwitchPersonaResult } from '@/lib/contracts/switch-persona-contract';

interface DiagnosticsOverlayProps {
    result: SwitchPersonaResult;
    sentPayload: { role: string; schoolId?: string };
    currentContext: { role: string; schoolId?: string };
    onClose: () => void;
}

/**
 * Dev-only diagnostics overlay for role switch failures.
 * Shows validation errors, payload, and current context.
 */
export function RoleSwitchDiagnostics({
    result,
    sentPayload,
    currentContext,
    onClose,
}: DiagnosticsOverlayProps) {
    // Only render in development
    if (process.env.NODE_ENV !== 'development') {
        return null;
    }

    // Only show if there's an error
    if (result.success) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-[9999] max-w-md w-full">
            <div className="bg-rose-950/95 border border-rose-500/50 rounded-xl p-4 shadow-2xl backdrop-blur-sm">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-rose-400">
                        <AlertTriangle size={18} />
                        <span className="font-bold text-sm">Role Switch Failed (DEV)</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-rose-400/60 hover:text-rose-400 transition-colors"
                        aria-label="Close diagnostics"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Error Message */}
                <div className="text-rose-300 text-xs mb-3">
                    <span className="font-bold">Error:</span> {result.error}
                </div>

                {/* Validation Errors */}
                {result.validationErrors && Object.keys(result.validationErrors).length > 0 && (
                    <div className="mb-3">
                        <div className="text-rose-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                            Validation Errors
                        </div>
                        <div className="bg-black/30 rounded-lg p-2 text-[11px] font-mono">
                            {Object.entries(result.validationErrors).map(([field, errors]) => (
                                <div key={field} className="text-rose-200">
                                    <span className="text-rose-400">{field}:</span>{' '}
                                    {errors.join(', ')}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Sent Payload */}
                <div className="mb-3">
                    <div className="text-rose-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                        Sent Payload
                    </div>
                    <pre className="bg-black/30 rounded-lg p-2 text-[11px] font-mono text-rose-200 overflow-x-auto">
                        {JSON.stringify(sentPayload, null, 2)}
                    </pre>
                </div>

                {/* Current Context */}
                <div>
                    <div className="text-rose-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                        Current Context
                    </div>
                    <pre className="bg-black/30 rounded-lg p-2 text-[11px] font-mono text-rose-200 overflow-x-auto">
                        {JSON.stringify(currentContext, null, 2)}
                    </pre>
                </div>
            </div>
        </div>
    );
}
