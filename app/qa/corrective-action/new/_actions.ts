'use server';

import {
  getReasonCodes,
  getEmployeesByRole,
  submitCorrectiveActionWizard,
  type ReasonCode,
  type EmployeeOption,
  type SubmitCorrectiveActionInput,
  type SubmitCorrectiveActionOutput,
} from '@/lib/services/wizard-service';
import type { WorkflowResult } from '@/lib/workflow-service';

export async function getReasonCodesAction(
  category: string,
): Promise<WorkflowResult<ReasonCode[]>> {
  return getReasonCodes(category);
}

export async function getEmployeesByRoleAction(
  role: string,
): Promise<WorkflowResult<EmployeeOption[]>> {
  return getEmployeesByRole(role);
}

export async function submitCorrectiveActionAction(
  input: SubmitCorrectiveActionInput,
): Promise<WorkflowResult<SubmitCorrectiveActionOutput>> {
  return submitCorrectiveActionWizard(input);
}
