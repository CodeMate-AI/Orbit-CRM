"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Download,
  Grip,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
  UserX,
  X,
} from "lucide-react";
import AppLayout, { useWorkspace } from "@/components/AppLayout";
import AttachmentList from "@/components/AttachmentList";
import CSVImportModal from "@/components/CSVImportModal";
import NotesTimeline from "@/components/NotesTimeline";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonRow from "@/components/ui/SkeletonRow";
import { peopleApi, PersonRow, CreatePersonInput } from "@/lib/people-api";
import { companiesApi, CompanyRow } from "@/lib/companies-api";
import { downloadCsv } from "@/lib/csv-utils";
import { toast } from "sonner";

type SortableColumn =
  | "name"
  | "email"
  | "phone"
  | "company"
  | "jobTitle"
  | "lastActivity"
  | "leadSource"
  | "industry";

type SortConfig = {
  column: SortableColumn;
  direction: "asc" | "desc";
};

type DecoratedLead = PersonRow & {
  lastActivity: string;
  lastActivitySort: number;
  leadSource: string;
  industry: string;
  initials: string;
  avatarGradient: string;
};

type EditableLeadField =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "jobTitle"
  | "companyId"
  | "leadSource"
  | "industry";

type LeadDrawerForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  companyId: string;
  leadSource: string;
  industry: string;
};

const LEAD_SOURCE_OPTIONS = ["LinkedIn", "Referral", "Event", "Website", "Email campaign", "Trade show"];
const INDUSTRY_OPTIONS = [
  "Manufacturing",
  "Logistics",
  "Technology",
  "Retail",
  "Finance",
  "Creative",
  "Construction",
  "Healthcare",
  "SaaS",
  "Education",
  "Food and Beverages",
];
const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #6b5ed4, #a094fa)",
  "linear-gradient(135deg, #d46b5e, #faa094)",
  "linear-gradient(135deg, #5e8cd4, #94bdfa)",
  "linear-gradient(135deg, #8c5ed4, #c094fa)",
  "linear-gradient(135deg, #d48c5e, #fac094)",
  "linear-gradient(135deg, #5ed4a0, #94fac0)",
  "linear-gradient(135deg, #d4b55e, #fae094)",
  "linear-gradient(135deg, #5e6bd4, #949dfa)",
  "linear-gradient(135deg, #5ea0d4, #94d0fa)",
  "linear-gradient(135deg, #a05ed4, #d094fa)",
];
const INDIAN_PHONE_ERROR =
  "Phone must be a valid Indian phone number starting with +91 or 91, followed by exactly 10 digits.";

function formatRelativeTime(dateStr: string | Date) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function deriveInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getStableIndex(id: string, length: number) {
  let hash = 0;

  for (let i = 0; i < id.length; i += 1) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }

  return Math.abs(hash) % length;
}

function decorateLeads(Leads: PersonRow[]): DecoratedLead[] {
  return Leads.map((Lead) => {
    const gradientIndex = getStableIndex(Lead.id, AVATAR_GRADIENTS.length);

    return {
      ...Lead,
      lastActivity: formatRelativeTime(Lead.createdAt),
      lastActivitySort: new Date(Lead.createdAt).getTime(),
      leadSource: Lead.leadSource ?? "—",
      industry: Lead.industry ?? "—",
      initials: deriveInitials(Lead.name),
      avatarGradient: AVATAR_GRADIENTS[gradientIndex],
    };
  });
}

function compareText(a: string | null | undefined, b: string | null | undefined, direction: "asc" | "desc") {
  const normalizedA = (a ?? "").toLowerCase();
  const normalizedB = (b ?? "").toLowerCase();
  const comparison = normalizedA.localeCompare(normalizedB);
  return direction === "asc" ? comparison : comparison * -1;
}

function validatePhoneNumber(phone: string | null | undefined): boolean {
  if (!phone) return true;

  const clean = phone.replace(/\s+/g, "");
  if (clean.startsWith("+")) {
    return /^\+91\d{10}$/.test(clean);
  }
  if (clean.length === 12 && clean.startsWith("91")) {
    return /^91\d{10}$/.test(clean);
  }
  return /^\d{10}$/.test(clean);
}

function CheckboxIcon({ checked, indeterminate }: { checked: boolean; indeterminate?: boolean }) {
  return (
    <span className={`checkbox ${checked ? "checked" : ""} ${indeterminate ? "indeterminate" : ""}`.trim()}>
      {checked && !indeterminate ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : null}
    </span>
  );
}

function buildDrawerForm(Lead: PersonRow): LeadDrawerForm {
  return {
    firstName: Lead.firstName,
    lastName: Lead.lastName,
    email: Lead.email ?? "",
    phone: Lead.phone ?? "",
    jobTitle: Lead.jobTitle ?? "",
    companyId: Lead.companyId ?? "",
    leadSource: Lead.leadSource ?? "",
    industry: Lead.industry ?? "",
  };
}

function mapLeadUpdate(Lead: PersonRow) {
  return (current: PersonRow) =>
    current.id === Lead.id
      ? {
          ...current,
          ...Lead,
        }
      : current;
}

function DrawerField({
  label,
  value,
  placeholder,
  saving,
  onChange,
  onSave,
  type = "text",
  error,
}: {
  label: string;
  value: string;
  placeholder: string;
  saving: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  type?: string;
  error?: string;
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-secondary/40 p-4">
      <label className="mb-2 block text-xs font-medium uppercase tracking-[0.24em] text-text-tertiary">{label}</label>
      <input
        className={`w-full rounded-xl border ${error ? "border-red-400/60" : "border-border-subtle"} bg-bg-tertiary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-orbit-primary`}
        value={value}
        placeholder={placeholder}
        type={type}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onSave}
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="min-h-[20px] text-xs text-red-300">{error ?? ""}</div>
        <button
          type="button"
          className="btn-primary h-9 min-w-[88px] justify-center py-0 text-xs"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </button>
      </div>
    </div>
  );
}

function DrawerSelectField({
  label,
  value,
  saving,
  options,
  placeholder,
  onChange,
  onSave,
}: {
  label: string;
  value: string;
  saving: boolean;
  options: string[];
  placeholder: string;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-secondary/40 p-4">
      <label className="mb-2 block text-xs font-medium uppercase tracking-[0.24em] text-text-tertiary">{label}</label>
      <select
        className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-orbit-primary"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onSave}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          className="btn-primary h-9 min-w-[88px] justify-center py-0 text-xs"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </button>
      </div>
    </div>
  );
}

function LeadDetailDrawer({
  open,
  Lead,
  companies,
  onClose,
  onLeadUpdated,
}: {
  open: boolean;
  Lead: PersonRow | null;
  companies: CompanyRow[];
  onClose: () => void;
  onLeadUpdated: (Lead: PersonRow) => void;
}) {
  const { workspaceId } = useWorkspace();
  const [form, setForm] = useState<LeadDrawerForm | null>(null);
  const [savingField, setSavingField] = useState<EditableLeadField | null>(null);
  const [phoneError, setPhoneError] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "notes" | "files">("details");

  useEffect(() => {
    setForm(Lead ? buildDrawerForm(Lead) : null);
    setPhoneError("");
    setActiveTab("details");
  }, [Lead]);

  if (!open || !Lead || !form) return null;

  const updateFieldValue = (field: EditableLeadField, value: string) => {
    setForm((current) => (current ? { ...current, [field]: value } : current));
    if (field === "phone") {
      setPhoneError("");
    }
  };

  const persistField = async (field: EditableLeadField) => {
    if (!Lead || !form) return;

    const currentFormValue = form[field];
    const normalizedFormValue = currentFormValue.trim();
    const currentLeadValue = (() => {
      switch (field) {
        case "firstName":
          return Lead.firstName;
        case "lastName":
          return Lead.lastName;
        case "email":
          return Lead.email ?? "";
        case "phone":
          return Lead.phone ?? "";
        case "jobTitle":
          return Lead.jobTitle ?? "";
        case "companyId":
          return Lead.companyId ?? "";
        case "leadSource":
          return Lead.leadSource ?? "";
        case "industry":
          return Lead.industry ?? "";
      }
    })();

    const payloadValue = field === "companyId" ? currentFormValue : normalizedFormValue;

    if (payloadValue === currentLeadValue) {
      return;
    }

    if ((field === "firstName" || field === "lastName") && !normalizedFormValue) {
      toast.error(`${field === "firstName" ? "First" : "Last"} name is required.`);
      setForm(buildDrawerForm(Lead));
      return;
    }

    if (field === "phone" && !validatePhoneNumber(normalizedFormValue)) {
      setPhoneError(INDIAN_PHONE_ERROR);
      return;
    }

    setSavingField(field);
    try {
      const updated = await peopleApi.update(Lead.id, {
        [field]: field === "companyId" ? payloadValue : payloadValue || undefined,
      });
      onLeadUpdated(updated);
      setForm(buildDrawerForm(updated));
      setPhoneError("");
      toast.success("Lead updated successfully");
    } catch (err: any) {
      setForm(buildDrawerForm(Lead));
      setPhoneError("");
      toast.error(err.message || "Failed to save Lead changes.");
    } finally {
      setSavingField(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-[720px] flex-col overflow-hidden border-l border-border-subtle bg-bg-tertiary shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4 md:px-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-text-tertiary">Lead detail</p>
            <h2 className="mt-1 text-lg font-semibold text-text-primary">Editable relationship profile</h2>
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle text-text-secondary transition hover:bg-surface-hover hover:text-text-primary"
            onClick={onClose}
            aria-label="Close Lead drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 text-text-primary md:px-6 md:py-6">
          <div className="rounded-[28px] border border-border-subtle bg-[radial-gradient(circle_at_top_right,_rgba(129,116,248,0.12),_transparent_35%),linear-gradient(180deg,_var(--bg-secondary),_var(--bg-primary))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] md:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-lg font-semibold text-white shadow-lg"
                  style={{ background: AVATAR_GRADIENTS[getStableIndex(Lead.id, AVATAR_GRADIENTS.length)] }}
                >
                  {deriveInitials(Lead.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-semibold text-white">{form.firstName} {form.lastName}</p>
                  <p className="mt-2 text-sm text-slate-300">
                    Created {new Date(Lead.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full border border-border-subtle bg-bg-secondary px-3 py-2 text-sm text-slate-100">
                      {Lead.company ?? "Unassigned company"}
                    </span>
                    <span className="inline-flex rounded-full border border-border-subtle bg-bg-secondary px-3 py-2 text-sm text-slate-100">
                      {Lead.jobTitle ?? "No title added"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs Selector */}
          <div className="mt-6 flex border-b border-border-subtle">
            <button
              type="button"
              className={`border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                activeTab === "details"
                  ? "border-orbit-primary text-white"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
              onClick={() => setActiveTab("details")}
            >
              Details
            </button>
            <button
              type="button"
              className={`border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                activeTab === "notes"
                  ? "border-orbit-primary text-white"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
              onClick={() => setActiveTab("notes")}
            >
              Notes
            </button>
            <button
              type="button"
              className={`border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                activeTab === "files"
                  ? "border-orbit-primary text-white"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
              onClick={() => setActiveTab("files")}
            >
              Files
            </button>
          </div>

          {activeTab === "details" ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <DrawerField
                label="First name"
                value={form.firstName}
                placeholder="Priya"
                saving={savingField === "firstName"}
                onChange={(value) => updateFieldValue("firstName", value)}
                onSave={() => persistField("firstName")}
              />
              <DrawerField
                label="Last name"
                value={form.lastName}
                placeholder="Sharma"
                saving={savingField === "lastName"}
                onChange={(value) => updateFieldValue("lastName", value)}
                onSave={() => persistField("lastName")}
              />
              <DrawerField
                label="Email"
                value={form.email}
                placeholder="priya@company.com"
                saving={savingField === "email"}
                onChange={(value) => updateFieldValue("email", value)}
                onSave={() => persistField("email")}
                type="email"
              />
              <DrawerField
                label="Phone"
                value={form.phone}
                placeholder="+91 98765 43210"
                saving={savingField === "phone"}
                onChange={(value) => updateFieldValue("phone", value)}
                onSave={() => persistField("phone")}
                error={phoneError}
              />
              <DrawerField
                label="Job title"
                value={form.jobTitle}
                placeholder="VP of Sales"
                saving={savingField === "jobTitle"}
                onChange={(value) => updateFieldValue("jobTitle", value)}
                onSave={() => persistField("jobTitle")}
              />
              <DrawerSelectField
                label="Lead source"
                value={form.leadSource}
                saving={savingField === "leadSource"}
                options={LEAD_SOURCE_OPTIONS}
                placeholder="Select lead source"
                onChange={(value) => updateFieldValue("leadSource", value)}
                onSave={() => persistField("leadSource")}
              />
              <DrawerSelectField
                label="Industry"
                value={form.industry}
                saving={savingField === "industry"}
                options={INDUSTRY_OPTIONS}
                placeholder="Select industry"
                onChange={(value) => updateFieldValue("industry", value)}
                onSave={() => persistField("industry")}
              />
              <div className="rounded-2xl border border-border-subtle bg-bg-secondary/40 p-4">
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.24em] text-text-tertiary">Company</label>
                <select
                  className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-orbit-primary"
                  value={form.companyId}
                  onChange={(e) => updateFieldValue("companyId", e.target.value)}
                  onBlur={() => persistField("companyId")}
                >
                  <option value="">No company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    className="btn-primary h-9 min-w-[88px] justify-center py-0 text-xs"
                    onClick={() => persistField("companyId")}
                    disabled={savingField === "companyId"}
                  >
                    {savingField === "companyId" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                  </button>
                </div>
              </div>
            </div>
          ) : activeTab === "notes" ? (
            workspaceId && (
              <NotesTimeline
                workspaceId={workspaceId}
                entityType="person"
                entityId={Lead.id}
              />
            )
          ) : (
            workspaceId && (
              <AttachmentList workspaceId={workspaceId} entityType="person" entityId={Lead.id} />
            )
          )}
        </div>
      </aside>
    </div>
  );
}

function AddLeadModal({
  workspaceId,
  companies,
  onClose,
  onCreated,
}: {
  workspaceId: string;
  companies: CompanyRow[];
  onClose: () => void;
  onCreated: (person: PersonRow) => void;
}) {
  const [form, setForm] = useState<CreatePersonInput>({
    firstName: "",
    lastName: "",
    companyId: "",
    leadSource: "",
    industry: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First and last name are required.");
      return;
    }
    if (!validatePhoneNumber(form.phone)) {
      setError(INDIAN_PHONE_ERROR);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const person = await peopleApi.create(workspaceId, form);
      onCreated(person);
    } catch (err: any) {
      setError(err.message || "Failed to create Lead.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add Lead</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">First name *</label>
              <input
                className="form-input"
                placeholder="Priya"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Last name *</label>
              <input
                className="form-input"
                placeholder="Sharma"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="priya@company.com"
              value={form.email ?? ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Phone</label>
            <input
              className="form-input"
              placeholder="+91 98765 43210"
              value={form.phone ?? ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Lead source</label>
              <select
                className="form-input"
                value={form.leadSource ?? ""}
                onChange={(e) => setForm({ ...form, leadSource: e.target.value || undefined })}
              >
                <option value="">Select a lead source...</option>
                {LEAD_SOURCE_OPTIONS.map((leadSource) => (
                  <option key={leadSource} value={leadSource}>
                    {leadSource}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Industry</label>
              <select
                className="form-input"
                value={form.industry ?? ""}
                onChange={(e) => setForm({ ...form, industry: e.target.value || undefined })}
              >
                <option value="">Select an industry...</option>
                {INDUSTRY_OPTIONS.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Company</label>
            <select
              className="form-input"
              value={form.companyId ?? ""}
              onChange={(e) => setForm({ ...form, companyId: e.target.value || undefined })}
            >
              <option value="">Select a company...</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Job title</label>
            <input
              className="form-input"
              placeholder="VP of Sales"
              value={form.jobTitle ?? ""}
              onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
            />
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-footer">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LeadsContent() {
  const router = useRouter();
  const { workspaceId } = useWorkspace();
  const [Leads, setLeads] = useState<PersonRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: "name", direction: "asc" });
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.event?.startsWith("person.")) setRefreshTrigger((v) => v + 1);
    };
    window.addEventListener("crm:update", handler);
    return () => window.removeEventListener("crm:update", handler);
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    Promise.all([peopleApi.list(workspaceId), companiesApi.list(workspaceId)])
      .then(([peopleResponse, companyResponse]) => {
        setLeads(peopleResponse.data);
        setCompanies(companyResponse);
        setSelectedIds(new Set());
      })
      .catch((err) => setError(err.message || "Failed to load Leads."))
      .finally(() => setLoading(false));
  }, [workspaceId, refreshTrigger]);

  const decoratedLeads = useMemo(() => decorateLeads(Leads), [Leads]);

  const filteredLeads = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = decoratedLeads.filter((Lead) => {
      if (!term) return true;

      return [
        Lead.name,
        Lead.email ?? "",
        Lead.phone ?? "",
        Lead.company ?? "",
        Lead.jobTitle ?? "",
        Lead.industry,
        Lead.leadSource,
      ].some((value) => value.toLowerCase().includes(term));
    });

    return [...filtered].sort((a, b) => {
      switch (sortConfig.column) {
        case "name":
          return compareText(a.name, b.name, sortConfig.direction);
        case "email":
          return compareText(a.email, b.email, sortConfig.direction);
        case "phone":
          return compareText(a.phone, b.phone, sortConfig.direction);
        case "company":
          return compareText(a.company, b.company, sortConfig.direction);
        case "jobTitle":
          return compareText(a.jobTitle, b.jobTitle, sortConfig.direction);
        case "leadSource":
          return compareText(a.leadSource, b.leadSource, sortConfig.direction);
        case "industry":
          return compareText(a.industry, b.industry, sortConfig.direction);
        case "lastActivity": {
          const comparison = a.lastActivitySort - b.lastActivitySort;
          return sortConfig.direction === "asc" ? comparison : comparison * -1;
        }
        default:
          return 0;
      }
    });
  }, [decoratedLeads, search, sortConfig]);

  const visibleSelectedCount = filteredLeads.filter((Lead) => selectedIds.has(Lead.id)).length;
  const allVisibleSelected = filteredLeads.length > 0 && visibleSelectedCount === filteredLeads.length;
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;
  const newThisMonth = Leads.filter((c) => {
    const d = new Date(c.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const handleSort = (column: SortableColumn) => {
    setSortConfig((current) => {
      if (current.column === column) {
        return { column, direction: current.direction === "asc" ? "desc" : "asc" };
      }

      return { column, direction: "asc" };
    });
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        filteredLeads.forEach((Lead) => next.delete(Lead.id));
      } else {
        filteredLeads.forEach((Lead) => next.add(Lead.id));
      }
      return next;
    });
  };

  const handleDeleteLead = async (id: string) => {
    try {
      await peopleApi.delete(id);
      toast.success("Lead deleted successfully");
      setLeads((prev) => prev.filter((c) => c.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete Lead.");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => peopleApi.delete(id)));
      toast.success(`Successfully deleted ${selectedIds.size} Leads`);
      setLeads((prev) => prev.filter((c) => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
    } catch (err: any) {
      toast.error(err.message || "Failed to delete Leads.");
    } finally {
      setIsDeleting(false);
    }
  };

  const renderSortArrow = (column: SortableColumn) => {
    if (sortConfig.column !== column) return null;
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="sort-arrow" aria-hidden="true" />
    ) : (
      <ArrowDown className="sort-arrow" aria-hidden="true" />
    );
  };

  const renderHeaderCell = (label: string, column: SortableColumn, className: string) => (
    <th className={`${className} sortable`}>
      <button type="button" className="th-button" onClick={() => handleSort(column)}>
        <span className="th-content">
          <Grip className="grip" aria-hidden="true" />
          <span>{label}</span>
          {renderSortArrow(column)}
        </span>
      </button>
    </th>
  );

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
      <section className="contacts-shell">
        <header className="contacts-header">
          <div className="contacts-header-main">
            <div>
              <p className="contacts-kicker">Revenue workspace</p>
              <h1 className="page-title contacts-page-title">Leads</h1>
            </div>
          </div>

          <div className="contacts-toolbar">
            <button
              id="Leads-add-btn"
              className="btn-primary"
              onClick={() => setShowModal(true)}
              disabled={!workspaceId}
            >
              <Plus className="h-4 w-4" />
              Add Lead
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowImportModal(true)}
              disabled={!workspaceId}
              aria-label="Import Leads from CSV"
            >
              <Upload className="h-4 w-4" />
              Import
            </button>

            <button
              type="button"
              className="btn-secondary"
              disabled={!workspaceId || isExporting}
              aria-label="Export Leads to CSV"
              onClick={async () => {
                if (!workspaceId) return;
                setIsExporting(true);
                try {
                  const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/people/export?workspaceId=${workspaceId}`,
                    { credentials: "include" },
                  );
                  if (!res.ok) throw new Error("Export failed");
                  const text = await res.text();
                  downloadCsv(text, `Leads-${new Date().toISOString().split("T")[0]}.csv`);
                } catch {
                  toast.error("Failed to export Leads");
                } finally {
                  setIsExporting(false);
                }
              }}
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export
            </button>

            <div className="search-wrap">
              <Search className="h-4 w-4" aria-hidden="true" />
              <input
                className="search-input"
                placeholder="Search Leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search Leads"
              />
            </div>
          </div>
        </header>

        {selectedIds.size > 0 && (
          <div className="bulk-bar" role="status" aria-live="polite">
            <span className="bulk-count">{selectedIds.size} selected</span>
            <div className="bulk-actions">
              <button
                type="button"
                className="bulk-btn bulk-btn-danger"
                onClick={handleBulkDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        )}

        <section className="contacts-table-section">
          <div className="contacts-metrics">
            <div className="contacts-metric-card">
              <span className="contacts-metric-label">Total Leads</span>
              <span className="contacts-metric-value">{loading ? "—" : Leads.length.toLocaleString()}</span>
            </div>
            <div className="contacts-metric-card">
              <span className="contacts-metric-label">New this month</span>
              <span className="contacts-metric-value">{loading ? "—" : newThisMonth.toString()}</span>
            </div>
          </div>

          {loading && (
            <SkeletonRow count={6} widths={["30%", "20%", "15%", "15%", "10%", "10%"]} />
          )}

          {!loading && !error && Leads.length === 0 && (
            <div className="contacts-feedback-state is-empty">
              <EmptyState
                icon={<UserX className="h-8 w-8" />}
                title="No Leads yet"
                description="Add your first Lead to populate the premium table."
                action={{
                  label: "Add first Lead",
                  onClick: () => setShowModal(true),
                }}
              />
            </div>
          )}

          {!loading && error && <div className="contacts-feedback-state is-error">{error}</div>}

          {!loading && !error && Leads.length > 0 && filteredLeads.length === 0 && (
            <div className="contacts-feedback-state is-empty">
              <EmptyState
                icon={<Search className="h-8 w-8" />}
                title="No Leads match your search"
                description={`Try refining your search terms for "${search}".`}
              />
            </div>
          )}

          {!loading && !error && filteredLeads.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="col-checkbox">
                      <button
                        type="button"
                        className="checkbox-button"
                        onClick={toggleAllVisible}
                        aria-label={allVisibleSelected ? "Deselect all visible Leads" : "Select all visible Leads"}
                        aria-pressed={allVisibleSelected}
                      >
                        <CheckboxIcon checked={allVisibleSelected} indeterminate={someVisibleSelected} />
                      </button>
                    </th>
                    {renderHeaderCell("Name", "name", "col-name")}
                    {renderHeaderCell("Email", "email", "col-email")}
                    {renderHeaderCell("Phone", "phone", "col-phone")}
                    {renderHeaderCell("Company", "company", "col-company")}
                    {renderHeaderCell("Job title", "jobTitle", "col-title")}
                    {renderHeaderCell("Last activity", "lastActivity", "col-activity")}
                    {renderHeaderCell("Lead source", "leadSource", "col-source")}
                    {renderHeaderCell("Industry", "industry", "col-industry")}
                    <th className="col-actions" />
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((Lead) => {
                    const isSelected = selectedIds.has(Lead.id);
                    const isHovered = hoveredRowId === Lead.id;

                    return (
                      <tr
                        key={Lead.id}
                        className={`${isSelected ? "is-selected" : ""} ${isHovered ? "is-hovered" : ""} cursor-pointer`.trim()}
                        onMouseEnter={() => setHoveredRowId(Lead.id)}
                        onMouseLeave={() => setHoveredRowId((current) => (current === Lead.id ? null : current))}
                        onClick={() => router.push(`/leads/${Lead.id}`)}
                      >
                        <td className="col-checkbox">
                          <button
                            type="button"
                            className="checkbox-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleSelection(Lead.id);
                            }}
                            aria-label={`${isSelected ? "Deselect" : "Select"} ${Lead.name}`}
                            aria-pressed={isSelected}
                          >
                            <CheckboxIcon checked={isSelected} />
                          </button>
                        </td>
                        <td className="col-name">
                          <div className="name-cell">
                            <div className="avatar" style={{ background: Lead.avatarGradient }}>
                              {Lead.initials}
                            </div>
                            <span className="record-name">{Lead.name}</span>
                          </div>
                        </td>
                        <td className="col-email">{Lead.email ?? "—"}</td>
                        <td className="col-phone mono-data">{Lead.phone ?? "—"}</td>
                        <td className="col-company">
                          <span className="company-chip">{Lead.company ?? "—"}</span>
                        </td>
                        <td className="col-title">{Lead.jobTitle ?? "—"}</td>
                        <td className="col-activity mono-data">{Lead.lastActivity}</td>
                        <td className="col-source mono-data">{Lead.leadSource}</td>
                        <td className="col-industry">{Lead.industry}</td>
                        <td className="col-actions">
                          <div className="row-actions">
                            <button
                              type="button"
                              className="row-action-btn text-error hover:text-red-400"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteLead(Lead.id);
                              }}
                              aria-label={`Delete ${Lead.name}`}
                            >
                              <Trash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>

      {showModal && workspaceId && (
        <AddLeadModal
          workspaceId={workspaceId}
          companies={companies}
          onClose={() => setShowModal(false)}
          onCreated={(person) => {
            setLeads((prev) => {
              if (prev.some((c) => c.id === person.id)) return prev;
              return [person, ...prev];
            });
            setSelectedIds(new Set());
            setShowModal(false);
          }}
        />
      )}

      {workspaceId && (
        <CSVImportModal
          open={showImportModal}
          workspaceId={workspaceId}
          onClose={() => setShowImportModal(false)}
          onImportQueued={() => {
            setShowImportModal(false);
            setRefreshTrigger((v) => v + 1);
          }}
        />
      )}

    </div>
  );
}

export default function LeadsPage() {
  return (
    <AppLayout pageTitle="Leads">
      <LeadsContent />
    </AppLayout>
  );
}

