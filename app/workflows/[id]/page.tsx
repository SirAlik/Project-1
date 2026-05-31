import { notFound }     from 'next/navigation';
import Link             from 'next/link';
import type { Metadata } from 'next';
import { ChevronLeft, ListChecks, GitBranch, User, Calendar } from 'lucide-react';

import { createSupabaseServerClient }  from '@/lib/db/supabase-server';
import { getActivePersona }            from '@/lib/auth/context-service';
import { workflowName, stateLabel } from '@/lib/workflow-labels';
import { WorkflowStatusBadge }         from '@/components/workflow/WorkflowStatusBadge';
import { WorkflowTimeline }            from '@/components/workflow/WorkflowTimeline';
import { ApprovalGateCard }            from '@/components/workflow/ApprovalGateCard';
import type { WorkflowTransition, ApprovalGate } from '@/lib/types/workflow';

export const metadata: Metadata = { title: 'تفاصيل الـ Workflow' };

// ────────────────────────────────────────────────────────────
// Data fetching
// ────────────────────────────────────────────────────────────

async function fetchPageData(instanceId: string) {
  const supabase = await createSupabaseServerClient();
  const persona  = await getActivePersona();

  // جلب الـ instance (RLS يضمن العزل)
  const { data: instance } = await supabase
    .from('workflow_instances')
    .select('id, school_id, workflow_code, current_state, status, initiator_name_snapshot, initiator_role_snapshot, subject_ref, created_at, completed_at, due_date')
    .eq('id', instanceId)
    .single();

  if (!instance) return null;

  // جلب تعريف الـ workflow لمعرفة الحالات المتاحة
  const [defRes, transRes, gatesRes] = await Promise.all([
    supabase
      .from('workflow_definitions')
      .select('display_name_ar, states')
      .eq('workflow_code', instance.workflow_code)
      .single(),
    supabase
      .from('workflow_transitions')
      .select('*')
      .eq('workflow_instance_id', instanceId)
      .order('created_at', { ascending: true }),
    supabase
      .from('approval_gates')
      .select('*')
      .eq('workflow_instance_id', instanceId)
      .order('created_at', { ascending: true }),
  ]);

  // persona_id للمستخدم الحالي — لتحديد canDecide
  let currentPersonaId: string | null = null;
  if (persona?.userId && persona?.schoolId && persona?.role) {
    const { data: personaRow } = await supabase
      .from('user_personas')
      .select('id')
      .eq('user_id', persona.userId)
      .eq('school_id', persona.schoolId)
      .eq('role', persona.role)
      .limit(1)
      .single();
    currentPersonaId = personaRow?.id ?? null;
  }

  return {
    instance,
    definition:        defRes.data,
    transitions:       (transRes.data ?? []) as WorkflowTransition[],
    gates:             (gatesRes.data ?? []) as ApprovalGate[],
    persona,
    currentPersonaId,
  };
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function formatDateAr(iso: string) {
  return new Date(iso).toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function canUserDecide(
  gate: ApprovalGate,
  currentPersonaId: string | null,
  role: string,
  isSystemOwner: boolean,
): boolean {
  if (gate.status !== 'pending') return false;
  if (isSystemOwner)             return true;
  if (gate.assigned_to_persona_id && currentPersonaId &&
      gate.assigned_to_persona_id === currentPersonaId) return true;
  if (gate.required_role === role) return true;
  return false;
}

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ id: string }>;
}

export default async function WorkflowDetailPage({ params }: Props) {
  const { id } = await params;
  const data   = await fetchPageData(id);

  if (!data) notFound();

  const {
    instance, transitions, gates,
    persona, currentPersonaId,
  } = data;

  const isSystemOwner  = persona?.isSystemOwner ?? false;
  const currentRole    = persona?.role ?? '';
  const subjectRef     = instance.subject_ref as { display?: string; type?: string } | null;


  return (
    <main className="min-h-screen bg-background font-saudi" dir="rtl">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* رابط العودة */}
        <Link
          href="/workflows"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          العودة إلى الصندوق
        </Link>

        {/* ─── بطاقة المعلومات الأساسية ─── */}
        <div className="rounded-3xl border border-border/60 bg-card p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {workflowName(instance.workflow_code)}
              </p>
              <h1 className="text-xl font-black text-foreground">
                {subjectRef?.display ?? 'بدون عنوان'}
              </h1>
              {subjectRef?.type && (
                <p className="text-xs text-muted-foreground">{subjectRef.type}</p>
              )}
            </div>
            <WorkflowStatusBadge status={instance.status} size="md" />
          </div>

          {/* تفاصيل */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t border-border/40">
            <div className="space-y-0.5">
              <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wide">الحالة الحالية</p>
              <p className="text-sm font-bold text-foreground">
                {stateLabel(instance.current_state)}
              </p>
            </div>

            <div className="space-y-0.5">
              <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wide">المُبادِر</p>
              <p className="text-sm font-medium text-foreground flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                {instance.initiator_name_snapshot}
              </p>
            </div>

            <div className="space-y-0.5">
              <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wide">تاريخ البدء</p>
              <p className="text-sm font-medium text-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                {formatDateAr(instance.created_at)}
              </p>
            </div>

            {instance.due_date && (
              <div className="space-y-0.5">
                <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wide">الاستحقاق</p>
                <p className="text-sm font-medium text-foreground">
                  {formatDateAr(instance.due_date)}
                </p>
              </div>
            )}

            {instance.completed_at && (
              <div className="space-y-0.5">
                <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wide">تاريخ الإغلاق</p>
                <p className="text-sm font-medium text-foreground">
                  {formatDateAr(instance.completed_at)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ─── نقاط الموافقة (Approval Gates) ─── */}
        {gates.length > 0 && (
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <ListChecks className="w-4 h-4 text-primary" />
              نقاط الموافقة ({gates.length})
            </h2>
            <div className="space-y-3">
              {gates.map(gate => (
                <ApprovalGateCard
                  key={gate.id}
                  gate={gate}
                  canDecide={canUserDecide(gate, currentPersonaId, currentRole, isSystemOwner)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ─── سجل الانتقالات ─── */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <GitBranch className="w-4 h-4 text-primary" />
            سجل الانتقالات ({transitions.length})
          </h2>
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <WorkflowTimeline transitions={transitions} />
          </div>
        </section>

      </div>
    </main>
  );
}
