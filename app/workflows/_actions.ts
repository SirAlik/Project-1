'use server';

import {
  decideGate,
  advanceWorkflow,
  type WorkflowResult,
  type DecideGateOutput,
  type AdvanceWorkflowOutput,
} from '@/lib/workflow-service';

export async function decideGateAction(
  gateId: string,
  decision: 'approved' | 'rejected',
  justification?: string,
): Promise<WorkflowResult<DecideGateOutput>> {
  return decideGate({ gate_id: gateId, decision, justification });
}

export async function advanceWorkflowAction(
  instanceId: string,
  action: string,
  notes?: string,
): Promise<WorkflowResult<AdvanceWorkflowOutput>> {
  return advanceWorkflow({
    workflow_instance_id: instanceId,
    action,
    decision_notes: notes,
  });
}
