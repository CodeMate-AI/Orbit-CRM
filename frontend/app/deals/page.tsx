"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  CalendarClock,
  CircleDollarSign,
  Loader2,
  Mail,
  Phone,
  Plus,
  Trash2,
  UserRound,
  X,
  ChevronDown,
  LayoutGrid,
} from "lucide-react";
import AppLayout, { useWorkspace } from "@/components/AppLayout";
import AttachmentList from "@/components/AttachmentList";
import NotesTimeline from "@/components/NotesTimeline";
import { toast } from "sonner";
import {
  opportunitiesApi,
  StageColumn,
  CreateOpportunityInput,
  DealRow,
  OpportunityDetailRow,
} from "@/lib/opportunities-api";
import { companiesApi, CompanyRow } from "@/lib/companies-api";
import { peopleApi, PersonRow } from "@/lib/people-api";
import {
  formatDealCurrency,
  normalizeDealAmount,
  normalizeDealCloseDate,
  normalizeDealOptionalString,
} from "./deal-normalizers";

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

function toDateInputValue(date: string | null) {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function mapDetailToCard(detail: OpportunityDetailRow): DealRow {
  return {
    id: detail.id,
    name: detail.name,
    amount: detail.amount,
    closeDate: detail.closeDate,
    stageId: detail.stageId,
    company: detail.company?.name ?? null,
  };
}

function DrawerField({
  label,
  value,
  placeholder,
  saving,
  onChange,
  onSave,
  type = "text",
}: {
  label: string;
  value: string;
  placeholder: string;
  saving: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  type?: "text" | "number";
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-secondary/40 p-4">
      <div className="mb-2 text-xs font-medium uppercase tracking-[0.24em] text-text-tertiary">{label}</div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          className="w-full min-w-0 flex-1 rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-orbit-primary"
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onSave}
        />
        <button type="button" className="btn-primary min-w-[88px] justify-center text-xs h-9 py-0" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </button>
      </div>
    </div>
  );
}

function DealDetailDrawer({
  dealId,
  open,
  stages,
  companies,
  contacts,
  onClose,
  onDealUpdated,
}: {
  dealId: string | null;
  open: boolean;
  stages: StageColumn[];
  companies: CompanyRow[];
  contacts: PersonRow[];
  onClose: () => void;
  onDealUpdated: (detail: OpportunityDetailRow, previousStageId: string) => void;
}) {
  const { workspaceId } = useWorkspace();
  const [detail, setDetail] = useState<OpportunityDetailRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savingField, setSavingField] = useState<string | null>(null);
  const [linkingContactId, setLinkingContactId] = useState("");
  const [linkRole, setLinkRole] = useState("");
  const [linking, setLinking] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"contacts" | "summary" | "notes" | "files">("contacts");
  const [form, setForm] = useState({
    name: "",
    amount: "",
    stageId: "",
    companyId: "",
    closeDate: "",
  });

  useEffect(() => {
    if (!open || !dealId) return;

    setLoading(true);
    setError("");
    setActiveTab("contacts");
    opportunitiesApi
      .get(dealId)
      .then((res) => {
        setDetail(res);
        setForm({
          name: res.name ?? "",
          amount: res.amount === null ? "" : String(res.amount),
          stageId: res.stageId,
          companyId: res.companyId ?? "",
          closeDate: toDateInputValue(res.closeDate),
        });
      })
      .catch((err: any) => setError(err.message || "Failed to load deal details."))
      .finally(() => setLoading(false));
  }, [open, dealId]);

  useEffect(() => {
    if (!open) {
      setDetail(null);
      setError("");
      setSavingField(null);
      setLinkingContactId("");
      setLinkRole("");
      setLinking(false);
      setUnlinkingId(null);
      setActiveTab("contacts");
    }
  }, [open]);

  const availableContacts = useMemo(() => {
    const assignedIds = new Set(detail?.contacts.map((contact) => contact.id) ?? []);
    return contacts.filter((person) => !assignedIds.has(person.id));
  }, [contacts, detail]);

  const persistUpdate = async (field: string, payload: Partial<CreateOpportunityInput>) => {
    if (!detail) return;
    setSavingField(field);
    const previousStageId = detail.stageId;

    try {
      const updated = await opportunitiesApi.update(detail.id, payload);
      const nextDetail: OpportunityDetailRow = {
        ...detail,
        ...updated,
        companyId: payload.companyId !== undefined ? payload.companyId ?? null : detail.companyId,
        company:
          payload.companyId !== undefined
            ? companies.find((company) => company.id === payload.companyId) ?? null
            : detail.company,
      };
      setDetail(nextDetail);
      setForm((current) => ({
        ...current,
        name: nextDetail.name,
        amount: nextDetail.amount === null ? "" : String(nextDetail.amount),
        stageId: nextDetail.stageId,
        companyId: nextDetail.companyId ?? "",
        closeDate: toDateInputValue(nextDetail.closeDate),
      }));
      onDealUpdated(nextDetail, previousStageId);
      toast.success("Deal updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update deal.");
      setForm((current) => ({
        ...current,
        name: detail.name,
        amount: detail.amount === null ? "" : String(detail.amount),
        stageId: detail.stageId,
        companyId: detail.companyId ?? "",
        closeDate: toDateInputValue(detail.closeDate),
      }));
    } finally {
      setSavingField(null);
    }
  };

  const saveName = async () => {
    if (!detail) return;
    const nextName = form.name.trim();
    if (!nextName) {
      toast.error("Deal name is required.");
      setForm((current) => ({ ...current, name: detail.name }));
      return;
    }
    if (nextName === detail.name) return;
    await persistUpdate("name", { name: nextName });
  };

  const saveAmount = async () => {
    if (!detail) return;
    const nextAmount = normalizeDealAmount(form.amount);
    const currentAmount = detail.amount ?? null;
    if (nextAmount === currentAmount) return;
    await persistUpdate("amount", { amount: nextAmount });
  };


  const saveStage = async (value: string) => {
    if (!detail || value === detail.stageId) return;
    setForm((current) => ({ ...current, stageId: value }));
    await persistUpdate("stageId", { stageId: value });
  };

  const saveCompany = async (value: string) => {
    if (!detail) return;
    const normalized = normalizeDealOptionalString(value);
    if ((detail.companyId ?? null) === normalized) return;
    setForm((current) => ({ ...current, companyId: value }));
    await persistUpdate("companyId", { companyId: normalized });
  };

  const saveCloseDate = async (value: string) => {
    if (!detail) return;
    const normalized = normalizeDealCloseDate(value);
    const currentValue = normalizeDealCloseDate(toDateInputValue(detail.closeDate));
    if (normalized === currentValue) return;
    setForm((current) => ({ ...current, closeDate: value }));
    await persistUpdate("closeDate", { closeDate: normalized });
  };

  const handleLinkContact = async () => {
    if (!detail || !linkingContactId) return;
    setLinking(true);
    try {
      const updated = await opportunitiesApi.linkContact(detail.id, linkingContactId, linkRole.trim() || undefined);
      setDetail(updated);
      setLinkingContactId("");
      setLinkRole("");
      toast.success("Contact linked successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to link contact.");
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkContact = async (personId: string) => {
    if (!detail) return;
    setUnlinkingId(personId);
    try {
      const updated = await opportunitiesApi.unlinkContact(detail.id, personId);
      setDetail(updated);
      toast.success("Contact unlinked successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to unlink contact.");
    } finally {
      setUnlinkingId(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-[720px] flex-col overflow-hidden border-l border-border-subtle bg-bg-tertiary shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4 md:px-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-text-tertiary">Deal detail</p>
            <h2 className="mt-1 text-lg font-semibold text-text-primary">Opportunity drawer</h2>
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle text-text-secondary transition hover:bg-surface-hover hover:text-text-primary"
            onClick={onClose}
            aria-label="Close deal drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading && (
          <div className="flex flex-1 items-center justify-center gap-3 text-text-secondary">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading deal details…</span>
          </div>
        )}

        {!loading && error && (
          <div className="m-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
        )}

        {!loading && !error && detail && (
          <div className="flex-1 overflow-y-auto px-5 py-5 text-text-primary md:px-6 md:py-6">
            <div className="rounded-[28px] border border-border-subtle bg-[radial-gradient(circle_at_top_right,_rgba(129,116,248,0.12),_transparent_35%),linear-gradient(180deg,_var(--bg-secondary),_var(--bg-primary))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] md:p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <input
                    className="w-full bg-transparent text-2xl font-semibold text-white outline-none placeholder:text-slate-400 md:text-3xl"
                    value={form.name}
                    onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                    onBlur={() => void saveName()}
                    placeholder="Deal name"
                  />
                  <p className="mt-2 text-sm text-slate-300">
                    Revenue target {formatCurrency(detail.amount) ?? "—"}
                    {detail.company?.name ? ` · ${detail.company.name}` : " · No linked company"}
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-slate-200 transition hover:border-white/30 hover:bg-white/5"
                  onClick={() => void saveName()}
                  disabled={savingField === "name"}
                >
                  {savingField === "name" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save title"}
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <DrawerField
                label="Amount"
                value={form.amount}
                placeholder="500000"
                saving={savingField === "amount"}
                onChange={(value) => setForm((current) => ({ ...current, amount: value }))}
                onSave={() => void saveAmount()}
                type="number"
              />


              <div className="rounded-2xl border border-border-subtle bg-bg-secondary/40 p-4">
                <div className="mb-2 text-xs font-medium uppercase tracking-[0.24em] text-text-tertiary">Stage</div>
                <select
                  className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-orbit-primary"
                  value={form.stageId}
                  onChange={(e) => void saveStage(e.target.value)}
                  disabled={savingField === "stageId"}
                >
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-border-subtle bg-bg-secondary/40 p-4">
                <div className="mb-2 text-xs font-medium uppercase tracking-[0.24em] text-text-tertiary">Company</div>
                <select
                  className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-orbit-primary"
                  value={form.companyId}
                  onChange={(e) => void saveCompany(e.target.value)}
                  disabled={savingField === "companyId"}
                >
                  <option value="">No company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-border-subtle bg-bg-secondary/40 p-4 md:col-span-2">
                <div className="mb-2 text-xs font-medium uppercase tracking-[0.24em] text-text-tertiary">Expected close date</div>
                <input
                  className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-orbit-primary"
                  type="date"
                  value={form.closeDate}
                  onChange={(e) => void saveCloseDate(e.target.value)}
                  disabled={savingField === "closeDate"}
                />
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-border-subtle bg-bg-secondary/30 p-4 text-sm text-text-secondary">
              <div className="flex flex-wrap gap-4">
                <span>
                  Current value: <strong className="text-text-primary">{formatCurrency(detail.amount) ?? "—"}</strong>
                </span>
                <span>
                  Company: <strong className="text-text-primary">{detail.company?.name ?? "Unassigned"}</strong>
                </span>
                <span>
                  Close date: <strong className="text-text-primary">{formatDate(detail.closeDate) ?? "—"}</strong>
                </span>
              </div>
            </div>

            <div className="mt-6">
              <div className="inline-flex rounded-full border border-border-subtle bg-bg-tertiary p-1">
                <button
                  type="button"
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    activeTab === "contacts" ? "bg-orbit-primary text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
                  }`}
                  onClick={() => setActiveTab("contacts")}
                >
                  Contacts ({detail.contacts.length})
                </button>
                <button
                  type="button"
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    activeTab === "summary" ? "bg-orbit-primary text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
                  }`}
                  onClick={() => setActiveTab("summary")}
                >
                  Summary
                </button>
                <button
                  type="button"
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    activeTab === "notes" ? "bg-orbit-primary text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
                  }`}
                  onClick={() => setActiveTab("notes")}
                >
                  Notes
                </button>
                <button
                  type="button"
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    activeTab === "files" ? "bg-orbit-primary text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
                  }`}
                  onClick={() => setActiveTab("files")}
                >
                  Files
                </button>
              </div>

              {activeTab === "contacts" ? (
                <div className="pt-4">
                  <div className="rounded-2xl border border-border-subtle bg-bg-secondary/40 p-4">
                    <h3 className="text-sm font-semibold text-text-primary">Link workspace contacts</h3>
                    <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                      <select
                        className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-orbit-primary"
                        value={linkingContactId}
                        onChange={(e) => setLinkingContactId(e.target.value)}
                      >
                        <option value="">Select a contact</option>
                        {availableContacts.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.name}
                            {person.company ? ` · ${person.company}` : ""}
                          </option>
                        ))}
                      </select>
                      <input
                        className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-orbit-primary"
                        placeholder="Role (optional)"
                        value={linkRole}
                        onChange={(e) => setLinkRole(e.target.value)}
                      />
                      <button type="button" className="btn-primary justify-center" onClick={() => void handleLinkContact()} disabled={!linkingContactId || linking}>
                        {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Link
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {detail.contacts.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border-subtle px-4 py-8 text-center text-sm text-text-tertiary">
                        No contacts linked to this deal yet.
                      </div>
                    ) : (
                      detail.contacts.map((contact) => (
                        <div key={contact.id} className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface-default p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                              <UserRound className="h-4 w-4 text-orbit-primary" />
                              <span className="truncate">{contact.name}</span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-text-secondary">
                              {contact.role && <span>{contact.role}</span>}
                              {contact.jobTitle && <span>{contact.jobTitle}</span>}
                              {contact.email && (
                                <span className="inline-flex items-center gap-1">
                                  <Mail className="h-3.5 w-3.5" />
                                  {contact.email}
                                </span>
                              )}
                              {contact.phone && (
                                <span className="inline-flex items-center gap-1">
                                  <Phone className="h-3.5 w-3.5" />
                                  {contact.phone}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-subtle px-3 py-2 text-xs font-medium text-text-secondary transition hover:border-red-200 hover:text-red-600"
                            onClick={() => void handleUnlinkContact(contact.id)}
                            disabled={unlinkingId === contact.id}
                          >
                            {unlinkingId === contact.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                            Unlink
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : activeTab === "summary" ? (
                <div className="grid gap-4 pt-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border-subtle bg-bg-secondary/40 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-text-tertiary">Stage</p>
                    <p className="mt-2 text-lg font-semibold text-text-primary">
                      {stages.find((stage) => stage.id === detail.stageId)?.name ?? "Unknown"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border-subtle bg-bg-secondary/40 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-text-tertiary">Linked contacts</p>
                    <p className="mt-2 text-lg font-semibold text-text-primary">{detail.contacts.length}</p>
                  </div>
                  <div className="rounded-2xl border border-border-subtle bg-bg-secondary/40 p-4 md:col-span-2">
                    <p className="text-xs uppercase tracking-[0.24em] text-text-tertiary">Expected close date</p>
                    <p className="mt-2 text-lg font-semibold text-text-primary">{formatDate(detail.closeDate) ?? "No close date"}</p>
                  </div>
                </div>
              ) : activeTab === "notes" ? (
                workspaceId && (
                  <NotesTimeline
                    workspaceId={workspaceId}
                    entityType="opportunity"
                    entityId={detail.id}
                  />
                )
              ) : (
                workspaceId && (
                  <AttachmentList workspaceId={workspaceId} entityType="opportunity" entityId={detail.id} />
                )
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function DealsContent() {
  const { workspaceId } = useWorkspace();
  const [stages, setStages] = useState<StageColumn[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [contacts, setContacts] = useState<PersonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [movingDealId, setMovingDealId] = useState<string | null>(null);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
    setLoading(true);

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
  }, [workspaceId, refreshTrigger]);

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
    setStages((prev) => prev.map((s) => (s.id === deal.stageId ? { ...s, deals: [deal, ...s.deals] } : s)));
    setShowModal(false);
  };

  const handleDeleteDeal = async (id: string, stageId: string) => {
    try {
      await opportunitiesApi.delete(id);
      toast.success("Deal deleted successfully");
      setStages((prev) =>
        prev.map((s) => (s.id === stageId ? { ...s, deals: s.deals.filter((d) => d.id !== id) } : s)),
      );
      if (selectedDealId === id) {
        setSelectedDealId(null);
      }
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

  const handleDealUpdatedFromDrawer = (detail: OpportunityDetailRow, previousStageId: string) => {
    const nextCard = mapDetailToCard(detail);
    setStages((prev) => {
      const withoutDeal = prev.map((stage) => ({
        ...stage,
        deals: stage.deals.filter((deal) => deal.id !== detail.id),
      }));

      return withoutDeal.map((stage) => {
        if (stage.id !== detail.stageId) return stage;

        const previousStage = prev.find((column) => column.id === previousStageId);
        const previousCard = previousStage?.deals.find((deal) => deal.id === detail.id);
        const inserted = previousCard ? previousCard : nextCard;

        return {
          ...stage,
          deals: [inserted, ...stage.deals].map((deal) => (deal.id === detail.id ? nextCard : deal)),
        };
      });
    });
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
          {stages.map((column) => (
            <button
              key={column.id}
              onClick={() => setActiveStageId(column.id)}
              className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-medium transition ${
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
        <section ref={boardRef} className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((column) => (
            <div
              key={column.id}
              className={`rounded border border-border-subtle bg-bg-secondary p-4 transition-all duration-200 ${
                activeStageId === column.id
                  ? "block w-full min-w-0 flex-shrink-0 sm:min-w-[280px] sm:max-w-[300px]"
                  : "hidden sm:block sm:min-w-[280px] sm:max-w-[300px] sm:flex-shrink-0"
              }`}
              style={{ borderTopColor: column.color, borderTopWidth: 2 }}
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
                    <article
                      key={deal.id}
                      className="group relative cursor-pointer rounded border border-border-subtle bg-bg-tertiary p-4 shadow-sm transition-colors hover:border-orbit-primary"
                      onClick={() => setSelectedDealId(deal.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-medium leading-snug text-text-primary">{deal.name}</h3>
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
                            <CircleDollarSign className="h-3.5 w-3.5 shrink-0 text-orbit-primary" />
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
                  ))
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {showModal && workspaceId && stages.length > 0 && (
        <AddDealModal
          workspaceId={workspaceId}
          stages={stages}
          onClose={() => setShowModal(false)}
          onCreated={handleDealCreated}
        />
      )}

      <DealDetailDrawer
        dealId={selectedDealId}
        open={Boolean(selectedDealId)}
        stages={stages}
        companies={companies}
        contacts={contacts}
        onClose={() => setSelectedDealId(null)}
        onDealUpdated={handleDealUpdatedFromDrawer}
      />
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
