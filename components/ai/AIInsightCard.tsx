'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Sparkles, RefreshCw, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { getOrRefreshInsight, refreshMyInsight } from '@/app/_actions/ai';
import type { AIContextType, AIInsight, AIScope } from '@/lib/types/ai';

interface AIInsightCardProps {
  contextType: AIContextType;
  scope?:      AIScope;
  scopeId?:    string;
  title?:      string;
}

export function AIInsightCard({
  contextType,
  scope     = 'school',
  scopeId,
  title     = 'الرؤية الذكية',
}: AIInsightCardProps) {
  const [insight,    setInsight]    = useState<AIInsight | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [expanded,   setExpanded]   = useState(false);
  const [isPending,  startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const res = await getOrRefreshInsight(contextType, scope, scopeId);
      if (res.ok) {
        setInsight(res.data);
        setError(null);
      } else {
        setError(res.error);
      }
    });
  }, [contextType, scope, scopeId]);

  function handleRefresh() {
    startTransition(async () => {
      setError(null);
      const res = await refreshMyInsight(contextType, scope, scopeId);
      if (res.ok) {
        setInsight(res.data);
      } else {
        setError(res.error);
      }
    });
  }

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (isPending && !insight) {
    return (
      <div className="surface-block p-6 animate-pulse" dir="rtl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-xl bg-primary/20" />
          <div className="h-4 w-32 bg-bg-surface/50 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full bg-bg-surface/50 rounded" />
          <div className="h-3 w-5/6 bg-bg-surface/50 rounded" />
          <div className="h-3 w-4/6 bg-bg-surface/50 rounded" />
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error && !insight) {
    return (
      <div className="surface-block p-6 border-destructive/30" dir="rtl">
        <div className="flex items-center gap-3 text-destructive">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="text-xs font-bold">{error}</p>
        </div>
        <button
          onClick={handleRefresh}
          className="mt-4 text-xs text-primary hover:text-accent transition-colors font-bold flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> حاول مجدداً
        </button>
      </div>
    );
  }

  // ── Empty ─────────────────────────────────────────────────────────────────
  if (!insight) return null;

  const recs = insight.recommendations ?? [];

  return (
    <div className="surface-block p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-accent blur-lg opacity-20" />
            <div className="relative w-9 h-9 rounded-xl bg-accent/20 flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5 text-accent" />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
              AI · {insight.model_version}
            </p>
            <h3 className="text-sm font-bold text-text-primary">{title}</h3>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isPending}
          className="flex items-center gap-1.5 text-[10px] font-bold text-text-secondary hover:text-primary uppercase tracking-widest transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-3 h-3 ${isPending ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      {/* Summary */}
      <p className="text-sm text-text-primary leading-relaxed mb-4">
        {insight.summary_ar}
      </p>

      {/* Recommendations */}
      {recs.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-2 text-[10px] font-bold text-primary hover:text-accent uppercase tracking-widest transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            التوصيات ({recs.length})
          </button>

          {expanded && (
            <ul className="mt-4 space-y-3">
              {recs.map((rec, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 bg-bg-surface/30 border border-border-subtle rounded-xl p-3"
                >
                  <span className={`
                    mt-0.5 flex-shrink-0 w-2 h-2 rounded-full
                    ${rec.priority === 'high'   ? 'bg-destructive' :
                      rec.priority === 'medium' ? 'bg-accent' : 'bg-primary'}
                  `} />
                  <div>
                    <p className="text-xs font-bold text-text-primary">{rec.title}</p>
                    <p className="text-[10px] text-text-secondary mt-0.5 leading-relaxed">{rec.action}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* Timestamp */}
      <p className="mt-4 text-[10px] text-text-secondary font-mono border-t border-border-subtle pt-3">
        {new Date(insight.generated_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
}
