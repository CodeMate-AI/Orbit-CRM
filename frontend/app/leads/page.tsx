"use client";

// FEATURE: Contacts / Lead Management [Frontend] - View and manage contacts/leads list
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Download,
  Grip,
  Loader2,
  Phone,
  Plus,
  Search,
  Trash2,
  Upload,
  UserX,
  X,
} from "lucide-react";
import AppLayout, { useWorkspace } from "@/components/AppLayout";
import CSVImportModal from "@/components/CSVImportModal";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonRow from "@/components/ui/SkeletonRow";
import { downloadCsv } from "@/lib/csv-utils";
import { peopleApi, PersonRow, CreatePersonInput } from "@/lib/people-api";
import { companiesApi, CompanyRow } from "@/lib/companies-api";
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
const CUSTOM_LEAD_SOURCES_STORAGE_KEY = "orbit-crm:custom-lead-sources";
const CUSTOM_INDUSTRIES_STORAGE_KEY = "orbit-crm:custom-industries";
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







function AddLeadModal({
  workspaceId,
  companies,
  leadSources,
  industries,
  onAddLeadSource,
  onAddIndustry,
  onAddCompany,
  onClose,
  onCreated,
}: {
  workspaceId: string;
  companies: CompanyRow[];
  leadSources: string[];
  industries: string[];
  onAddLeadSource: (source: string) => void;
  onAddIndustry: (industry: string) => void;
  onAddCompany: (company: CompanyRow) => void;
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
  const [showLeadSourceInput, setShowLeadSourceInput] = useState(false);
  const [showIndustryInput, setShowIndustryInput] = useState(false);
  const [showCompanyInput, setShowCompanyInput] = useState(false);
  const [newLeadSource, setNewLeadSource] = useState("");
  const [newIndustry, setNewIndustry] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [creatingCompany, setCreatingCompany] = useState(false);

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
      const person = await peopleApi.create(workspaceId, {
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        jobTitle: form.jobTitle?.trim() || undefined,
        leadSource: form.leadSource?.trim() || undefined,
        industry: form.industry?.trim() || undefined,
        companyId: form.companyId || undefined,
      });
      onCreated(person);
    } catch (err: any) {
      setError(err.message || "Failed to create Lead.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddNewLeadSource = () => {
    const value = newLeadSource.trim();
    if (!value) return;
    onAddLeadSource(value);
    setForm((current) => ({ ...current, leadSource: value }));
    setNewLeadSource("");
    setShowLeadSourceInput(false);
  };

  const handleAddNewIndustry = () => {
    const value = newIndustry.trim();
    if (!value) return;
    onAddIndustry(value);
    setForm((current) => ({ ...current, industry: value }));
    setNewIndustry("");
    setShowIndustryInput(false);
  };

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
              {showLeadSourceInput ? (
                <div className="flex flex-col gap-2">
                  <input
                    className="form-input"
                    placeholder="Enter lead source"
                    value={newLeadSource}
                    onChange={(e) => setNewLeadSource(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddNewLeadSource();
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <button type="button" className="btn-primary" onClick={handleAddNewLeadSource}>
                      Add
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => {
                        setShowLeadSourceInput(false);
                        setNewLeadSource("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <select
                  className="form-input"
                  value={form.leadSource ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "__add_new__") {
                      setShowLeadSourceInput(true);
                      return;
                    }
                    setForm({ ...form, leadSource: value || undefined });
                  }}
                >
                  <option value="">Select a lead source...</option>
                  {leadSources.map((leadSource) => (
                    <option key={leadSource} value={leadSource}>
                      {leadSource}
                    </option>
                  ))}
                  <option value="__add_new__">+ Add new lead source...</option>
                </select>
              )}
            </div>
            <div className="form-field">
              <label className="form-label">Industry</label>
              {showIndustryInput ? (
                <div className="flex flex-col gap-2">
                  <input
                    className="form-input"
                    placeholder="Enter industry"
                    value={newIndustry}
                    onChange={(e) => setNewIndustry(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddNewIndustry();
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <button type="button" className="btn-primary" onClick={handleAddNewIndustry}>
                      Add
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => {
                        setShowIndustryInput(false);
                        setNewIndustry("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <select
                  className="form-input"
                  value={form.industry ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "__add_new__") {
                      setShowIndustryInput(true);
                      return;
                    }
                    setForm({ ...form, industry: value || undefined });
                  }}
                >
                  <option value="">Select an industry...</option>
                  {industries.map((industry) => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                  <option value="__add_new__">+ Add new industry...</option>
                </select>
              )}
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Company</label>
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
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "__add_new__") {
                    setShowCompanyInput(true);
                    return;
                  }
                  setForm({ ...form, companyId: value || undefined });
                }}
              >
                <option value="">Select a company...</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
                <option value="__add_new__">+ Add new company...</option>
              </select>
            )}
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
  const { workspaceId, userRole } = useWorkspace();
  const [Leads, setLeads] = useState<PersonRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [customLeadSources, setCustomLeadSources] = useState<string[]>([]);
  const [customIndustries, setCustomIndustries] = useState<string[]>([]);
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
  const [newPeriod, setNewPeriod] = useState<"week" | "month" | "quarter" | "year">("month");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedLeadSources = window.localStorage.getItem(CUSTOM_LEAD_SOURCES_STORAGE_KEY);
      const storedIndustries = window.localStorage.getItem(CUSTOM_INDUSTRIES_STORAGE_KEY);
      if (storedLeadSources) setCustomLeadSources(JSON.parse(storedLeadSources));
      if (storedIndustries) setCustomIndustries(JSON.parse(storedIndustries));
    } catch {
      setCustomLeadSources([]);
      setCustomIndustries([]);
    }
  }, []);

  const dynamicLeadSources = useMemo(
    () => Array.from(new Set([...LEAD_SOURCE_OPTIONS, ...customLeadSources, ...Leads.map((lead) => lead.leadSource).filter((value): value is string => Boolean(value))])),
    [customLeadSources, Leads]
  );

  const dynamicIndustries = useMemo(
    () => Array.from(new Set([...INDUSTRY_OPTIONS, ...customIndustries, ...Leads.map((lead) => lead.industry).filter((value): value is string => Boolean(value))])),
    [customIndustries, Leads]
  );

  const addCustomLeadSource = (source: string) => {
    setCustomLeadSources((current) => {
      const next = current.includes(source) ? current : [...current, source];
      if (typeof window !== "undefined") {
        window.localStorage.setItem(CUSTOM_LEAD_SOURCES_STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  const addCustomIndustry = (industry: string) => {
    setCustomIndustries((current) => {
      const next = current.includes(industry) ? current : [...current, industry];
      if (typeof window !== "undefined") {
        window.localStorage.setItem(CUSTOM_INDUSTRIES_STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

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
  const getNewCount = useMemo(() => {
    const now = new Date();
    return Leads.filter((c) => {
      const d = new Date(c.createdAt);
      if (newPeriod === "week") {
        // Current calendar week: Monday 00:00 to now
        const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon … 6=Sat
        const diffToMonday = (dayOfWeek + 6) % 7; // days since last Monday
        const monday = new Date(now);
        monday.setDate(now.getDate() - diffToMonday);
        monday.setHours(0, 0, 0, 0);
        return d >= monday && d <= now;
      }
      if (newPeriod === "month") {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (newPeriod === "quarter") {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const leadQuarter = Math.floor(d.getMonth() / 3);
        return leadQuarter === currentQuarter && d.getFullYear() === now.getFullYear();
      }
      if (newPeriod === "year") {
        return d.getFullYear() === now.getFullYear();
      }
      return false;
    }).length;
  }, [Leads, newPeriod]);

  const NEW_PERIOD_LABELS: Record<"week" | "month" | "quarter" | "year", string> = {
    week: "This week",
    month: "This month",
    quarter: "This quarter",
    year: "This year",
  };

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
    if (userRole !== "OWNER") {
      toast.error("You are a member, you are not allowed to delete any data. You can perform create, read, and update operations only. Deleting the data is restricted only to the workspace owner.");
      return;
    }
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
    if (userRole !== "OWNER") {
      toast.error("You are a member, you are not allowed to delete any data. You can perform create, read, and update operations only. Deleting the data is restricted only to the workspace owner.");
      return;
    }
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
        <div className="leads-topbar">
          <div className="leads-stats">
            <div className="leads-stat-chip">
              <span className="leads-stat-label">Total Leads</span>
              <span className="leads-stat-val">{loading ? "—" : Leads.length.toLocaleString()}</span>
            </div>
            <div className="leads-stat-chip">
              <span className="leads-stat-label">New · {NEW_PERIOD_LABELS[newPeriod]}</span>
              <span className="leads-stat-val">{loading ? "—" : getNewCount.toString()}</span>
              <div className="leads-period-toggle" role="group" aria-label="Select period">
                {(["week", "month", "quarter", "year"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`leads-period-btn${newPeriod === p ? " active" : ""}`}
                    onClick={() => setNewPeriod(p)}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="leads-actions">
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
                  const text = await peopleApi.exportCsv(workspaceId);
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
        </div>

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
                        <td className="col-phone mono-data">
                          {Lead.phone ? (
                            <a
                              href={`tel:${Lead.phone}`}
                              className="inline-flex items-center gap-1 text-orbit-primary hover:text-orbit-primary-hover hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="h-3.5 w-3.5" />
                              {Lead.phone}
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
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
          leadSources={dynamicLeadSources}
          industries={dynamicIndustries}
          onAddLeadSource={addCustomLeadSource}
          onAddIndustry={addCustomIndustry}
          onAddCompany={(newCompany) => {
            setCompanies((prev) => [...prev, newCompany]);
          }}
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

