import type { WorkflowRow } from "@/lib/workflows-api";

export function emptyWorkflow(): WorkflowRow {
  return {
    id: "new",
    name: "Untitled automation",
    description: null,
    isActive: false,
    trigger: { type: "contact_created" },
    steps: [
      {
        id: crypto.randomUUID(),
        type: "create_task",
        label: "Create task",
        config: { title: "Follow-up call", priority: "MEDIUM" },
        position: { x: 0, y: 180 },
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    workspaceId: "",
    runs: [],
  };
}

export function getInitialSelection(current: WorkflowRow | null, rows: WorkflowRow[]): WorkflowRow | null {
  if (current) return current;
  return rows.length > 0 ? rows[0] : null;
}

export function createDraftWorkflowList(current: WorkflowRow[], draft: WorkflowRow): WorkflowRow[] {
  if (current.some((workflow) => workflow.id === draft.id)) {
    return current;
  }

  return [draft, ...current];
}
