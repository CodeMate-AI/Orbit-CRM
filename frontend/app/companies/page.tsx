"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Grip,
  Loader2,
  Plus,
  Search,
  Trash2,
  Building2,
  Globe,
  ExternalLink,
} from "lucide-react";
import AppLayout, { useWorkspace } from "@/components/AppLayout";
import { companiesApi, CompanyRow, CreateCompanyInput } from "@/lib/companies-api";
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
  return companies.map((c) => {
    const gradientIndex = getStableIndex(c.id, AVATAR_GRADIENTS.length);
    return {
      ...c,
      initials: deriveInitials(c.name),
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
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
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
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
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
  const { workspaceId } = useWorkspace();
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: "name", direction: "asc" });
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    companiesApi
      .list(workspaceId)
      .then((res) => {
        setCompanies(res);
        setSelectedIds(new Set());
      })
      .catch((err) => setError(err.message || "Failed to load companies."))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const decoratedCompanies = useMemo(() => decorateCompanies(companies), [companies]);

  const filteredCompanies = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = decoratedCompanies.filter((company) => {
      if (!term) return true;
      return [
        company.name,
        company.domain ?? "",
        company.industry ?? "",
        company.city ?? "",
        company.address ?? "",
      ].some((value) => value.toLowerCase().includes(term));
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

  const visibleSelectedCount = filteredCompanies.filter((c) => selectedIds.has(c.id)).length;
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
        filteredCompanies.forEach((c) => next.delete(c.id));
      } else {
        filteredCompanies.forEach((c) => next.add(c.id));
      }
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await companiesApi.delete(id);
      toast.success("Company deleted successfully");
      setCompanies((prev) => prev.filter((c) => c.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
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
      setCompanies((prev) => prev.filter((c) => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
    } catch (err: any) {
      toast.error(err.message || "Failed to delete companies.");
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
              <h1 className="page-title contacts-page-title">Companies</h1>
            </div>
          </div>

          <div className="contacts-toolbar">
            <button
              id="companies-add-btn"
              className="btn-primary"
              onClick={() => setShowModal(true)}
              disabled={!workspaceId}
            >
              <Plus className="h-4 w-4" />
              Add company
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
              <span className="contacts-metric-label">Total companies</span>
              <span className="contacts-metric-value">{loading ? "—" : companies.length.toLocaleString()}</span>
            </div>
            <div className="contacts-metric-card">
              <span className="contacts-metric-label">Showing</span>
              <span className="contacts-metric-value">{loading ? "—" : filteredCompanies.length.toString()}</span>
            </div>
          </div>

          {loading && (
            <div className="contacts-feedback-state">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading companies…</span>
            </div>
          )}

          {!loading && error && <div className="contacts-feedback-state is-error">{error}</div>}

          {!loading && !error && companies.length === 0 && (
            <div className="contacts-feedback-state is-empty">
              <div className="rounded-full bg-orbit-primary-muted p-4 text-orbit-primary">
                <Building2 className="h-8 w-8" />
              </div>
              <div>
                <p className="font-medium text-text-primary">No companies yet</p>
                <p className="mt-2 text-sm text-text-secondary">Add your first organization to populate the workspace.</p>
              </div>
              <button type="button" className="btn-primary" onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4" />
                Add first company
              </button>
            </div>
          )}

          {!loading && !error && companies.length > 0 && filteredCompanies.length === 0 && (
            <div className="contacts-feedback-state is-empty">
              <Search className="h-5 w-5" />
              <span>No companies match &ldquo;{search}&rdquo;</span>
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
                        className={`${isSelected ? "is-selected" : ""} ${isHovered ? "is-hovered" : ""}`.trim()}
                        onMouseEnter={() => setHoveredRowId(company.id)}
                        onMouseLeave={() => setHoveredRowId((current) => (current === company.id ? null : current))}
                      >
                        <td className="col-checkbox">
                          <button
                            type="button"
                            className="checkbox-button"
                            onClick={() => toggleSelection(company.id)}
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
                              href={`https://${company.domain}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 hover:text-orbit-primary text-text-secondary transition"
                            >
                              <Globe className="h-3 w-3 shrink-0" />
                              {company.domain}
                              <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="col-industry">
                          {company.industry ? (
                            <span className="company-chip">{company.industry}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="col-title">{company.city ?? "—"}</td>
                        <td className="col-phone mono-data">
                          {company.employeeCount ? company.employeeCount.toLocaleString() : "—"}
                        </td>
                        <td className="col-activity mono-data">
                          {formatRevenue(company.annualRevenue)}
                        </td>
                        <td className="col-actions">
                          <div className="row-actions">
                            <button
                              type="button"
                              className="row-action-btn text-error hover:text-red-400"
                              onClick={() => handleDelete(company.id)}
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
          onCreated={(c) => {
            setCompanies((prev) => [c, ...prev]);
            setSelectedIds(new Set());
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

export default function CompaniesPage() {
  return (
    <AppLayout pageTitle="Companies">
      <CompaniesContent />
    </AppLayout>
  );
}
