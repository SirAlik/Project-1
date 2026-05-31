'use server';

import {
  createStaffEvaluation,
  getStaffForEvaluation,
  type CreateEvalInput,
  type StaffOption,
} from '@/lib/services/staff-evaluation-service';
import type { WorkflowResult } from '@/lib/workflow-service';

export async function getStaffAction(): Promise<WorkflowResult<StaffOption[]>> {
  return getStaffForEvaluation();
}

export async function createEvalAction(
  input: CreateEvalInput,
): Promise<WorkflowResult<{ id: string }>> {
  return createStaffEvaluation(input) as Promise<WorkflowResult<{ id: string }>>;
}
