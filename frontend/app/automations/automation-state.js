function emptyWorkflow() {
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

function getInitialSelection(current, rows) {
  if (current) return current;
  return rows.length > 0 ? rows[0] : null;
}

function createDraftWorkflowList(current, draft) {
  if (current.some((workflow) => workflow.id === draft.id)) {
    return current;
  }

  return [draft, ...current];
}

module.exports = {
  emptyWorkflow,
  getInitialSelection,
  createDraftWorkflowList,
};
