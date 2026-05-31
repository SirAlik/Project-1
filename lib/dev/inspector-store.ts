/**
 * Inspector Store - DEV ONLY
 * ===========================
 * In-memory store for dev-only trace history.
 * No persistence - data cleared on page reload.
 * 
 * SECURITY: This module is DEV-ONLY and tree-shaken in production.
 */

import type { TraceEntry, AuthDecision, DbOperation, RoleSwitchTrace } from './permissions-inspector';

// ============================================================
// STORE (In-memory, no persistence)
// ============================================================

const MAX_TRACES = 100;
let traces: TraceEntry[] = [];
const listeners: Set<() => void> = new Set();

// ============================================================
// API
// ============================================================

/**
 * Adds a trace entry to the store.
 */
export function addTrace(entry: TraceEntry): void {
    traces = [entry, ...traces].slice(0, MAX_TRACES);
    notifyListeners();
}

/**
 * Gets all traces (most recent first).
 */
export function getTraces(): TraceEntry[] {
    return traces;
}

/**
 * Gets traces filtered by type.
 */
export function getTracesByType<T extends TraceEntry['type']>(
    type: T
): TraceEntry[] {
    return traces.filter(t => t.type === type);
}

/**
 * Gets the last trace of a specific type.
 */
export function getLastTrace<T extends TraceEntry['type']>(
    type: T
): TraceEntry | null {
    return traces.find(t => t.type === type) || null;
}

/**
 * Gets the last auth decision.
 */
export function getLastAuthDecision(): AuthDecision | null {
    const trace = getLastTrace('auth');
    return trace?.data as AuthDecision || null;
}

/**
 * Gets the last role switch trace.
 */
export function getLastRoleSwitchTrace(): RoleSwitchTrace | null {
    const trace = getLastTrace('roleSwitch');
    return trace?.data as RoleSwitchTrace || null;
}

/**
 * Gets recent DB operations.
 */
export function getRecentDbOperations(limit = 10): DbOperation[] {
    return getTracesByType('db')
        .slice(0, limit)
        .map(t => t.data as DbOperation);
}

/**
 * Clears all traces.
 */
export function clearTraces(): void {
    traces = [];
    notifyListeners();
}

/**
 * Exports traces as JSON (redacted).
 */
export function exportTracesJson(): string {
    return JSON.stringify(traces, null, 2);
}

// ============================================================
// SUBSCRIPTION (for React components)
// ============================================================

/**
 * Subscribes to trace updates.
 */
export function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/**
 * Gets current snapshot (for useSyncExternalStore).
 */
export function getSnapshot(): TraceEntry[] {
    return traces;
}

function notifyListeners(): void {
    listeners.forEach(fn => fn());
}
