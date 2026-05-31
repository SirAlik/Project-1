'use server';

import { createJob, deleteJob, getMyJobs } from '@/lib/services/bulk-upload-service';
import type { WorkflowResult }             from '@/lib/workflow-service';
import type {
  BulkUploadJob,
  BulkJobType,
  BulkValidationSummary,
} from '@/lib/types/layer7';

export async function createJobAction(input: {
  job_type:           BulkJobType;
  file_name:          string;
  validation_summary: BulkValidationSummary;
  parsed_rows:        Record<string, string>[];
}): Promise<WorkflowResult<{ job_id: string; job_number: string }>> {
  return createJob(input);
}

export async function deleteJobAction(jobId: string): Promise<WorkflowResult<null>> {
  return deleteJob(jobId);
}

export async function getJobsAction(): Promise<WorkflowResult<BulkUploadJob[]>> {
  return getMyJobs();
}
