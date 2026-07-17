"use client";

import { useEffect, useMemo, useState } from "react";
import AppLayout, { useWorkspace } from "@/components/AppLayout";
import {
  workflowsApi,
  WorkflowDetail,
  WorkflowRow,
  WorkflowStep,
  WorkflowStepType,
  WorkflowTriggerType,
} from "@/lib/workflows-api";
import { toast } from "sonner";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonRow from "@/components/ui/SkeletonRow";
import {
  AlertTriangle,
  ArrowDown,
  Bell,
  Bot,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  CircleOff,
  Edit3,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Settings2,
  ShieldAlert,
  Trash2,
  Workflow as WorkflowIcon,
  X,
  Zap,
} from "lucide-react";
import { Background, Controls, Handle, Position, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { createDraftWorkflowList, emptyWorkflow, getInitialSelection } from "./automation-state";

type BuilderTab = "builder" | "runs";

type StepEditorState = {
  title?: string;
  priority?: string;
  assigneeId?: string;
  message?: string;
  entity?: string;
  field?: string;
  value?: string;
  url?: string;
  method?: string;
};

const TRIGGER_OPTIONS: { value: WorkflowTriggerType; label: string }[] = [
  { value: "contact_created", label: "Contact Created" },
  { value: "contact_updated", label: "Contact Updated" },
  { value: "deal_created", label: "Deal Created" },
  { value: "deal_updated", label: "Deal Updated" },
  { value: "deal_stage_changed", label: "Deal Stage Changed" },
  { value: "task_created", label: "Task Created" },
  { value: "task_completed", label: "Task Completed" },
  { value: "company_created", label: "Company Created" },
];

const STEP_OPTIONS: { value: WorkflowStepType; label: string; description: string }[] = [
  { value: "send_notification", label: "Send Notification", description: "Notify users inside Orbit CRM" },
  { value: "create_task", label: "Create Task", description: "Create a follow-up task" },
  { value: "send_email", label: "Send Email", description: "Send an automated email" },
  { value: "update_field", label: "Update Field", description: "Mutate a record field" },
  { value: "webhook", label: "Webhook", description: "Dispatch an HTTP webhook" },
];

function workflowLabel(type: WorkflowTriggerType) {
  return TRIGGER_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

function stepLabel(type: WorkflowStepType) {
  return STEP_OPTIONS.find((option) => option.value === type)?.label ?? type;
}


function createNodes(
  workflow: WorkflowRow,
  callbacks: {
    onTriggerSelect: () => void;
    onStepSelect: (stepId: string) => void;
    onStepDelete: (stepId: string) => void;
    onAddStep: () => void;
  },
): Node[] {
  const nodes: Node[] = [
    {
      id: "trigger",
      position: { x: 0, y: 0 },
      data: { workflow, onSelect: callbacks.onTriggerSelect },
      type: "trigger",
      draggable: false,
    },
  ];

  workflow.steps.forEach((step, index) => {
    nodes.push({
      id: step.id,
      position: { x: 0, y: 140 + index * 160 },
      data: {
        step,
        index,
        onSelect: () => callbacks.onStepSelect(step.id),
        onDelete: () => callbacks.onStepDelete(step.id),
      },
      type: "step",
    });
  });

  nodes.push({
    id: "add-step",
    position: { x: 0, y: workflow.steps.length * 160 + 140 },
    data: { onAdd: callbacks.onAddStep },
    type: "addStep",
    draggable: false,
    selectable: false,
  });

  return nodes;
}

function createEdges(workflow: WorkflowRow): Edge[] {
  const edges: Edge[] = [];
  workflow.steps.forEach((step, index) => {
    const source = index === 0 ? "trigger" : workflow.steps[index - 1].id;
    edges.push({
      id: `${source}-${step.id}`,
      source,
      target: step.id,
      animated: true,
      type: "smoothstep",
    });
  });

  const addStepTarget = workflow.steps.length > 0 ? workflow.steps[workflow.steps.length - 1].id : "trigger";
  edges.push({
    id: `${addStepTarget}-add-step`,
    source: addStepTarget,
    target: "add-step",
    animated: true,
    type: "smoothstep",
  });

  return edges;
}

function statusClass(isActive: boolean) {
  return isActive
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
    : "border-slate-500/30 bg-slate-500/10 text-slate-200";
}

function runStatusClass(status: string) {
  switch (status) {
    case "SUCCESS":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "FAILED":
      return "border-rose-500/30 bg-rose-500/10 text-rose-200";
    default:
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  }
}

function WorkflowCard({
  workflow,
  selected,
  onSelect,
  onToggle,
  onDelete,
}: {
  workflow: WorkflowRow;
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const lastRun = workflow.runs?.[0];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`w-full cursor-pointer rounded-2xl border p-4 text-left transition ${selected ? "border-orbit-primary/60 bg-orbit-primary/10" : "border-border-subtle bg-bg-secondary/40 hover:border-border-strong"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-text-primary">{workflow.name}</div>
          <div className="mt-1 text-xs text-text-tertiary">{workflowLabel(workflow.trigger.type)} • {workflow.steps.length} steps</div>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.2em] ${statusClass(workflow.isActive)}`}>
          {workflow.isActive ? "Active" : "Inactive"}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-text-tertiary">
        <span className="inline-flex items-center gap-1.5">
          <WorkflowIcon className="h-3.5 w-3.5" />
          {lastRun ? `Last run ${lastRun.status}` : "No runs yet"}
        </span>
        <span className="inline-flex items-center gap-2">
          <button type="button" onClick={(e) => { e.stopPropagation(); onToggle(); }} className="rounded-lg border border-border-subtle px-2 py-1 text-[11px] text-text-secondary hover:text-text-primary">
            Toggle
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="rounded-lg border border-border-subtle px-2 py-1 text-[11px] text-text-secondary hover:text-rose-300">
            Delete
          </button>
        </span>
      </div>
    </div>
  );
}

function TriggerNode({ data }: { data: any }) {
  return (
    <div className="w-[280px] rounded-3xl border border-sky-400/30 bg-sky-500/10 p-4 shadow-lg shadow-sky-950/20">
      <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !border-2 !border-sky-300 !bg-sky-400" />
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-sky-200">
        <Zap className="h-4 w-4" /> Trigger
      </div>
      <div className="mt-3 text-lg font-semibold text-text-primary">{workflowLabel(data.workflow.trigger.type)}</div>
      <button type="button" onClick={data.onSelect} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-sky-400/30 bg-bg-tertiary px-3 py-2 text-sm text-text-secondary">
        Edit trigger <ChevronDown className="h-4 w-4" />
      </button>
    </div>
  );
}

function StepNode({ data, selected }: { data: any; selected: boolean }) {
  const step = data.step as WorkflowStep;
  return (
    <div className={`w-[280px] rounded-3xl border bg-bg-secondary p-4 shadow-lg ${selected ? "border-orbit-primary/60" : "border-border-subtle"}`}>
      <Handle type="target" position={Position.Top} className="!h-3 !w-3 !border-2 !border-slate-300 !bg-slate-400" />
      <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !border-2 !border-slate-300 !bg-slate-400" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-text-tertiary">Step {data.index + 1}</div>
          <div className="mt-1 text-lg font-semibold text-text-primary">{stepLabel(step.type)}</div>
        </div>
        <span className="rounded-full border border-border-subtle px-2 py-1 text-[11px] text-text-tertiary">{step.type}</span>
      </div>
      <div className="mt-3 text-sm text-text-secondary">{step.label}</div>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={data.onSelect} className="rounded-xl border border-border-subtle px-3 py-2 text-xs text-text-secondary hover:text-text-primary">
          Edit ✏
        </button>
        <button type="button" onClick={data.onDelete} className="rounded-xl border border-border-subtle px-3 py-2 text-xs text-rose-200 hover:bg-rose-500/10">
          Delete 🗑
        </button>
      </div>
    </div>
  );
}

function AddStepNode({ data }: { data: any }) {
  return (
    <div className="w-[280px] rounded-3xl border border-dashed border-border-strong bg-bg-secondary/40 p-5 text-center text-sm text-text-secondary hover:border-orbit-primary hover:text-text-primary">
      <Handle type="target" position={Position.Top} className="!h-3 !w-3 !border-2 !border-slate-300 !bg-slate-400" />
      <button type="button" onClick={data.onAdd} className="w-full">
        <Plus className="mx-auto h-5 w-5" />
        <div className="mt-2">Add Step</div>
      </button>
    </div>
  );
}

function RunRow({ run }: { run: any }) {
  const [open, setOpen] = useState(false);
  const started = new Date(run.startedAt);
  const finished = run.finishedAt ? new Date(run.finishedAt) : null;
  const duration = finished ? Math.max(0, Math.round((finished.getTime() - started.getTime()) / 1000)) : null;

  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-secondary/40 p-4">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 text-left">
        <div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${runStatusClass(run.status)}`}>{run.status}</span>
            <span className="text-sm text-text-primary">Started {started.toLocaleString("en-IN")}</span>
          </div>
          <div className="mt-1 text-xs text-text-tertiary">{duration !== null ? `${duration}s duration` : "In progress"}</div>
        </div>
        <ArrowDown className={`h-4 w-4 text-text-tertiary transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <pre className="mt-4 overflow-auto rounded-xl bg-bg-tertiary p-3 text-xs text-text-secondary">
          {JSON.stringify({ triggerData: run.triggerData, stepResults: run.stepResults }, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

function WorkflowBuilder({ workflow, onWorkflowChange, onSave, saving }: { workflow: WorkflowRow; onWorkflowChange: (next: WorkflowRow) => void; onSave: () => void; saving: boolean }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("trigger");
  const [activeTab, setActiveTab] = useState<BuilderTab>("builder");
  const [drawerOpen, setDrawerOpen] = useState(true);

  useEffect(() => {
    setSelectedNodeId("trigger");
  }, [workflow.id]);

  const updateTrigger = (type: WorkflowTriggerType) => {
    onWorkflowChange({ ...workflow, trigger: { type } });
  };

  const updateStep = (stepId: string, patch: Partial<WorkflowStep>) => {
    onWorkflowChange({
      ...workflow,
      steps: workflow.steps.map((step) => (step.id === stepId ? { ...step, ...patch } : step)),
    });
  };

  const removeStep = (stepId: string) => {
    onWorkflowChange({ ...workflow, steps: workflow.steps.filter((step) => step.id !== stepId) });
    setSelectedNodeId("trigger");
  };

  const addStep = () => {
    const newStep: WorkflowStep = {
      id: crypto.randomUUID(),
      type: "create_task",
      label: "Create task",
      config: { title: "Follow-up call", priority: "MEDIUM" },
      position: { x: 0, y: workflow.steps.length * 160 + 140 },
    };
    onWorkflowChange({ ...workflow, steps: [...workflow.steps, newStep] });
    setSelectedNodeId(newStep.id);
  };

  const nodes = useMemo(
    () =>
      createNodes(workflow, {
        onTriggerSelect: () => setSelectedNodeId("trigger"),
        onStepSelect: (stepId) => setSelectedNodeId(stepId),
        onStepDelete: removeStep,
        onAddStep: addStep,
      }),
    [workflow],
  );
  const edges = useMemo(() => createEdges(workflow), [workflow]);

  const selectedStep = workflow.steps.find((step) => step.id === selectedNodeId) ?? null;

  return (
    <div className="flex h-full min-h-[720px] flex-col rounded-3xl border border-border-subtle bg-surface-default shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border-subtle p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <input
            value={workflow.name}
            onChange={(e) => onWorkflowChange({ ...workflow, name: e.target.value })}
            className="w-full rounded-2xl border border-transparent bg-transparent px-0 py-1 text-2xl font-semibold text-text-primary outline-none focus:border-orbit-primary/20 focus:bg-bg-secondary/30"
          />
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-tertiary">
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${statusClass(workflow.isActive)}`}>
              {workflow.isActive ? "Active" : "Inactive"}
            </span>
            <span>{workflowLabel(workflow.trigger.type)}</span>
            <span>•</span>
            <span>{workflow.steps.length} steps</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onSave} className="btn-primary min-w-[120px] justify-center" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </button>
        </div>
      </div>

      <div className="border-b border-border-subtle px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setActiveTab("builder")} className={`rounded-full px-4 py-2 text-sm ${activeTab === "builder" ? "bg-orbit-primary text-white" : "bg-bg-secondary text-text-secondary"}`}>
            Builder
          </button>
          <button type="button" onClick={() => setActiveTab("runs")} className={`rounded-full px-4 py-2 text-sm ${activeTab === "runs" ? "bg-orbit-primary text-white" : "bg-bg-secondary text-text-secondary"}`}>
            Run history
          </button>
          <button type="button" onClick={() => setDrawerOpen(!drawerOpen)} className="ml-auto inline-flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary">
            <Settings2 className="h-4 w-4" /> {drawerOpen ? "Hide config" : "Show config"}
          </button>
        </div>
      </div>

      {activeTab === "builder" ? (
        <div className="grid flex-1 gap-0 xl:grid-cols-[1fr_340px]">
          <div className="min-h-[620px] bg-bg-tertiary/30 p-4 lg:p-6">
            <div className="h-[620px] rounded-3xl border border-border-subtle bg-[#0d1220]">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                fitView
                nodeTypes={{ trigger: TriggerNode as any, step: StepNode as any, addStep: AddStepNode as any }}
                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              >
                <Background />
                <Controls />
              </ReactFlow>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <button type="button" onClick={addStep} className="rounded-2xl border border-dashed border-border-strong bg-bg-secondary/50 px-4 py-3 text-sm text-text-secondary hover:border-orbit-primary">
                <Plus className="inline-block h-4 w-4" /> Add Step
              </button>
              <button type="button" onClick={() => setSelectedNodeId("trigger")} className="rounded-2xl border border-border-subtle bg-bg-secondary/50 px-4 py-3 text-sm text-text-secondary">
                Edit Trigger
              </button>
              <button type="button" onClick={onSave} className="rounded-2xl border border-border-subtle bg-bg-secondary/50 px-4 py-3 text-sm text-text-secondary">
                Quick Save
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {workflow.steps.map((step, index) => (
                <button key={step.id} type="button" onClick={() => setSelectedNodeId(step.id)} className={`rounded-full border px-3 py-1.5 text-xs ${selectedNodeId === step.id ? "border-orbit-primary bg-orbit-primary/10 text-text-primary" : "border-border-subtle text-text-secondary"}`}>
                  {index + 1}. {step.label}
                </button>
              ))}
            </div>
          </div>

          {drawerOpen ? (
            <aside className="border-t border-border-subtle bg-surface-default p-5 xl:border-l xl:border-t-0">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-text-primary">Node configuration</div>
                  <div className="text-xs text-text-tertiary">Configure trigger and step behavior</div>
                </div>
                <button type="button" onClick={() => setDrawerOpen(false)} className="text-text-tertiary">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {selectedNodeId === "trigger" ? (
                <div className="mt-5 space-y-4">
                  <label className="block text-xs font-medium uppercase tracking-[0.2em] text-text-tertiary">Trigger type</label>
                  <select value={workflow.trigger.type} onChange={(e) => updateTrigger(e.target.value as WorkflowTriggerType)} className="form-input w-full">
                    {TRIGGER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4 text-sm text-sky-100">
                    The trigger node always starts the workflow.
                  </div>
                </div>
              ) : selectedStep ? (
                <div className="mt-5 space-y-4">
                  <label className="block text-xs font-medium uppercase tracking-[0.2em] text-text-tertiary">Node type</label>
                  <select value={selectedStep.type} onChange={(e) => updateStep(selectedStep.id, { type: e.target.value as WorkflowStepType })} className="form-input w-full">
                    {STEP_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <label className="block text-xs font-medium uppercase tracking-[0.2em] text-text-tertiary">Label</label>
                  <input value={selectedStep.label} onChange={(e) => updateStep(selectedStep.id, { label: e.target.value })} className="form-input w-full" />

                  {selectedStep.type === "create_task" ? (
                    <>
                      <label className="block text-xs font-medium uppercase tracking-[0.2em] text-text-tertiary">Task title</label>
                      <input value={selectedStep.config.title ?? ""} onChange={(e) => updateStep(selectedStep.id, { config: { ...selectedStep.config, title: e.target.value } })} className="form-input w-full" />
                      <label className="block text-xs font-medium uppercase tracking-[0.2em] text-text-tertiary">Priority</label>
                      <select value={selectedStep.config.priority ?? "MEDIUM"} onChange={(e) => updateStep(selectedStep.id, { config: { ...selectedStep.config, priority: e.target.value } })} className="form-input w-full">
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                      </select>
                      <label className="block text-xs font-medium uppercase tracking-[0.2em] text-text-tertiary">Assignee</label>
                      <input value={selectedStep.config.assigneeId ?? ""} onChange={(e) => updateStep(selectedStep.id, { config: { ...selectedStep.config, assigneeId: e.target.value } })} className="form-input w-full" />
                    </>
                  ) : null}

                  {selectedStep.type === "send_email" ? (
                    <>
                      <label className="block text-xs font-medium uppercase tracking-[0.2em] text-text-tertiary">Subject</label>
                      <input value={selectedStep.config.subject ?? ""} onChange={(e) => updateStep(selectedStep.id, { config: { ...selectedStep.config, subject: e.target.value } })} className="form-input w-full" />
                      <label className="block text-xs font-medium uppercase tracking-[0.2em] text-text-tertiary">Recipient email / variable</label>
                      <input value={selectedStep.config.recipientEmail ?? ""} onChange={(e) => updateStep(selectedStep.id, { config: { ...selectedStep.config, recipientEmail: e.target.value } })} className="form-input w-full" />
                      <label className="block text-xs font-medium uppercase tracking-[0.2em] text-text-tertiary">Body template</label>
                      <textarea value={selectedStep.config.bodyTemplate ?? ""} onChange={(e) => updateStep(selectedStep.id, { config: { ...selectedStep.config, bodyTemplate: e.target.value } })} className="form-input min-h-28 w-full" />
                    </>
                  ) : null}

                  {selectedStep.type === "send_notification" ? (
                    <>
                      <label className="block text-xs font-medium uppercase tracking-[0.2em] text-text-tertiary">Message</label>
                      <textarea value={selectedStep.config.message ?? ""} onChange={(e) => updateStep(selectedStep.id, { config: { ...selectedStep.config, message: e.target.value } })} className="form-input min-h-28 w-full" />
                    </>
                  ) : null}

                  {selectedStep.type === "update_field" ? (
                    <>
                      <label className="block text-xs font-medium uppercase tracking-[0.2em] text-text-tertiary">Entity</label>
                      <input value={selectedStep.config.entity ?? ""} onChange={(e) => updateStep(selectedStep.id, { config: { ...selectedStep.config, entity: e.target.value } })} className="form-input w-full" />
                      <label className="block text-xs font-medium uppercase tracking-[0.2em] text-text-tertiary">Field</label>
                      <input value={selectedStep.config.field ?? ""} onChange={(e) => updateStep(selectedStep.id, { config: { ...selectedStep.config, field: e.target.value } })} className="form-input w-full" />
                      <label className="block text-xs font-medium uppercase tracking-[0.2em] text-text-tertiary">New value</label>
                      <input value={selectedStep.config.value ?? ""} onChange={(e) => updateStep(selectedStep.id, { config: { ...selectedStep.config, value: e.target.value } })} className="form-input w-full" />
                    </>
                  ) : null}

                  {selectedStep.type === "webhook" ? (
                    <>
                      <label className="block text-xs font-medium uppercase tracking-[0.2em] text-text-tertiary">URL</label>
                      <input value={selectedStep.config.url ?? ""} onChange={(e) => updateStep(selectedStep.id, { config: { ...selectedStep.config, url: e.target.value } })} className="form-input w-full" />
                      <label className="block text-xs font-medium uppercase tracking-[0.2em] text-text-tertiary">Method</label>
                      <select value={selectedStep.config.method ?? "POST"} onChange={(e) => updateStep(selectedStep.id, { config: { ...selectedStep.config, method: e.target.value } })} className="form-input w-full">
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                    </>
                  ) : null}

                  <button type="button" onClick={() => removeStep(selectedStep.id)} className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-100">
                    <Trash2 className="h-4 w-4" /> Delete step
                  </button>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-border-subtle bg-bg-secondary/40 p-4 text-sm text-text-secondary">
                  Select a node to configure it.
                </div>
              )}
            </aside>
          ) : null}
        </div>
      ) : (
        <div className="flex-1 p-5">
          <div className="space-y-3">
            {(workflow.runs ?? []).map((run) => (
              <RunRow key={run.id} run={run} />
            ))}
            {(workflow.runs ?? []).length === 0 ? (
              <div className="rounded-2xl border border-border-subtle bg-bg-secondary/40 p-6 text-sm text-text-secondary">No workflow runs yet.</div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function AutomationsContent() {
  const { workspaceId } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowRow | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    workflowsApi
      .list(workspaceId)
      .then((rows) => {
        setWorkflows(rows);
        setSelectedWorkflow((current) => getInitialSelection(current, rows));
      })
      .catch((err: any) => setError(err.message || "Failed to load automations."))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const refreshSelected = async (workflowId: string) => {
    if (!workspaceId) return;
    const detail = await workflowsApi.get(workspaceId, workflowId);
    setSelectedWorkflow(detail);
    setWorkflows((current) => current.map((workflow) => (workflow.id === detail.id ? detail : workflow)));
  };

  const createNew = () => {
    const draft = emptyWorkflow();
    setSelectedWorkflow(draft);
    setWorkflows((current) => createDraftWorkflowList(current, draft));
  };

  const persistSelected = async () => {
    if (!workspaceId || !selectedWorkflow) return;
    setSaving(true);
    try {
      const payload = {
        name: selectedWorkflow.name,
        description: selectedWorkflow.description ?? undefined,
        trigger: selectedWorkflow.trigger,
        steps: selectedWorkflow.steps,
        isActive: selectedWorkflow.isActive,
      };

      const saved = selectedWorkflow.id === "new"
        ? await workflowsApi.create(workspaceId, payload)
        : await workflowsApi.update(workspaceId, selectedWorkflow.id, payload);

      setWorkflows((current) => {
        const next = current.filter((workflow) => workflow.id !== "new");
        const existingIndex = next.findIndex((workflow) => workflow.id === saved.id);
        if (existingIndex >= 0) {
          next[existingIndex] = { ...saved, runs: next[existingIndex].runs };
          return [...next];
        }
        return [saved, ...next];
      });
      setSelectedWorkflow(saved);
      toast.success("Workflow saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save workflow");
    } finally {
      setSaving(false);
    }
  };

  const selectedId = selectedWorkflow?.id ?? null;

  const updateSelected = (next: WorkflowRow) => {
    setSelectedWorkflow(next);
  };

  const toggleSelected = async (workflowId: string) => {
    if (!workspaceId) return;
    try {
      const updated = await workflowsApi.toggle(workspaceId, workflowId);
      setWorkflows((current) => current.map((workflow) => (workflow.id === updated.id ? updated : workflow)));
      setSelectedWorkflow((current) => (current && current.id === updated.id ? { ...current, ...updated } : current));
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle workflow");
    }
  };

  const deleteWorkflow = async (workflowId: string) => {
    if (!workspaceId) return;
    try {
      await workflowsApi.delete(workspaceId, workflowId);
      setWorkflows((current) => current.filter((workflow) => workflow.id !== workflowId));
      setSelectedWorkflow((current) => (current?.id === workflowId ? null : current));
      toast.success("Workflow deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete workflow");
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-120px)] flex-col gap-6 lg:flex-row">
      <aside className="w-full rounded-3xl border border-border-subtle bg-surface-default p-5 lg:max-w-[360px]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Automations</h1>
            <p className="mt-1 text-sm text-text-tertiary">Build and manage CRM workflows</p>
          </div>
          <button type="button" onClick={createNew} className="btn-primary">
            <Plus className="h-4 w-4" /> New automation
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {loading ? (
            <SkeletonRow count={4} widths={["80%", "60%"]} />
          ) : error ? (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-200">{error}</div>
          ) : workflows.length === 0 ? (
            selectedWorkflow ? (
              <EmptyState
                icon={<Bot className="h-8 w-8" />}
                title="No automations yet"
                description="Create a new workflow to automate repetitive CRM tasks."
                action={{
                  label: "New automation",
                  onClick: createNew,
                }}
              />
            ) : (
              <div className="rounded-2xl border border-border-subtle bg-bg-secondary/40 p-5 text-sm text-text-secondary">
                Start by creating a new automation to see it appear here.
              </div>
            )
          ) : (
            workflows.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                selected={selectedId === workflow.id}
                onSelect={() => setSelectedWorkflow(workflow)}
                onToggle={() => toggleSelected(workflow.id)}
                onDelete={() => deleteWorkflow(workflow.id)}
              />
            ))
          )}
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        {selectedWorkflow ? (
          <WorkflowBuilder
            workflow={selectedWorkflow}
            onWorkflowChange={updateSelected}
            onSave={persistSelected}
            saving={saving}
          />
        ) : (
          <div className="rounded-3xl border border-border-subtle bg-surface-default p-10 text-center text-text-secondary">
            Select a workflow or create a new automation to begin.
          </div>
        )}
      </main>
    </div>
  );
}

export default function AutomationsPage() {
  return (
    <AppLayout pageTitle="Automations">
      <AutomationsContent />
    </AppLayout>
  );
}
