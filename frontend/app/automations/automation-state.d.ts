import type { WorkflowRow } from "@/lib/workflows-api";

declare function emptyWorkflow(): WorkflowRow;
declare function getInitialSelection(current: WorkflowRow | null, rows: WorkflowRow[]): WorkflowRow | null;
declare function createDraftWorkflowList(current: WorkflowRow[], draft: WorkflowRow): WorkflowRow[];

export { emptyWorkflow, getInitialSelection, createDraftWorkflowList };
