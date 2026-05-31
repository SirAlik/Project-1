'use server';

import {
  startHRWorkflow,
  type StartHRWorkflowOutput,
} from '@/lib/services/hr-attendance-service';
import type { WorkflowResult } from '@/lib/workflow-service';

export async function startHRWorkflowAction(
  ticketId: string,
): Promise<WorkflowResult<StartHRWorkflowOutput>> {
  return startHRWorkflow(ticketId);
}
