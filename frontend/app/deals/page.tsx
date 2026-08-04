"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonRow from "@/components/ui/SkeletonRow";
import {
  Building2,
  CalendarClock,
  IndianRupee,
  Download,
  Loader2,
  Plus,
  Search,
  Trash2,
  ChevronDown,
  LayoutGrid,
} from "lucide-react"
import AppLayout, { useWorkspace } from "@/components/AppLayout";
import { downloadCsv } from "@/lib/csv-utils";
import { toast } from "sonner";
import {
  opportunitiesApi,
  StageColumn,
  CreateOpportunityInput,
  DealRow,
} from "@/lib/opportunities-api";
import { companiesApi, CompanyRow } from "@/lib/companies-api";
import { peopleApi, PersonRow } from "@/lib/people-api";
import {
  formatDealCurrency,
} from "./deal-normalizers";
import {
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

function AddDealModal({
  workspaceId,
  stages,
  companies,
  initialCompanyId,
  onClose,
  onAddCompany,
  onCreated,
}: {
  workspaceId: string;
  stages: StageColumn[];
  companies: CompanyRow[];
  initialCompanyId?: string | null;
  onClose: () => void;
  onAddCompany: (company: CompanyRow) => void;
  onCreated: (deal: DealRow & { stageName: string; companyId?: string | null }) => void;
}) {
  const [form, setForm] = useState<CreateOpportunityInput>({
    name: "",
    stageId: stages[0]?.id ?? "",
    companyId: initialCompanyId ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [showCompanyInput, setShowCompanyInput] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [error, setError] = useState("");

  const handleAddNewCompany = async () => {
    const value = newCompanyName.trim();
    if (!value) return;
    setCreatingCompany(true);
    setError("");
    try {
      const company = await companiesApi.create(workspaceId, { name: value });
      onAddCompany(company);
      setForm((current) => ({ ...current, companyId: company.id }));
      setNewCompanyName("");
      setShowCompanyInput(false);
      toast.success("Company created successfully");
    } catch (err: any) {
      setError(err.message || "Failed to create company.");
    } finally {
      setCreatingCompany(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Deal name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const deal = await opportunitiesApi.create(workspaceId, form);
      const stageName = stages.find((s) => s.id === form.stageId)?.name ?? "";
      onCreated({ ...(deal as DealRow), stageName, companyId: form.companyId ?? null });
    } catch (err: any) {
      setError(err.message || "Failed to create deal.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">New deal</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-field">
            <label className="form-label">Deal name *</label>
            <input
              className="form-input"
              placeholder="Acme Corp Expansion"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Amount</label>
              <input
                className="form-input"
                type="number"
                min="0"
                placeholder="500000"
                value={form.amount ?? ""}
                onChange={(e) =>
                  setForm({ ...form, amount: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </div>
            <div className="form-field">
              <label className="form-label">Stage</label>
              <select
                className="form-input"
                value={form.stageId ?? ""}
                onChange={(e) => setForm({ ...form, stageId: e.target.value })}
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-field">
            <div className="flex items-center justify-between mb-1.5">
              <label className="form-label mb-0">Company</label>
              {!showCompanyInput && (
                <button
                  type="button"
                  className="text-xs text-orbit-primary hover:underline"
                  onClick={() => setShowCompanyInput(true)}
                >
                  + Add new
                </button>
              )}
            </div>
            {showCompanyInput ? (
              <div className="flex flex-col gap-2">
                <input
                  className="form-input"
                  placeholder="Biswajit Corp"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleAddNewCompany();
                    }
                  }}
                />
                <div className="flex items-center gap-2">
                  <button type="button" className="btn-primary" onClick={handleAddNewCompany} disabled={creatingCompany}>
                    {creatingCompany ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setShowCompanyInput(false);
                      setNewCompanyName("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <select
                className="form-input"
                value={form.companyId ?? ""}
                onChange={(e) => setForm({ ...form, companyId: e.target.value || undefined })}
              >
                <option value="">No company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="form-field">
            <label className="form-label">Expected close date</label>
            <input
              className="form-input"
              type="date"
              value={form.closeDate ?? ""}
              onChange={(e) => setForm({ ...form, closeDate: e.target.value || undefined })}
            />
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-footer">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create deal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatCurrency(amount: number | null) {
  return formatDealCurrency(amount);
}

function formatDate(date: string | null) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}



function DraggableDealCard({
  deal,
  stages,
  movingDealId,
  handleMoveStage,
  handleDeleteDeal,
  formatCurrency,
  formatDate,
  router,
  disabled,
  onClick,
}: {
  deal: DealRow;
  stages: StageColumn[];
  movingDealId: string | null;
  handleMoveStage: (id: string, currentStageId: string, newStageId: string) => Promise<void>;
  handleDeleteDeal: (id: string, stageId: string) => Promise<void>;
  formatCurrency: (amount: number | null) => string | null;
  formatDate: (date: string | null) => string | null;
  router: any;
  disabled: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    disabled,
    data: {
      deal,
      stageId: deal.stageId,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative cursor-pointer rounded border border-border-subtle bg-bg-tertiary p-4 shadow-sm transition-colors hover:border-orbit-primary ${
        disabled ? "" : "touch-none"
      }`}
      onClick={(e) => {
        if (transform) return; // ignore click if dragged
        onClick();
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium leading-snug text-text-primary">{deal.name}</h3>
        <div className="flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100" onClick={(e) => e.stopPropagation()}>
          <label className="relative inline-flex cursor-pointer items-center justify-center overflow-hidden rounded border border-border-subtle bg-surface-default text-text-tertiary hover:text-orbit-primary focus-within:text-orbit-primary">
            <select
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              value={deal.stageId}
              disabled={movingDealId === deal.id}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                void handleMoveStage(deal.id, deal.stageId, e.target.value);
              }}
              aria-label={`Move ${deal.name} to another stage`}
            >
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
            {movingDealId === deal.id ? (
              <Loader2 className="m-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <ChevronDown className="m-1.5 h-3.5 w-3.5" />
            )}
          </label>
          <button
            type="button"
            className="text-text-tertiary transition-colors duration-200 hover:text-error focus:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              void handleDeleteDeal(deal.id, deal.stageId);
            }}
            aria-label={`Delete ${deal.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {deal.company && <p className="mt-1 text-xs text-text-tertiary">{deal.company}</p>}
      <div className="mt-3 flex flex-col gap-1.5">
        {deal.amount !== null && (
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <IndianRupee className="h-3.5 w-3.5 shrink-0 text-orbit-primary" />
            <span className="font-mono">{formatCurrency(deal.amount)}</span>
          </div>
        )}
        {deal.closeDate && (
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
            <span className="font-mono">Close {formatDate(deal.closeDate)}</span>
          </div>
        )}
      </div>
    </article>
  );
}

function DroppableStageColumn({
  column,
  activeStageId,
  children,
}: {
  column: StageColumn;
  activeStageId: string | null;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded border bg-bg-secondary p-4 transition-all duration-200 ${
        isOver ? "border-orbit-primary bg-bg-tertiary shadow-md" : "border-border-subtle"
      } ${
        activeStageId === column.id
          ? "block w-full min-w-0 shrink-0 sm:min-w-70 sm:max-w-75"
          : "hidden sm:block sm:min-w-70 sm:max-w-75 sm:shrink-0"
      }`}
      style={{ borderTopColor: column.color, borderTopWidth: 2 }}
    >
      {children}
    </div>
  );
}

function DealsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { workspaceId } = useWorkspace();
  const [stages, setStages] = useState<StageColumn[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [contacts, setContacts] = useState<PersonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [movingDealId, setMovingDealId] = useState<string | null>(null);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: "asc" | "desc" }>({ column: "name", direction: "asc" });

  useEffect(() => {
    setStages([]);
  }, [workspaceId]);

  // DnD & Responsiveness states
  const [isMobile, setIsMobile] = useState(false);
  const [activeDragDeal, setActiveDragDeal] = useState<DealRow | null>(null);
  const initialCompanyId = searchParams.get("companyId");

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (initialCompanyId) {
      setShowModal(true);
    }
  }, [initialCompanyId]);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  });

  const sensors = useSensors(pointerSensor, touchSensor);

  const handleDragStart = (event: DragStartEvent) => {
    if (isMobile) return;
    const deal = event.active.data.current?.deal as DealRow | undefined;
    if (deal) {
      setActiveDragDeal(deal);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragDeal(null);
    if (isMobile) return;
    const { active, over } = event;
    if (!over) return;

    const dealId = active.id as string;
    const newStageId = over.id as string;
    const currentStageId = active.data.current?.stageId as string | undefined;

    if (currentStageId && currentStageId !== newStageId) {
      void handleMoveStage(dealId, currentStageId, newStageId);
    }
  };

  const handleExportCsv = () => {
    const hasDeals = stages.some((s) => s.deals.length > 0);
    if (!hasDeals) {
      toast.error("No deals to export");
      return;
    }
    const headers = ["Name", "Amount", "Stage Name", "Close Date", "Probability"];
    const rows = stages.flatMap((s) =>
      s.deals.map((d) => [
        d.name,
        d.amount?.toString() ?? "0",
        s.name,
        d.closeDate ? new Date(d.closeDate).toISOString().split("T")[0] : "",
        s.probability?.toString() ?? "",
      ])
    );
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((value) => {
            const text = value ?? "";
            if (/[",\n]/.test(text)) {
              return `"${text.replace(/"/g, '""')}"`;
            }
            return text;
          })
          .join(",")
      ),
    ].join("\n");

    downloadCsv(csvContent, `deals-${new Date().toISOString().split("T")[0]}.csv`);
    toast.success("Deals exported to CSV");
  };


  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.event?.startsWith("opportunity.")) setRefreshTrigger((v) => v + 1);
    };
    window.addEventListener("crm:update", handler);
    return () => window.removeEventListener("crm:update", handler);
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    if (stages.length === 0) {
      setLoading(true);
    }

    Promise.all([
      opportunitiesApi.list(workspaceId),
      companiesApi.list(workspaceId).catch(() => []),
      peopleApi.list(workspaceId).then((res) => res.data).catch(() => []),
    ])
      .then(([opportunities, workspaceCompanies, workspaceContacts]) => {
        setStages(opportunities.stages);
        setCompanies(workspaceCompanies);
        setContacts(workspaceContacts);
        if (opportunities.stages.length > 0) {
          setActiveStageId((prev) =>
            prev && opportunities.stages.some((s) => s.id === prev) ? prev : opportunities.stages[0].id,
          );
        }
      })
      .catch((err: any) => setError(err.message || "Failed to load deals."))
      .finally(() => setLoading(false));
  }, [workspaceId, refreshTrigger, stages.length]);

  useEffect(() => {
    if (!boardRef.current || stages.length === 0) return;

    const board = boardRef.current;
    const resetScroll = () => {
      board.scrollLeft = 0;
    };

    resetScroll();
    const frameId = window.requestAnimationFrame(resetScroll);
    return () => window.cancelAnimationFrame(frameId);
  }, [stages.length]);

  const filteredStages = useMemo(() => {
    return stages.map(stage => ({
      ...stage,
      deals: stage.deals.filter(d => {
        if (!search.trim()) return true;
        return d.name.toLowerCase().includes(search.toLowerCase());
      })
    }));
  }, [stages, search]);

  const totalDeals = filteredStages.reduce((acc, s) => acc + s.deals.length, 0);
  const pipelineValue = filteredStages
    .filter((s) => s.name !== "Won" && s.name !== "Lost")
    .reduce((acc, s) => acc + s.deals.reduce((a, d) => a + (d.amount ?? 0), 0), 0);

  const handleDealCreated = (deal: DealRow & { stageName: string; companyId?: string | null }) => {
    const companyName = deal.companyId ? companies.find((company) => company.id === deal.companyId)?.name ?? null : null;
    const nextDeal: DealRow = {
      id: deal.id,
      name: deal.name,
      amount: deal.amount,
      closeDate: deal.closeDate,
      stageId: deal.stageId,
      company: companyName,
    };

    setStages((prev) =>
      prev.map((s) => {
        if (s.id !== deal.stageId) return s;
        if (s.deals.some((d) => d.id === deal.id)) return s;
        return { ...s, deals: [nextDeal, ...s.deals] };
      })
    );
    setShowModal(false);
  };

  const handleDeleteDeal = async (id: string, stageId: string) => {
    try {
      await opportunitiesApi.delete(id);
      toast.success("Deal deleted successfully");
      setStages((prev) =>
        prev.map((s) => (s.id === stageId ? { ...s, deals: s.deals.filter((d) => d.id !== id) } : s)),
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to delete deal.");
    }
  };

  const handleMoveStage = async (id: string, currentStageId: string, newStageId: string) => {
    if (currentStageId === newStageId) return;

    const currentStage = stages.find((stage) => stage.id === currentStageId);
    const targetStage = stages.find((stage) => stage.id === newStageId);
    const deal = currentStage?.deals.find((item) => item.id === id);

    if (!currentStage || !targetStage || !deal) {
      toast.error("Unable to move deal.");
      return;
    }

    setMovingDealId(id);

    const previousStages = stages;
    const optimisticDeal = { ...deal, stageId: newStageId };

    setStages((prev) =>
      prev.map((stage) => {
        if (stage.id === currentStageId) {
          return { ...stage, deals: stage.deals.filter((item) => item.id !== id) };
        }

        if (stage.id === newStageId) {
          return { ...stage, deals: [optimisticDeal, ...stage.deals] };
        }

        return stage;
      }),
    );

    try {
      await opportunitiesApi.update(id, { stageId: newStageId });
      toast.success(`Moved to ${targetStage.name}`);
    } catch (err: any) {
      setStages(previousStages);
      toast.error(err.message || "Failed to update stage.");
    } finally {
      setMovingDealId(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6 md:gap-8 md:p-8">
      <section className="rounded-xl border border-border-subtle bg-surface-default p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-text-secondary">Deals</p>
            <h2 className="mt-2 text-2xl font-semibold md:text-3xl">Opportunity board</h2>
            <p className="mt-1 max-w-2xl text-sm text-text-secondary">
              Review pipeline health, spot stuck deals, and keep revenue momentum visible.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            {!loading && (
              <div className="font-mono text-sm text-text-secondary">
                {totalDeals} deal{totalDeals !== 1 ? "s" : ""}
                {pipelineValue > 0 && <> · {formatCurrency(pipelineValue)}</>}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                id="deals-add-btn"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded bg-orbit-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-orbit-primary-hover"
                onClick={() => setShowModal(true)}
                disabled={!workspaceId || loading || stages.length === 0}
              >
                <Plus className="h-4 w-4" />
                New deal
              </button>

              <button
                type="button"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded border border-border-subtle bg-bg-secondary px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-tertiary transition"
                onClick={handleExportCsv}
                disabled={!workspaceId || loading || stages.length === 0}
                aria-label="Export deals to CSV"
              >
                <Download className="h-4 w-4" />
                Export
              </button>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" aria-hidden="true" />
                <input
                  className="w-full rounded border border-border-subtle bg-bg-secondary py-2 pl-9 pr-4 text-sm text-text-primary outline-none focus:border-orbit-primary"
                  placeholder="Search deals..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search deals"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {loading && (
        <div className="flex items-center justify-center gap-3 py-20 text-text-tertiary">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading pipeline…</span>
        </div>
      )}

      {!loading && error && <div className="py-12 text-center text-sm text-error">{error}</div>}

      {!loading && !error && stages.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="rounded-full bg-orbit-primary-muted p-4">
            <LayoutGrid className="h-8 w-8 text-orbit-primary" />
          </div>
          <div>
            <p className="font-medium text-text-primary">No pipeline found</p>
            <p className="mt-1 text-sm text-text-secondary">Your workspace pipeline will appear here automatically.</p>
          </div>
        </div>
      )}

      {!loading && !error && stages.length > 0 && (
        <div className="mb-4 flex gap-2 overflow-x-auto border-b border-border-subtle pb-3 scrollbar-none sm:hidden">
          {filteredStages.map((column) => (
            <button
              key={column.id}
              onClick={() => setActiveStageId(column.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition ${
                activeStageId === column.id
                  ? "bg-orbit-primary text-white"
                  : "border border-border-subtle bg-bg-secondary text-text-secondary hover:bg-bg-tertiary"
              }`}
            >
              {column.name} ({column.deals.length})
            </button>
          ))}
        </div>
      )}

      {!loading && !error && stages.length > 0 && (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <section ref={boardRef} className="flex gap-4 overflow-x-auto pb-4">
            {filteredStages.map((column) => (
              <DroppableStageColumn
                key={column.id}
                column={column}
                activeStageId={activeStageId}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold">{column.name}</h2>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {column.deals.length} deal{column.deals.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="rounded bg-bg-tertiary px-2.5 py-1 font-mono text-xs text-text-secondary">
                    {column.deals.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {column.deals.length === 0 ? (
                    <div className="rounded border border-dashed border-border-subtle py-6 text-center text-xs text-text-tertiary">
                      No deals
                    </div>
                  ) : (
                    column.deals.map((deal) => (
                      <DraggableDealCard
                        key={deal.id}
                        deal={deal}
                        stages={stages}
                        movingDealId={movingDealId}
                        handleMoveStage={handleMoveStage}
                        handleDeleteDeal={handleDeleteDeal}
                        formatCurrency={formatCurrency}
                        formatDate={formatDate}
                        router={router}
                        disabled={isMobile}
                        onClick={() => router.push(`/deals/${deal.id}`)}
                      />
                    ))
                  )}
                </div>
              </DroppableStageColumn>
            ))}
          </section>

          <DragOverlay>
            {activeDragDeal ? (
              <div className="rounded border border-orbit-primary bg-bg-tertiary p-4 shadow-lg rotate-2 scale-105 pointer-events-none">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium leading-snug text-text-primary">{activeDragDeal.name}</h3>
                </div>
                {activeDragDeal.company && <p className="mt-1 text-xs text-text-tertiary">{activeDragDeal.company}</p>}
                <div className="mt-3 flex flex-col gap-1.5">
                  {activeDragDeal.amount !== null && (
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <IndianRupee className="h-3.5 w-3.5 shrink-0 text-orbit-primary" />
                      <span className="font-mono">{formatCurrency(activeDragDeal.amount)}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {showModal && workspaceId && stages.length > 0 && (
        <AddDealModal
          workspaceId={workspaceId}
          stages={stages}
          companies={companies}
          initialCompanyId={initialCompanyId}
          onAddCompany={(newCompany) => {
            setCompanies((prev) => [...prev, newCompany]);
          }}
          onClose={() => {
            setShowModal(false);
            if (initialCompanyId) {
              router.replace("/deals");
            }
          }}
          onCreated={handleDealCreated}
        />
      )}

    </div>
  );
}

export default function DealsPage() {
  return (
    <AppLayout pageTitle="Deals">
      <Suspense fallback={null}>
        <DealsContent />
      </Suspense>
    </AppLayout>
  );
}
