"use client";

// FEATURE: Companies Account Management [Frontend] - Manage organizations/companies in the CRM
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonRow from "@/components/ui/SkeletonRow";
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
} from "lucide-react";
import AppLayout, { useWorkspace } from "@/components/AppLayout";
import { companiesApi, CompanyRow, CreateCompanyInput } from "@/lib/companies-api";
import { peopleApi, PersonRow } from "@/lib/people-api";
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
  const [form, setForm] = useState<CreateCompanyInput>({
    name: "",
    domain: "",
    address: "",
    city: "",
    industry: "",
    employeeCount: undefined,
    annualRevenue: undefined,
    linkedInUrl: "",
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
      const data = {
        ...form,
        employeeCount: form.employeeCount ? Number(form.employeeCount) : undefined,
        annualRevenue: form.annualRevenue ? Number(form.annualRevenue) : undefined,
        linkedInUrl: form.linkedInUrl?.trim() || undefined,
      };
      const company = await companiesApi.create(workspaceId, data);
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

function CompaniesContent() {
  const router = useRouter();
  const { workspaceId, userRole } = useWorkspace();
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [leads, setLeads] = useState<PersonRow[]>([]);
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
        setLeads(peopleResponse.data);
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
    if (userRole !== "OWNER") {
      toast.error("You are a member, you are not allowed to delete any data. You can perform create, read, and update operations only. Deleting the data is restricted only to the workspace owner.");
      return;
    }
    try {
      await companiesApi.delete(id);
      toast.success("Company deleted successfully");
      setCompanies((prev) => prev.filter((company) => company.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setLeads((prev) => prev.map((person) => (person.companyId === id ? { ...person, companyId: null, company: null } : person)));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete company.");
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
      await Promise.all(Array.from(selectedIds).map((id) => companiesApi.delete(id)));
      toast.success(`Successfully deleted ${selectedIds.size} companies`);
      setCompanies((prev) => prev.filter((company) => !selectedIds.has(company.id)));
      setLeads((prev) =>
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



  return (
    <>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
        <section className="contacts-shell">
          <div className="leads-topbar">
            {/* Total Companies stat */}
            <div className="leads-stats">
              <div className="leads-stat-chip">
                <span className="leads-stat-label">Total Companies</span>
                <span className="leads-stat-val">{loading ? "—" : companies.length.toLocaleString()}</span>
              </div>
            </div>

            {/* Actions: Search → Add company → Export */}
            <div className="leads-actions">
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
            </div>
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
