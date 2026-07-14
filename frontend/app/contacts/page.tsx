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
  UserX,
  X,
} from "lucide-react";
import AppLayout, { useWorkspace } from "@/components/AppLayout";
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

type DecoratedContact = PersonRow & {
  displayTags: string[];
  lastActivity: string;
  lastActivitySort: number;
  leadSource: string;
  industry: string;
  initials: string;
  avatarGradient: string;
};

type EditableContactField =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "jobTitle"
  | "companyId"
  | "leadSource"
  | "industry"
  | "tagsString";

type ContactDrawerForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  companyId: string;
  leadSource: string;
  industry: string;
  tagsString: string;
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
const LAST_ACTIVITY_BUCKETS = [
  { label: "Just now", sort: 0 },
  { label: "2 hr ago", sort: 2 },
  { label: "3 hr ago", sort: 3 },
  { label: "4 hr ago", sort: 4 },
  { label: "5 hr ago", sort: 5 },
  { label: "6 hr ago", sort: 6 },
  { label: "8 hr ago", sort: 8 },
  { label: "1 day ago", sort: 24 },
  { label: "2 days ago", sort: 48 },
];
const INDIAN_PHONE_ERROR =
  "Phone must be a valid Indian phone number starting with +91 or 91, followed by exactly 10 digits.";

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

function parseTags(tagsString: string | null | undefined) {
  if (!tagsString) return [];

  return tagsString
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function decorateContacts(contacts: PersonRow[]): DecoratedContact[] {
  return contacts.map((contact) => {
    const activityIndex = getStableIndex(contact.id, LAST_ACTIVITY_BUCKETS.length);
    const gradientIndex = getStableIndex(contact.id, AVATAR_GRADIENTS.length);
    const activity = LAST_ACTIVITY_BUCKETS[activityIndex];

    return {
      ...contact,
      displayTags: parseTags(contact.tagsString),
      lastActivity: activity.label,
      lastActivitySort: activity.sort,
      leadSource: contact.leadSource ?? "—",
      industry: contact.industry ?? "—",
      initials: deriveInitials(contact.name),
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

function getTagClassName(tag: string) {
  return "";
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

function buildDrawerForm(contact: PersonRow): ContactDrawerForm {
  return {
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    jobTitle: contact.jobTitle ?? "",
    companyId: contact.companyId ?? "",
    leadSource: contact.leadSource ?? "",
    industry: contact.industry ?? "",
    tagsString: contact.tagsString ?? "",
  };
}

function mapContactUpdate(contact: PersonRow) {
  return (current: PersonRow) =>
    current.id === contact.id
      ? {
          ...current,
          ...contact,
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

function ContactDetailDrawer({
  open,
  contact,
  companies,
  onClose,
  onContactUpdated,
}: {
  open: boolean;
  contact: PersonRow | null;
  companies: CompanyRow[];
  onClose: () => void;
  onContactUpdated: (contact: PersonRow) => void;
}) {
  const [form, setForm] = useState<ContactDrawerForm | null>(null);
  const [savingField, setSavingField] = useState<EditableContactField | null>(null);
  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    setForm(contact ? buildDrawerForm(contact) : null);
    setPhoneError("");
  }, [contact]);

  if (!open || !contact || !form) return null;

  const updateFieldValue = (field: EditableContactField, value: string) => {
    setForm((current) => (current ? { ...current, [field]: value } : current));
    if (field === "phone") {
      setPhoneError("");
    }
  };

  const persistField = async (field: EditableContactField) => {
    if (!contact || !form) return;

    const currentFormValue = form[field];
    const normalizedFormValue = currentFormValue.trim();
    const currentContactValue = (() => {
      switch (field) {
        case "firstName":
          return contact.firstName;
        case "lastName":
          return contact.lastName;
        case "email":
          return contact.email ?? "";
        case "phone":
          return contact.phone ?? "";
        case "jobTitle":
          return contact.jobTitle ?? "";
        case "companyId":
          return contact.companyId ?? "";
        case "leadSource":
          return contact.leadSource ?? "";
        case "industry":
          return contact.industry ?? "";
        case "tagsString":
          return contact.tagsString ?? "";
      }
    })();

    const payloadValue = field === "companyId" ? currentFormValue : normalizedFormValue;

    if (payloadValue === currentContactValue) {
      return;
    }

    if ((field === "firstName" || field === "lastName") && !normalizedFormValue) {
      toast.error(`${field === "firstName" ? "First" : "Last"} name is required.`);
      setForm(buildDrawerForm(contact));
      return;
    }

    if (field === "phone" && !validatePhoneNumber(normalizedFormValue)) {
      setPhoneError(INDIAN_PHONE_ERROR);
      return;
    }

    setSavingField(field);
    try {
      const updated = await peopleApi.update(contact.id, {
        [field]: field === "companyId" ? payloadValue : payloadValue || undefined,
      });
      onContactUpdated(updated);
      setForm(buildDrawerForm(updated));
      setPhoneError("");
      toast.success("Contact updated successfully");
    } catch (err: any) {
      setForm(buildDrawerForm(contact));
      setPhoneError("");
      toast.error(err.message || "Failed to save contact changes.");
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
            <p className="text-[11px] uppercase tracking-[0.3em] text-text-tertiary">Contact detail</p>
            <h2 className="mt-1 text-lg font-semibold text-text-primary">Editable relationship profile</h2>
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle text-text-secondary transition hover:bg-surface-hover hover:text-text-primary"
            onClick={onClose}
            aria-label="Close contact drawer"
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
                  style={{ background: AVATAR_GRADIENTS[getStableIndex(contact.id, AVATAR_GRADIENTS.length)] }}
                >
                  {deriveInitials(contact.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-semibold text-white">{form.firstName} {form.lastName}</p>
                  <p className="mt-2 text-sm text-slate-300">
                    Created {new Date(contact.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full border border-border-subtle bg-bg-secondary px-3 py-2 text-sm text-slate-100">
                      {contact.company ?? "Unassigned company"}
                    </span>
                    <span className="inline-flex rounded-full border border-border-subtle bg-bg-secondary px-3 py-2 text-sm text-slate-100">
                      {contact.jobTitle ?? "No title added"}
                    </span>
                    {parseTags(form.tagsString).map((tag) => (
                      <span
                        key={`${contact.id}-${tag}`}
                        className="inline-flex rounded-full border border-border-subtle bg-bg-secondary px-3 py-2 text-sm text-slate-100"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

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
            <DrawerField
              label="Tags"
              value={form.tagsString}
              placeholder="Customer, Hot lead"
              saving={savingField === "tagsString"}
              onChange={(value) => updateFieldValue("tagsString", value)}
              onSave={() => persistField("tagsString")}
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
        </div>
      </aside>
    </div>
  );
}

function AddContactModal({
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
    tagsString: "",
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
      setError(err.message || "Failed to create contact.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add contact</h2>
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
            <label className="form-label">Tags</label>
            <input
              className="form-input"
              placeholder="Customer, Hot lead"
              value={form.tagsString ?? ""}
              onChange={(e) => setForm({ ...form, tagsString: e.target.value })}
            />
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
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ContactsContent() {
  const { workspaceId } = useWorkspace();
  const [contacts, setContacts] = useState<PersonRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: "name", direction: "asc" });
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    Promise.all([peopleApi.list(workspaceId), companiesApi.list(workspaceId)])
      .then(([peopleResponse, companyResponse]) => {
        setContacts(peopleResponse.data);
        setCompanies(companyResponse);
        setSelectedIds(new Set());
      })
      .catch((err) => setError(err.message || "Failed to load contacts."))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const decoratedContacts = useMemo(() => decorateContacts(contacts), [contacts]);
  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === selectedContactId) ?? null,
    [contacts, selectedContactId],
  );

  const filteredContacts = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = decoratedContacts.filter((contact) => {
      if (!term) return true;

      return [
        contact.name,
        contact.email ?? "",
        contact.phone ?? "",
        contact.company ?? "",
        contact.jobTitle ?? "",
        contact.industry,
        contact.leadSource,
        ...contact.displayTags,
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
  }, [decoratedContacts, search, sortConfig]);

  const visibleSelectedCount = filteredContacts.filter((contact) => selectedIds.has(contact.id)).length;
  const allVisibleSelected = filteredContacts.length > 0 && visibleSelectedCount === filteredContacts.length;
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;
  const newThisMonth = contacts.filter((c) => {
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
        filteredContacts.forEach((contact) => next.delete(contact.id));
      } else {
        filteredContacts.forEach((contact) => next.add(contact.id));
      }
      return next;
    });
  };

  const handleDeleteContact = async (id: string) => {
    try {
      await peopleApi.delete(id);
      toast.success("Contact deleted successfully");
      setContacts((prev) => prev.filter((c) => c.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setSelectedContactId((current) => (current === id ? null : current));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete contact.");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => peopleApi.delete(id)));
      toast.success(`Successfully deleted ${selectedIds.size} contacts`);
      setContacts((prev) => prev.filter((c) => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
      setSelectedContactId((current) => (current && selectedIds.has(current) ? null : current));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete contacts.");
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
              <h1 className="page-title contacts-page-title">Contacts</h1>
            </div>
          </div>

          <div className="contacts-toolbar">
            <button
              id="contacts-add-btn"
              className="btn-primary"
              onClick={() => setShowModal(true)}
              disabled={!workspaceId}
            >
              <Plus className="h-4 w-4" />
              Add contact
            </button>

            <div className="search-wrap">
              <Search className="h-4 w-4" aria-hidden="true" />
              <input
                className="search-input"
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search contacts"
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
              <span className="contacts-metric-label">Total contacts</span>
              <span className="contacts-metric-value">{loading ? "—" : contacts.length.toLocaleString()}</span>
            </div>
            <div className="contacts-metric-card">
              <span className="contacts-metric-label">New this month</span>
              <span className="contacts-metric-value">{loading ? "—" : newThisMonth.toString()}</span>
            </div>
            <div className="contacts-metric-card">
              <span className="contacts-metric-label">Showing</span>
              <span className="contacts-metric-value">{loading ? "—" : filteredContacts.length.toString()}</span>
            </div>
          </div>

          {loading && (
            <div className="contacts-feedback-state">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading contacts…</span>
            </div>
          )}

          {!loading && !error && contacts.length === 0 && (
            <div className="contacts-feedback-state is-empty">
              <div className="rounded-full bg-orbit-primary-muted p-4 text-orbit-primary">
                <UserX className="h-8 w-8" />
              </div>
              <div>
                <p className="font-medium text-text-primary">No contacts yet</p>
                <p className="mt-2 text-sm text-text-secondary">Add your first contact to populate the premium table.</p>
              </div>
              <button type="button" className="btn-primary" onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4" />
                Add first contact
              </button>
            </div>
          )}

          {!loading && error && <div className="contacts-feedback-state is-error">{error}</div>}

          {!loading && !error && contacts.length > 0 && filteredContacts.length === 0 && (
            <div className="contacts-feedback-state is-empty">
              <Search className="h-5 w-5" />
              <span>No contacts match &ldquo;{search}&rdquo;</span>
            </div>
          )}

          {!loading && !error && filteredContacts.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="col-checkbox">
                      <button
                        type="button"
                        className="checkbox-button"
                        onClick={toggleAllVisible}
                        aria-label={allVisibleSelected ? "Deselect all visible contacts" : "Select all visible contacts"}
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
                    <th className="col-tags">
                      <span className="th-content">
                        <Grip className="grip" aria-hidden="true" />
                        <span>Tags</span>
                      </span>
                    </th>
                    {renderHeaderCell("Last activity", "lastActivity", "col-activity")}
                    {renderHeaderCell("Lead source", "leadSource", "col-source")}
                    {renderHeaderCell("Industry", "industry", "col-industry")}
                    <th className="col-actions" />
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((contact) => {
                    const isSelected = selectedIds.has(contact.id);
                    const isHovered = hoveredRowId === contact.id;

                    return (
                      <tr
                        key={contact.id}
                        className={`${isSelected ? "is-selected" : ""} ${isHovered ? "is-hovered" : ""} cursor-pointer`.trim()}
                        onMouseEnter={() => setHoveredRowId(contact.id)}
                        onMouseLeave={() => setHoveredRowId((current) => (current === contact.id ? null : current))}
                        onClick={() => setSelectedContactId(contact.id)}
                      >
                        <td className="col-checkbox">
                          <button
                            type="button"
                            className="checkbox-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleSelection(contact.id);
                            }}
                            aria-label={`${isSelected ? "Deselect" : "Select"} ${contact.name}`}
                            aria-pressed={isSelected}
                          >
                            <CheckboxIcon checked={isSelected} />
                          </button>
                        </td>
                        <td className="col-name">
                          <div className="name-cell">
                            <div className="avatar" style={{ background: contact.avatarGradient }}>
                              {contact.initials}
                            </div>
                            <span className="record-name">{contact.name}</span>
                          </div>
                        </td>
                        <td className="col-email">{contact.email ?? "—"}</td>
                        <td className="col-phone mono-data">{contact.phone ?? "—"}</td>
                        <td className="col-company">
                          <span className="company-chip">{contact.company ?? "—"}</span>
                        </td>
                        <td className="col-title">{contact.jobTitle ?? "—"}</td>
                        <td className="col-tags">
                          <div className="tags-cell">
                            {contact.displayTags.length > 0 ? (
                              contact.displayTags.map((tag) => (
                                <span key={`${contact.id}-${tag}`} className={`tag ${getTagClassName(tag)}`}>
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-text-tertiary">—</span>
                            )}
                          </div>
                        </td>
                        <td className="col-activity mono-data">{contact.lastActivity}</td>
                        <td className="col-source mono-data">{contact.leadSource}</td>
                        <td className="col-industry">{contact.industry}</td>
                        <td className="col-actions">
                          <div className="row-actions">
                            <button
                              type="button"
                              className="row-action-btn text-error hover:text-red-400"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteContact(contact.id);
                              }}
                              aria-label={`Delete ${contact.name}`}
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
        <AddContactModal
          workspaceId={workspaceId}
          companies={companies}
          onClose={() => setShowModal(false)}
          onCreated={(person) => {
            setContacts((prev) => [person, ...prev]);
            setSelectedIds(new Set());
            setShowModal(false);
          }}
        />
      )}

      <ContactDetailDrawer
        open={Boolean(selectedContact)}
        contact={selectedContact}
        companies={companies}
        onClose={() => setSelectedContactId(null)}
        onContactUpdated={(updatedContact) => {
          setContacts((prev) => prev.map(mapContactUpdate(updatedContact)));
        }}
      />
    </div>
  );
}

export default function ContactsPage() {
  return (
    <AppLayout pageTitle="Contacts">
      <ContactsContent />
    </AppLayout>
  );
}
