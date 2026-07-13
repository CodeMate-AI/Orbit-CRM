"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarClock, CircleDollarSign, Plus, Loader2, LayoutGrid, Trash2, ChevronDown } from "lucide-react";
import AppLayout, { useWorkspace } from "@/components/AppLayout";
import { toast } from "sonner";
import {
  opportunitiesApi,
  StageColumn,
  CreateOpportunityInput,
  DealRow,
} from "@/lib/opportunities-api";

// ── Add Deal Modal ─────────────────────────────────────────────────────────
function AddDealModal({
  workspaceId,
  stages,
  onClose,
  onCreated,
}: {
  workspaceId: string;
  stages: StageColumn[];
  onClose: () => void;
  onCreated: (deal: DealRow & { stageName: string }) => void;
}) {
  const [form, setForm] = useState<CreateOpportunityInput>({
    name: "",
    currency: "INR",
    stageId: stages[0]?.id ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
      onCreated({ ...(deal as DealRow), stageName });
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
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
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
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create deal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Formatters ─────────────────────────────────────────────────────────────
function formatCurrency(amount: number | null, currency = "INR") {
  if (amount === null || amount === 0) return null;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function formatDate(date: string | null) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ── Page Content ───────────────────────────────────────────────────────────
function DealsContent() {
  const { workspaceId } = useWorkspace();
  const [stages, setStages] = useState<StageColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [movingDealId, setMovingDealId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    opportunitiesApi
      .list(workspaceId)
      .then((res) => setStages(res.stages))
      .catch((err) => setError(err.message || "Failed to load deals."))
      .finally(() => setLoading(false));
  }, [workspaceId]);

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

  const totalDeals = stages.reduce((acc, s) => acc + s.deals.length, 0);
  const pipelineValue = stages
    .filter((s) => s.name !== "Won" && s.name !== "Lost")
    .reduce((acc, s) => acc + s.deals.reduce((a, d) => a + (d.amount ?? 0), 0), 0);

  const handleDealCreated = (deal: DealRow & { stageName: string }) => {
    setStages((prev) =>
      prev.map((s) =>
        s.id === deal.stageId ? { ...s, deals: [deal, ...s.deals] } : s,
      ),
    );
    setShowModal(false);
  };

  const handleDeleteDeal = async (id: string, stageId: string) => {
    try {
      await opportunitiesApi.delete(id);
      toast.success("Deal deleted successfully");
      setStages((prev) =>
        prev.map((s) =>
          s.id === stageId ? { ...s, deals: s.deals.filter((d) => d.id !== id) } : s
        )
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
    <div className="p-6 md:p-8 mx-auto flex w-full max-w-7xl flex-col gap-6 md:gap-8">
      {/* Header */}
      <section className="rounded-xl border border-border-subtle bg-surface-default p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-text-secondary">Deals</p>
            <h2 className="mt-2 text-2xl md:text-3xl font-semibold">Opportunity board</h2>
            <p className="mt-1 max-w-2xl text-sm text-text-secondary">
              Review pipeline health, spot stuck deals, and keep revenue momentum visible.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {!loading && (
              <div className="text-sm text-text-secondary font-mono">
                {totalDeals} deal{totalDeals !== 1 ? "s" : ""}
                {pipelineValue > 0 && (
                  <> · {formatCurrency(pipelineValue)}</>
                )}
              </div>
            )}
            <button
              id="deals-add-btn"
              className="inline-flex items-center gap-2 rounded bg-orbit-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-orbit-primary-hover"
              onClick={() => setShowModal(true)}
              disabled={!workspaceId || loading || stages.length === 0}
            >
              <Plus className="h-4 w-4" />
              New deal
            </button>
          </div>
        </div>
      </section>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-20 text-text-tertiary">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading pipeline…</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="py-12 text-center text-sm text-error">{error}</div>
      )}

      {/* Empty state — no pipeline (new workspace) */}
      {!loading && !error && stages.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="rounded-full bg-orbit-primary-muted p-4">
            <LayoutGrid className="h-8 w-8 text-orbit-primary" />
          </div>
          <div>
            <p className="font-medium text-text-primary">No pipeline found</p>
            <p className="mt-1 text-sm text-text-secondary">
              Your workspace pipeline will appear here automatically.
            </p>
          </div>
        </div>
      )}

      {/* Kanban board */}
      {!loading && !error && stages.length > 0 && (
        <section ref={boardRef} className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((column) => (
            <div
              key={column.id}
              className="min-w-[260px] max-w-[300px] flex-shrink-0 rounded border border-border-subtle bg-bg-secondary p-4"
              style={{ borderTopColor: column.color, borderTopWidth: 2 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-sm">{column.name}</h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {column.deals.length} deal{column.deals.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <span className="rounded bg-bg-tertiary px-2.5 py-1 text-xs text-text-secondary font-mono">
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
                    <article
                      key={deal.id}
                      className="group relative rounded border border-border-subtle bg-bg-tertiary p-4 shadow-sm hover:border-orbit-primary transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-sm text-text-primary leading-snug">{deal.name}</h3>
                        <div className="flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
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
                              <Loader2 className="h-3.5 w-3.5 animate-spin m-1.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 m-1.5" />
                            )}
                          </label>
                          <button
                            type="button"
                            className="text-text-tertiary hover:text-error transition-colors duration-200 focus:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDeal(deal.id, deal.stageId);
                            }}
                            aria-label={`Delete ${deal.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {deal.company && (
                        <p className="mt-1 text-xs text-text-tertiary">{deal.company}</p>
                      )}
                      <div className="mt-3 flex flex-col gap-1.5">
                        {deal.amount !== null && (
                          <div className="flex items-center gap-2 text-xs text-text-secondary">
                            <CircleDollarSign className="h-3.5 w-3.5 text-orbit-primary shrink-0" />
                            <span className="font-mono">{formatCurrency(deal.amount, deal.currency)}</span>
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
                  ))
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Modal */}
      {showModal && workspaceId && stages.length > 0 && (
        <AddDealModal
          workspaceId={workspaceId}
          stages={stages}
          onClose={() => setShowModal(false)}
          onCreated={handleDealCreated}
        />
      )}
    </div>
  );
}

export default function DealsPage() {
  return (
    <AppLayout pageTitle="Deals">
      <DealsContent />
    </AppLayout>
  );
}
