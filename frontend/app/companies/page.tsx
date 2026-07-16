"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TagInput from "@/components/ui/TagInput";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonRow from "@/components/ui/SkeletonRow";
import { tagsApi, type TagRow } from "@/lib/tags-api";
import {
  ArrowDown,
  ArrowUp,
  Building2,
  Download,
  ExternalLink,
  Globe,
  Grip,
  Loader2,
  Plus,
  Search,
  Trash2,
  Users,
  BriefcaseBusiness,
  Link,
  X,
  MapPin,
  Landmark,
} from "lucide-react";
import AppLayout, { useWorkspace } from "@/components/AppLayout";
import AttachmentList from "@/components/AttachmentList";
import NotesTimeline from "@/components/NotesTimeline";
import ViewBar from "@/components/ViewBar";
import { companiesApi, CompanyDetailRow, CompanyRow, CreateCompanyInput } from "@/lib/companies-api";
import { peopleApi, PersonRow } from "@/lib/people-api";
import { viewsApi, ViewRow } from "@/lib/views-api";
import { downloadCsv } from "@/lib/csv-utils";
import { toast } from "sonner";

type SortableColumn =
  | "name"
  | "domain"
  | "industry"
  | "city"
  | "employeeCount"
  | "annualRevenue";

type SortConfig = {
  column: SortableColumn;
  direction: "asc" | "desc";
};

type DecoratedCompany = CompanyRow & {
  initials: string;
  avatarGradient: string;
};

type DrawerTab = "contacts" | "deals" | "notes" | "files";

type EditableCompanyField = Exclude<keyof CreateCompanyInput, never>;

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

function decorateCompanies(companies: CompanyRow[]): DecoratedCompany[] {
  return companies.map((company) => {
    const gradientIndex = getStableIndex(company.id, AVATAR_GRADIENTS.length);
    return {
      ...company,
      initials: deriveInitials(company.name),
      avatarGradient: AVATAR_GRADIENTS[gradientIndex],
    };
  });
}

function formatRevenue(value: number | null) {
  if (value === null || value === 0) return "—";
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatRevenueInput(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function compareText(a: string | null | undefined, b: string | null | undefined, direction: "asc" | "desc") {
  const normalizedA = (a ?? "").toLowerCase();
  const normalizedB = (b ?? "").toLowerCase();
  const comparison = normalizedA.localeCompare(normalizedB);
  return direction === "asc" ? comparison : comparison * -1;
}

function compareNumber(a: number | null | undefined, b: number | null | undefined, direction: "asc" | "desc") {
  const valA = a ?? 0;
  const valB = b ?? 0;
  return direction === "asc" ? valA - valB : valB - valA;
}

function normalizeUrl(url: string | null | undefined, protocol = "https://") {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${protocol}${url}`;
}

function formatDate(date: string | null) {
  if (!date) return "No close date";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "No close date";
  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

function AddCompanyModal({
  workspaceId,
  onClose,
  onCreated,
}: {
  workspaceId: string;
  onClose: () => void;
  onCreated: (company: CompanyRow) => void;
}) {
  const [form, setForm] = useState<CreateCompanyInput & { tags: string[] }>({
    name: "",
    domain: "",
    address: "",
    city: "",
    industry: "",
    employeeCount: undefined,
    annualRevenue: undefined,
    linkedInUrl: "",
    tags: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Company name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { tags, ...rest } = form;
      const data = {
        ...rest,
        employeeCount: rest.employeeCount ? Number(rest.employeeCount) : undefined,
        annualRevenue: rest.annualRevenue ? Number(rest.annualRevenue) : undefined,
      };
      const company = await companiesApi.create(workspaceId, data);
      if (tags.length > 0) {
        const workspaceTags = await tagsApi.list(workspaceId);
        await Promise.all(
          tags.map(async (tagName) => {
            const tag = workspaceTags.find(
              (entry) => entry.name.trim().toLowerCase() === tagName.trim().toLowerCase(),
            );
            if (!tag) return;
            await tagsApi.assign(workspaceId, { entityType: "company", entityId: company.id, tagId: tag.id });
          }),
        );
      }
      onCreated(company);
    } catch (err: any) {
      setError(err.message || "Failed to create company.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add company</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-field">
            <label className="form-label">Company name *</label>
            <input
              className="form-input"
              placeholder="Acme Corp"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Domain</label>
              <input
                className="form-input"
                placeholder="acme.com"
                value={form.domain ?? ""}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Industry</label>
              <input
                className="form-input"
                placeholder="SaaS / Logistics"
                value={form.industry ?? ""}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Employee Count</label>
              <input
                className="form-input"
                type="number"
                min="0"
                placeholder="50"
                value={form.employeeCount ?? ""}
                onChange={(e) => setForm({ ...form, employeeCount: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Annual Revenue (INR)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                placeholder="1000000"
                value={form.annualRevenue ?? ""}
                onChange={(e) => setForm({ ...form, annualRevenue: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">City</label>
            <input
              className="form-input"
              placeholder="Mumbai"
              value={form.city ?? ""}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Address</label>
            <input
              className="form-input"
              placeholder="123 Corporate Park, Bandra Kurla Complex"
              value={form.address ?? ""}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label className="form-label">LinkedIn URL</label>
            <input
              className="form-input"
              type="url"
              placeholder="https://linkedin.com/company/acme"
              value={form.linkedInUrl ?? ""}
              onChange={(e) => setForm({ ...form, linkedInUrl: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Tags</label>
            <TagInput
              workspaceId={workspaceId}
              value={form.tags}
              onChange={(tags) => setForm({ ...form, tags })}
            />
          </div>

          {error && <p className="form-error">{error}</p>}
          <div className="modal-footer">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create company"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DrawerField({
  label,
  icon,
  value,
  placeholder,
  type = "text",
  saving,
  onChange,
  onSave,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  placeholder: string;
  type?: "text" | "number";
  saving: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-secondary/40 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-text-tertiary">
        {icon}
        <span>{label}</span>
      </div>
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

function CompanyDetailDrawer({
  companyId,
  open,
  onClose,
  onCompanyUpdated,
  onContactUpdated,
  allContacts,
}: {
  companyId: string | null;
  open: boolean;
  onClose: () => void;
  onCompanyUpdated: (company: CompanyRow) => void;
  onContactUpdated?: (person: PersonRow) => void;
  allContacts: PersonRow[];
}) {
  const { workspaceId } = useWorkspace();
  const [detail, setDetail] = useState<CompanyDetailRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<DrawerTab>("contacts");
  const [linkingContactId, setLinkingContactId] = useState("");
  const [savingField, setSavingField] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    domain: "",
    linkedInUrl: "",
    industry: "",
    city: "",
    employeeCount: "",
    annualRevenue: "",
    address: "",
  });

  useEffect(() => {
    if (!open || !companyId) {
      return;
    }
    setActiveTab("contacts");

    setLoading(true);
    setError("");
    companiesApi
      .get(companyId)
      .then((company) => {
        setDetail(company);
        setForm({
          name: company.name ?? "",
          domain: company.domain ?? "",
          linkedInUrl: company.linkedInUrl ?? "",
          industry: company.industry ?? "",
          city: company.city ?? "",
          employeeCount: company.employeeCount === null ? "" : String(company.employeeCount),
          annualRevenue: formatRevenueInput(company.annualRevenue),
          address: company.address ?? "",
        });
      })
      .catch((err: any) => setError(err.message || "Failed to load company details."))
      .finally(() => setLoading(false));
  }, [open, companyId]);

  useEffect(() => {
    if (!open) {
      setActiveTab("contacts");
      setLinkingContactId("");
      setSavingField(null);
      setLinking(false);
      setUnlinkingId(null);
    }
  }, [open]);

  const availableContacts = useMemo(
    () => allContacts.filter((person) => !person.companyId || person.companyId !== detail?.id),
    [allContacts, detail?.id],
  );

  const updateFieldValue = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const persistField = async (field: EditableCompanyField) => {
    if (!detail) return;

    const payloadValue = (() => {
      switch (field) {
        case "employeeCount":
          return form.employeeCount.trim() ? Number(form.employeeCount) : null;
        case "annualRevenue":
          return form.annualRevenue.trim() ? Number(form.annualRevenue) : null;
        case "name":
          return form.name.trim();
        case "domain":
          return form.domain.trim();
        case "linkedInUrl":
          return form.linkedInUrl.trim();
        case "industry":
          return form.industry.trim();
        case "city":
          return form.city.trim();
        case "address":
          return form.address.trim();
        default:
          return "";
      }
    })();

    const currentValue = (() => {
      switch (field) {
        case "employeeCount":
          return detail.employeeCount ?? null;
        case "annualRevenue":
          return detail.annualRevenue ?? null;
        case "name":
          return detail.name ?? "";
        case "domain":
          return detail.domain ?? "";
        case "linkedInUrl":
          return detail.linkedInUrl ?? "";
        case "industry":
          return detail.industry ?? "";
        case "city":
          return detail.city ?? "";
        case "address":
          return detail.address ?? "";
        default:
          return "";
      }
    })();

    if (payloadValue === currentValue) {
      return;
    }

    if (field === "name" && typeof payloadValue === "string" && !payloadValue.trim()) {
      toast.error("Company name is required.");
      setForm((current) => ({ ...current, name: detail.name }));
      return;
    }

    setSavingField(field);
    try {
      const updated = await companiesApi.update(detail.id, {
        [field]: payloadValue,
      });
      setDetail((current) =>
        current
          ? {
              ...current,
              ...updated,
            }
          : current,
      );
      onCompanyUpdated(updated);
      toast.success("Company updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save company changes.");
      setForm({
        name: detail.name ?? "",
        domain: detail.domain ?? "",
        linkedInUrl: detail.linkedInUrl ?? "",
        industry: detail.industry ?? "",
        city: detail.city ?? "",
        employeeCount: detail.employeeCount === null ? "" : String(detail.employeeCount),
        annualRevenue: formatRevenueInput(detail.annualRevenue),
        address: detail.address ?? "",
      });
    } finally {
      setSavingField(null);
    }
  };

  const handleLinkContact = async () => {
    if (!detail || !linkingContactId) return;
    setLinking(true);
    try {
      const updated = await peopleApi.update(linkingContactId, { companyId: detail.id });
      const linkedPerson = {
        id: updated.id,
        firstName: updated.firstName,
        lastName: updated.lastName,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        jobTitle: updated.jobTitle,
      };
      setDetail((current) =>
        current
          ? {
              ...current,
              people: [...current.people.filter((person) => person.id !== updated.id), linkedPerson].sort((a, b) =>
                a.firstName.localeCompare(b.firstName),
              ),
            }
          : current,
      );
      setLinkingContactId("");
      onContactUpdated?.(updated);
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
      const updated = await peopleApi.update(personId, { companyId: "" });
      setDetail((current) =>
        current
          ? {
              ...current,
              people: current.people.filter((person) => person.id !== personId),
            }
          : current,
      );
      onContactUpdated?.(updated);
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
            <p className="text-[11px] uppercase tracking-[0.3em] text-text-tertiary">Company detail</p>
            <h2 className="mt-1 text-lg font-semibold text-text-primary">Relationship hub</h2>
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle text-text-secondary transition hover:bg-surface-hover hover:text-text-primary"
            onClick={onClose}
            aria-label="Close company drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading && (
          <div className="flex flex-1 items-center justify-center gap-3 text-text-secondary">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading company details…</span>
          </div>
        )}

        {!loading && error && (
          <div className="m-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
        )}

        {!loading && !error && detail && (
          <div className="flex-1 overflow-y-auto px-5 py-5 md:px-6 md:py-6 text-text-primary">
            <div className="rounded-[28px] border border-border-subtle bg-[radial-gradient(circle_at_top_right,_rgba(129,116,248,0.12),_transparent_35%),linear-gradient(180deg,_var(--bg-secondary),_var(--bg-primary))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] md:p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-lg font-semibold text-white shadow-lg"
                    style={{ background: AVATAR_GRADIENTS[getStableIndex(detail.id, AVATAR_GRADIENTS.length)] }}
                  >
                    {deriveInitials(detail.name)}
                  </div>
                  <div className="min-w-0">
                    <input
                      className="w-full bg-transparent text-2xl font-semibold text-white outline-none placeholder:text-slate-400"
                      value={form.name}
                      onChange={(e) => updateFieldValue("name", e.target.value)}
                      onBlur={() => persistField("name")}
                      placeholder="Company name"
                    />
                    <p className="mt-2 text-sm text-slate-300">
                      Created {new Date(detail.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {detail.domain && (
                        <a
                          href={normalizeUrl(detail.domain) ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-secondary px-3 py-2 text-sm text-slate-100 transition hover:bg-surface-hover"
                        >
                          <Globe className="h-4 w-4" />
                          <span>{detail.domain}</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {detail.linkedInUrl && (
                        <a
                          href={normalizeUrl(detail.linkedInUrl) ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-[#0a66c2]/15 px-3 py-2 text-sm text-blue-100 transition hover:bg-surface-hover"
                        >
                          <Link className="h-4 w-4" />
                          <span>LinkedIn</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:w-[260px] md:grid-cols-2">
                  <div className="rounded-2xl border border-border-subtle bg-bg-secondary p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Contacts</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{detail.people.length}</p>
                  </div>
                  <div className="rounded-2xl border border-border-subtle bg-bg-secondary p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Deals</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{detail.opportunities.length}</p>
                  </div>
                  <div className="rounded-2xl border border-border-subtle bg-bg-secondary p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Employees</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{detail.employeeCount?.toLocaleString() ?? "—"}</p>
                  </div>
                  <div className="rounded-2xl border border-border-subtle bg-bg-secondary p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Revenue</p>
                    <p className="mt-2 text-lg font-semibold text-white">{formatRevenue(detail.annualRevenue)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <DrawerField
                label="Domain"
                icon={<Globe className="h-3.5 w-3.5" />}
                value={form.domain}
                placeholder="acme.com"
                saving={savingField === "domain"}
                onChange={(value) => updateFieldValue("domain", value)}
                onSave={() => persistField("domain")}
              />
              <DrawerField
                label="LinkedIn"
                icon={<Link className="h-3.5 w-3.5" />}
                value={form.linkedInUrl}
                placeholder="https://linkedin.com/company/acme"
                saving={savingField === "linkedInUrl"}
                onChange={(value) => updateFieldValue("linkedInUrl", value)}
                onSave={() => persistField("linkedInUrl")}
              />
              <DrawerField
                label="Industry"
                icon={<Building2 className="h-3.5 w-3.5" />}
                value={form.industry}
                placeholder="Technology"
                saving={savingField === "industry"}
                onChange={(value) => updateFieldValue("industry", value)}
                onSave={() => persistField("industry")}
              />
              <DrawerField
                label="City"
                icon={<MapPin className="h-3.5 w-3.5" />}
                value={form.city}
                placeholder="Bengaluru"
                saving={savingField === "city"}
                onChange={(value) => updateFieldValue("city", value)}
                onSave={() => persistField("city")}
              />
              <DrawerField
                label="Employees"
                icon={<Users className="h-3.5 w-3.5" />}
                value={form.employeeCount}
                placeholder="250"
                type="number"
                saving={savingField === "employeeCount"}
                onChange={(value) => updateFieldValue("employeeCount", value)}
                onSave={() => persistField("employeeCount")}
              />
              <DrawerField
                label="Annual revenue"
                icon={<Landmark className="h-3.5 w-3.5" />}
                value={form.annualRevenue}
                placeholder="12000000"
                type="number"
                saving={savingField === "annualRevenue"}
                onChange={(value) => updateFieldValue("annualRevenue", value)}
                onSave={() => persistField("annualRevenue")}
              />
            </div>

            <div className="mt-4 rounded-2xl border border-border-subtle bg-bg-secondary/40 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-text-tertiary">
                <MapPin className="h-3.5 w-3.5" />
                <span>Address</span>
              </div>
              <textarea
                className="min-h-[104px] w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-orbit-primary"
                value={form.address}
                placeholder="Office address"
                onChange={(e) => updateFieldValue("address", e.target.value)}
                onBlur={() => persistField("address")}
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  className="btn-primary min-w-[88px] justify-center text-xs h-9 py-0"
                  onClick={() => persistField("address")}
                  disabled={savingField === "address"}
                >
                  {savingField === "address" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-[28px] border border-border-subtle bg-bg-secondary/20 p-4 md:p-5">
              <div className="flex flex-col gap-3 border-b border-border-subtle pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">Relationships & Notes</h3>
                  <p className="text-sm text-text-secondary">Manage linked contacts, opportunities, and log notes.</p>
                </div>
                <div className="inline-flex rounded-full border border-border-subtle bg-bg-tertiary p-1">
                  <button
                    type="button"
                    className={`rounded-full px-4 py-2 text-sm transition ${activeTab === "contacts" ? "bg-orbit-primary text-white" : "text-text-secondary hover:text-text-primary"}`}
                    onClick={() => setActiveTab("contacts")}
                  >
                    Contacts
                  </button>
                  <button
                    type="button"
                    className={`rounded-full px-4 py-2 text-sm transition ${activeTab === "deals" ? "bg-orbit-primary text-white" : "text-text-secondary hover:text-text-primary"}`}
                    onClick={() => setActiveTab("deals")}
                  >
                    Deals
                  </button>
                  <button
                    type="button"
                    className={`rounded-full px-4 py-2 text-sm transition ${activeTab === "notes" ? "bg-orbit-primary text-white" : "text-text-secondary hover:text-text-primary"}`}
                    onClick={() => setActiveTab("notes")}
                  >
                    Notes
                  </button>
                  <button
                    type="button"
                    className={`rounded-full px-4 py-2 text-sm transition ${activeTab === "files" ? "bg-orbit-primary text-white" : "text-text-secondary hover:text-text-primary"}`}
                    onClick={() => setActiveTab("files")}
                  >
                    Files
                  </button>
                </div>
              </div>

              {activeTab === "contacts" ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-dashed border-border-subtle bg-bg-secondary/20 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                      <select
                        className="min-w-0 flex-1 rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-orbit-primary"
                        value={linkingContactId}
                        onChange={(e) => setLinkingContactId(e.target.value)}
                      >
                        <option value="">Link an available contact…</option>
                        {availableContacts.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.name}
                            {person.company ? ` — currently ${person.company}` : " — unassigned"}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn-primary justify-center md:min-w-[132px] text-xs h-10 py-0"
                        onClick={handleLinkContact}
                        disabled={!linkingContactId || linking}
                      >
                        {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Link contact"}
                      </button>
                    </div>
                  </div>

                  {detail.people.length === 0 ? (
                    <div className="rounded-2xl border border-border-subtle bg-bg-secondary/10 p-6 text-center text-sm text-text-secondary">
                      No contacts linked yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {detail.people.map((person) => (
                        <div
                          key={person.id}
                          className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-bg-secondary/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orbit-primary-muted text-sm font-semibold text-orbit-primary">
                                {deriveInitials(person.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-text-primary">{person.name}</p>
                                <p className="truncate text-sm text-text-secondary">{person.jobTitle || "No title"}</p>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-3 text-sm text-text-secondary">
                              <span>{person.email || "No email"}</span>
                              <span>{person.phone || "No phone"}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="rounded-full border border-red-400/20 px-4 py-2 text-sm text-red-200 transition hover:bg-red-500/10"
                            onClick={() => handleUnlinkContact(person.id)}
                            disabled={unlinkingId === person.id}
                          >
                            {unlinkingId === person.id ? "Unlinking…" : "Unlink"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : activeTab === "deals" ? (
                <div className="mt-4 space-y-3">
                  {detail.opportunities.length === 0 ? (
                    <div className="rounded-2xl border border-border-subtle bg-bg-secondary/10 p-6 text-center text-sm text-text-secondary">
                      No deals associated with this company.
                    </div>
                  ) : (
                    detail.opportunities.map((opportunity) => (
                      <div
                        key={opportunity.id}
                        className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-bg-secondary/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300">
                              <BriefcaseBusiness className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium text-text-primary">{opportunity.name}</p>
                              <p className="text-sm text-text-secondary">Stage: {opportunity.stageName}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-text-secondary sm:text-right">
                          <p className="font-medium text-text-primary">{formatRevenue(opportunity.amount)}</p>
                          <p>{formatDate(opportunity.closeDate)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : activeTab === "notes" ? (
                workspaceId && (
                  <NotesTimeline
                    workspaceId={workspaceId}
                    entityType="company"
                    entityId={detail.id}
                  />
                )
              ) : (
                workspaceId && (
                  <AttachmentList workspaceId={workspaceId} entityType="company" entityId={detail.id} />
                )
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function CompaniesContent() {
  const router = useRouter();
  const { workspaceId } = useWorkspace();
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [contacts, setContacts] = useState<PersonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: "name", direction: "asc" });
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const [views, setViews] = useState<ViewRow[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    viewsApi.list(workspaceId, "COMPANY")
      .then((data) => {
        setViews(data);
        const defaultView = data.find((v) => v.isDefault);
        if (defaultView) {
          setActiveViewId(defaultView.id);
          const filters = defaultView.filters as any;
          if (filters?.search !== undefined) setSearch(filters.search);
          if (defaultView.sorts) setSortConfig(defaultView.sorts as any);
        }
      })
      .catch((err) => console.error("Failed to load views", err));
  }, [workspaceId]);

  const handleSelectView = (viewId: string | null) => {
    setActiveViewId(viewId);
    if (viewId === null) {
      setSearch("");
      setSortConfig({ column: "name", direction: "asc" });
    } else {
      const view = views.find((v) => v.id === viewId);
      if (view) {
        const filters = view.filters as any;
        setSearch(filters?.search ?? "");
        if (view.sorts) setSortConfig(view.sorts as any);
      }
    }
  };

  const handleCreateView = async (name: string) => {
    if (!workspaceId) return;
    try {
      const newView = await viewsApi.create({
        name,
        entityType: "COMPANY",
        workspaceId,
        filters: { search },
        sorts: sortConfig,
      });
      setViews((prev) => [...prev, newView]);
      setActiveViewId(newView.id);
      toast.success(`View "${name}" created`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create view");
    }
  };

  const handleDeleteView = async (viewId: string) => {
    if (!workspaceId) return;
    try {
      await viewsApi.delete(workspaceId, viewId);
      setViews((prev) => prev.filter((v) => v.id !== viewId));
      if (activeViewId === viewId) {
        handleSelectView(null);
      }
      toast.success("View deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete view");
    }
  };

  const handleUpdateView = async (viewId: string, updates: { name?: string; filters?: any; sorts?: any }) => {
    if (!workspaceId) return;
    try {
      const updated = await viewsApi.update(workspaceId, viewId, updates);
      setViews((prev) => prev.map((v) => (v.id === viewId ? updated : v)));
      toast.success("View updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update view");
    }
  };

  const handleSetDefaultView = async (viewId: string) => {
    if (!workspaceId) return;
    try {
      await viewsApi.setDefault(workspaceId, viewId);
      setViews((prev) =>
        prev.map((v) => ({
          ...v,
          isDefault: v.id === viewId,
        }))
      );
      toast.success("Default view set");
    } catch (err: any) {
      toast.error(err.message || "Failed to set default view");
    }
  };

  const handleSaveChanges = async () => {
    if (!activeViewId || !workspaceId) return;
    await handleUpdateView(activeViewId, {
      filters: { search },
      sorts: sortConfig,
    });
  };

  const hasUnsavedChanges = useMemo(() => {
    if (!activeViewId) return false;
    const activeView = views.find((v) => v.id === activeViewId);
    if (!activeView) return false;
    const activeFilters = activeView.filters as any;
    const activeSorts = activeView.sorts as any;

    const filtersChanged = (activeFilters?.search ?? "") !== search;
    const sortsChanged =
      (activeSorts?.column ?? "name") !== sortConfig.column || (activeSorts?.direction ?? "asc") !== sortConfig.direction;

    return filtersChanged || sortsChanged;
  }, [activeViewId, views, search, sortConfig]);

  const handleExportCsv = () => {
    if (companies.length === 0) {
      toast.error("No companies to export");
      return;
    }
    const headers = ["Name", "Domain", "Industry", "City", "Employee Count", "Annual Revenue"];
    const rows = companies.map((c) => [
      c.name,
      c.domain ?? "",
      c.industry ?? "",
      c.city ?? "",
      c.employeeCount?.toString() ?? "",
      c.annualRevenue?.toString() ?? "",
    ]);
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

    downloadCsv(csvContent, `companies-${new Date().toISOString().split("T")[0]}.csv`);
    toast.success("Companies exported to CSV");
  };


  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.event?.startsWith("company.")) setRefreshTrigger((v) => v + 1);
    };
    window.addEventListener("crm:update", handler);
    return () => window.removeEventListener("crm:update", handler);
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    Promise.all([companiesApi.list(workspaceId), peopleApi.list(workspaceId)])
      .then(([companyRows, peopleResponse]) => {
        setCompanies(companyRows);
        setContacts(peopleResponse.data);
        setSelectedIds(new Set());
      })
      .catch((err: any) => setError(err.message || "Failed to load companies."))
      .finally(() => setLoading(false));
  }, [workspaceId, refreshTrigger]);

  const decoratedCompanies = useMemo(() => decorateCompanies(companies), [companies]);

  const filteredCompanies = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = decoratedCompanies.filter((company) => {
      if (!term) return true;
      return [company.name, company.domain ?? "", company.industry ?? "", company.city ?? "", company.address ?? ""].some((value) =>
        value.toLowerCase().includes(term),
      );
    });

    return [...filtered].sort((a, b) => {
      switch (sortConfig.column) {
        case "name":
          return compareText(a.name, b.name, sortConfig.direction);
        case "domain":
          return compareText(a.domain, b.domain, sortConfig.direction);
        case "industry":
          return compareText(a.industry, b.industry, sortConfig.direction);
        case "city":
          return compareText(a.city, b.city, sortConfig.direction);
        case "employeeCount":
          return compareNumber(a.employeeCount, b.employeeCount, sortConfig.direction);
        case "annualRevenue":
          return compareNumber(a.annualRevenue, b.annualRevenue, sortConfig.direction);
        default:
          return 0;
      }
    });
  }, [decoratedCompanies, search, sortConfig]);

  const visibleSelectedCount = filteredCompanies.filter((company) => selectedIds.has(company.id)).length;
  const allVisibleSelected = filteredCompanies.length > 0 && visibleSelectedCount === filteredCompanies.length;
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;

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
        filteredCompanies.forEach((company) => next.delete(company.id));
      } else {
        filteredCompanies.forEach((company) => next.add(company.id));
      }
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await companiesApi.delete(id);
      toast.success("Company deleted successfully");
      setCompanies((prev) => prev.filter((company) => company.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setContacts((prev) => prev.map((person) => (person.companyId === id ? { ...person, companyId: null, company: null } : person)));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete company.");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => companiesApi.delete(id)));
      toast.success(`Successfully deleted ${selectedIds.size} companies`);
      setCompanies((prev) => prev.filter((company) => !selectedIds.has(company.id)));
      setContacts((prev) =>
        prev.map((person) => (person.companyId && selectedIds.has(person.companyId) ? { ...person, companyId: null, company: null } : person)),
      );
      setSelectedIds(new Set());
    } catch (err: any) {
      toast.error(err.message || "Failed to delete companies.");
    } finally {
      setIsDeleting(false);
    }
  };

  const renderSortArrow = (column: SortableColumn) => {
    if (sortConfig.column !== column) return null;
    return sortConfig.direction === "asc" ? <ArrowUp className="sort-arrow" aria-hidden="true" /> : <ArrowDown className="sort-arrow" aria-hidden="true" />;
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

  const handleCompanyPatched = (updatedCompany: CompanyRow) => {
    setCompanies((prev) => prev.map((company) => (company.id === updatedCompany.id ? updatedCompany : company)));
    setContacts((prev) =>
      prev.map((person) => (person.companyId === updatedCompany.id ? { ...person, company: updatedCompany.name } : person)),
    );
  };

  const handleContactUpdated = (updatedPerson: PersonRow) => {
    setContacts((prev) => prev.map((person) => (person.id === updatedPerson.id ? updatedPerson : person)));
  };

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
        <section className="contacts-shell">
          <header className="contacts-header">
            <div className="contacts-header-main">
              <div>
                <p className="contacts-kicker">Revenue workspace</p>
                <h1 className="page-title contacts-page-title">Companies</h1>
              </div>
            </div>

            <div className="contacts-toolbar">
              <button id="companies-add-btn" className="btn-primary" onClick={() => setShowModal(true)} disabled={!workspaceId}>
                <Plus className="h-4 w-4" />
                Add company
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={handleExportCsv}
                disabled={!workspaceId}
                aria-label="Export companies to CSV"
              >
                <Download className="h-4 w-4" />
                Export
              </button>

              <div className="search-wrap">
                <Search className="h-4 w-4" aria-hidden="true" />
                <input
                  className="search-input"
                  placeholder="Search companies..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search companies"
                />
              </div>
            </div>
          </header>

          <div className="px-6 py-2">
            <ViewBar
              views={views}
              activeViewId={activeViewId}
              onSelect={handleSelectView}
              onCreate={handleCreateView}
              onDelete={handleDeleteView}
              onUpdate={handleUpdateView}
              onSetDefault={handleSetDefaultView}
              hasUnsavedChanges={hasUnsavedChanges}
              onSaveChanges={handleSaveChanges}
            />
          </div>

          {selectedIds.size > 0 && (
            <div className="bulk-bar" role="status" aria-live="polite">
              <span className="bulk-count">{selectedIds.size} selected</span>
              <div className="bulk-actions">
                <button type="button" className="bulk-btn bulk-btn-danger" onClick={handleBulkDelete} disabled={isDeleting}>
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          )}

          <section className="contacts-table-section">
            <div className="contacts-metrics">
              <div className="contacts-metric-card">
                <span className="contacts-metric-label">Total companies</span>
                <span className="contacts-metric-value">{loading ? "—" : companies.length.toLocaleString()}</span>
              </div>
              <div className="contacts-metric-card">
                <span className="contacts-metric-label">Showing</span>
                <span className="contacts-metric-value">{loading ? "—" : filteredCompanies.length.toString()}</span>
              </div>
            </div>

            {loading && (
              <SkeletonRow count={6} widths={["30%", "20%", "15%", "15%", "10%", "10%"]} />
            )}

            {!loading && error && <div className="contacts-feedback-state is-error">{error}</div>}

            {!loading && !error && companies.length === 0 && (
              <div className="contacts-feedback-state is-empty">
                <EmptyState
                  icon={<Building2 className="h-8 w-8" />}
                  title="No companies yet"
                  description="Add your first organization to populate the workspace."
                  action={{
                    label: "Add first company",
                    onClick: () => setShowModal(true),
                  }}
                />
              </div>
            )}

            {!loading && !error && companies.length > 0 && filteredCompanies.length === 0 && (
              <div className="contacts-feedback-state is-empty">
                <EmptyState
                  icon={<Search className="h-8 w-8" />}
                  title="No companies match your search"
                  description={`Try refining your search terms for "${search}".`}
                />
              </div>
            )}

            {!loading && !error && filteredCompanies.length > 0 && (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="col-checkbox">
                        <button
                          type="button"
                          className="checkbox-button"
                          onClick={toggleAllVisible}
                          aria-label={allVisibleSelected ? "Deselect all visible companies" : "Select all visible companies"}
                          aria-pressed={allVisibleSelected}
                        >
                          <CheckboxIcon checked={allVisibleSelected} indeterminate={someVisibleSelected} />
                        </button>
                      </th>
                      {renderHeaderCell("Company Name", "name", "col-name")}
                      {renderHeaderCell("Domain", "domain", "col-email")}
                      {renderHeaderCell("Industry", "industry", "col-industry")}
                      {renderHeaderCell("City", "city", "col-title")}
                      {renderHeaderCell("Employees", "employeeCount", "col-phone")}
                      {renderHeaderCell("Annual Revenue", "annualRevenue", "col-activity")}
                      <th className="col-actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanies.map((company) => {
                      const isSelected = selectedIds.has(company.id);
                      const isHovered = hoveredRowId === company.id;

                      return (
                        <tr
                          key={company.id}
                          className={`${isSelected ? "is-selected" : ""} ${isHovered ? "is-hovered" : ""} cursor-pointer`.trim()}
                          onMouseEnter={() => setHoveredRowId(company.id)}
                          onMouseLeave={() => setHoveredRowId((current) => (current === company.id ? null : current))}
                          onClick={() => router.push(`/companies/${company.id}`)}
                        >
                          <td className="col-checkbox">
                            <button
                              type="button"
                              className="checkbox-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelection(company.id);
                              }}
                              aria-label={`${isSelected ? "Deselect" : "Select"} ${company.name}`}
                              aria-pressed={isSelected}
                            >
                              <CheckboxIcon checked={isSelected} />
                            </button>
                          </td>
                          <td className="col-name">
                            <div className="name-cell">
                              <div className="avatar" style={{ background: company.avatarGradient }}>
                                {company.initials}
                              </div>
                              <span className="record-name">{company.name}</span>
                            </div>
                          </td>
                          <td className="col-email">
                            {company.domain ? (
                              <a
                                href={normalizeUrl(company.domain) ?? undefined}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-text-secondary transition hover:text-orbit-primary"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Globe className="h-3 w-3 shrink-0" />
                                {company.domain}
                                <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="col-industry">{company.industry ? <span className="company-chip">{company.industry}</span> : "—"}</td>
                          <td className="col-title">{company.city ?? "—"}</td>
                          <td className="col-phone mono-data">{company.employeeCount ? company.employeeCount.toLocaleString() : "—"}</td>
                          <td className="col-activity mono-data">{formatRevenue(company.annualRevenue)}</td>
                          <td className="col-actions">
                            <div className="row-actions">
                              <button
                                type="button"
                                className="row-action-btn text-error hover:text-red-400"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(company.id);
                                }}
                                aria-label={`Delete ${company.name}`}
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
          <AddCompanyModal
            workspaceId={workspaceId}
            onClose={() => setShowModal(false)}
            onCreated={(company) => {
              setCompanies((prev) => {
                if (prev.some((c) => c.id === company.id)) return prev;
                return [company, ...prev];
              });
              setSelectedIds(new Set());
              setShowModal(false);
            }}
          />
        )}
      </div>

    </>
  );
}

export default function CompaniesPage() {
  return (
    <AppLayout pageTitle="Companies">
      <CompaniesContent />
    </AppLayout>
  );
}
