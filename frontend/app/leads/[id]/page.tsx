"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout, { useWorkspace } from "@/components/AppLayout";
import ActivityTimeline from "@/components/ActivityTimeline";
import NoteEditor from "@/components/NoteEditor";
import ReadOnlyNoteContent from "@/components/ReadOnlyNoteContent";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AttachmentRow, attachmentsApi } from "@/lib/attachments-api";
import { companiesApi, CompanyRow } from "@/lib/companies-api";
import { notesApi, NoteRow } from "@/lib/notes-api";
import { peopleApi, PersonRow } from "@/lib/people-api";
import { tasksApi, TaskRow } from "@/lib/tasks-api";
import { workspacesApi } from "@/lib/workspaces-api";
import { WorkspaceMemberRow } from "@/lib/opportunities-api";
import { toast } from "sonner";
import { ArrowLeft, Building2, CalendarDays, Loader2, Mail, Phone, Plus, Search, X } from "lucide-react";
import { extractTextFromTiptapJson, isTiptapJsonEmpty } from "@/lib/utils";

const leadFieldLabels: Array<[keyof PersonRow, string]> = [
  ["firstName", "First Name"],
  ["lastName", "Last Name"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["jobTitle", "Job Title"],
  ["leadSource", "Lead Source"],
  ["industry", "Industry"],
  ["companyId", "Company"],
  ["mobile", "Mobile"],
  ["annualRevenue", "Annual Revenue"],
  ["fax", "Fax"],
  ["website", "Website"],
  ["leadStatus", "Lead Status"],
  ["employeeCount", "Employee Count"],
  ["skypeId", "Skype ID"],
  ["secondaryEmail", "Secondary Email"],
  ["twitter", "Twitter"],
  ["address", "Address"],
  ["description", "Description"],
];

const leadFieldKeys = leadFieldLabels.map(([key]) => key);

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

const INDIAN_PHONE_ERROR = "Phone number must be a valid Indian phone number starting with +91 or 91, followed by exactly 10 digits.";

function validatePhoneNumber(value?: string) {
  if (!value) return true;
  const clean = value.replace(/\s+/g, "");
  if (clean.startsWith("+")) {
    return /^\+91\d{10}$/.test(clean);
  }
  if (clean.length === 12 && clean.startsWith("91")) {
    return /^91\d{10}$/.test(clean);
  }
  return /^\d{10}$/.test(clean);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function buildNotePayload(entityId: string, entityType: "person" | "company" | "opportunity", workspaceId: string, body: any) {
  const payload: any = { workspaceId, body };
  if (entityType === "person") payload.personId = entityId;
  if (entityType === "company") payload.companyId = entityId;
  if (entityType === "opportunity") payload.opportunityId = entityId;
  return payload;
}

function LeadDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const leadId = params.id;
  const { workspaceId } = useWorkspace();

  const [lead, setLead] = useState<PersonRow | null>(null);
  const [leadDraft, setLeadDraft] = useState<Record<string, string | number | boolean>>({});
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [newNoteBody, setNewNoteBody] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [error, setError] = useState("");
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [linkingCompanyId, setLinkingCompanyId] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<NoteRow | null>(null);
  const [members, setMembers] = useState<WorkspaceMemberRow[]>([]);
  const [customLeadSources, setCustomLeadSources] = useState<string[]>([]);
  const [customIndustries, setCustomIndustries] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedLeadSources = window.localStorage.getItem("orbit-crm:custom-lead-sources");
      const storedIndustries = window.localStorage.getItem("orbit-crm:custom-industries");
      if (storedLeadSources) setCustomLeadSources(JSON.parse(storedLeadSources));
      if (storedIndustries) setCustomIndustries(JSON.parse(storedIndustries));
    } catch {
      // ignore
    }
  }, []);

  const dynamicLeadSources = useMemo(
    () => Array.from(new Set([...LEAD_SOURCE_OPTIONS, ...customLeadSources, lead?.leadSource].filter((v): v is string => Boolean(v)))),
    [customLeadSources, lead?.leadSource]
  );

  const dynamicIndustries = useMemo(
    () => Array.from(new Set([...INDUSTRY_OPTIONS, ...customIndustries, lead?.industry].filter((v): v is string => Boolean(v)))),
    [customIndustries, lead?.industry]
  );

  const fields = useMemo(() => leadFieldLabels.map(([key, label]) => ({ key, label, value: leadDraft[key] ?? "" })), [leadDraft]);

  const company = useMemo(() => companies.find((entry) => entry.id === lead?.companyId) ?? null, [companies, lead]);

  const availableCompanies = useMemo(() => {
    const search = companySearch.trim().toLowerCase();
    return companies
      .filter((entry) => (lead?.companyId ? entry.id !== lead.companyId : true))
      .filter((entry) => {
        if (!search) return true;
        return [entry.name, entry.domain ?? "", entry.industry ?? "", entry.city ?? ""].join(" ").toLowerCase().includes(search);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [companySearch, companies, lead?.companyId]);

  const relatedTasks = useMemo(() => tasks.filter((task) => task.personId === lead?.id), [tasks, lead]);
  const recentNotes = useMemo(() => notes.slice(0, 5), [notes]);

  useEffect(() => {
    document.title = lead?.name ? `${lead.name} | Orbit CRM` : "Lead detail | Orbit CRM";
  }, [lead?.name]);

  useEffect(() => {
    if (!workspaceId || !leadId) return;

    setLoading(true);
    setError("");
    Promise.all([
      peopleApi.get(leadId),
      companiesApi.list(workspaceId),
      notesApi.list(workspaceId, "person", leadId),
      tasksApi.list(workspaceId),
      attachmentsApi.list(workspaceId, "person", leadId),
      workspacesApi.listMembers(workspaceId),
    ])
      .then(([person, companyRows, noteRows, taskRows, fileRows, memberRows]) => {
        setLead(person);
        setLeadDraft({
          firstName: person.firstName ?? "",
          lastName: person.lastName ?? "",
          email: person.email ?? "",
          phone: person.phone ?? "",
          jobTitle: person.jobTitle ?? "",
          leadSource: person.leadSource ?? "",
          industry: person.industry ?? "",
          companyId: person.companyId ?? "",
          mobile: person.mobile ?? "",
          annualRevenue: person.annualRevenue ?? "",
          fax: person.fax ?? "",
          website: person.website ?? "",
          leadStatus: person.leadStatus ?? "",
          employeeCount: person.employeeCount ?? "",
          skypeId: person.skypeId ?? "",
          secondaryEmail: person.secondaryEmail ?? "",
          twitter: person.twitter ?? "",
          address: person.address ?? "",
          description: person.description ?? "",
          leadOwnerId: person.leadOwnerId ?? "",
        } as Record<string, string | number | boolean>);
        setCompanies(companyRows);
        setNotes(noteRows);
        setTasks(taskRows);
        setAttachments(fileRows);
        setMembers(memberRows);
      })
      .catch((err) => setError(err.message || "Failed to load lead."))
      .finally(() => setLoading(false));
  }, [workspaceId, leadId]);

  const handleSaveNote = async () => {
    if (!workspaceId || !lead) return;
    if (!newNoteBody || isTiptapJsonEmpty(newNoteBody)) {
      toast.error("Note content cannot be empty.");
      return;
    }

    setSavingNote(true);
    try {
      const created = await notesApi.create(buildNotePayload(lead.id, "person", workspaceId, newNoteBody));
      setNotes((current) => [created, ...current]);
      setNewNoteBody(null);
      toast.success("Note saved successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save note.");
    } finally {
      setSavingNote(false);
    }
  };

  const handleLeadChange = (key: keyof PersonRow, value: string | boolean) => {
    setLeadDraft((current) => ({ ...current, [key]: value }));
  };

  const handleSaveLead = async () => {
    if (!lead) return;
    if (!String(leadDraft.firstName ?? "").trim() || !String(leadDraft.lastName ?? "").trim()) {
      toast.error("First name and last name are required.");
      return;
    }
    if (leadDraft.phone && !validatePhoneNumber(String(leadDraft.phone))) {
      toast.error(INDIAN_PHONE_ERROR);
      return;
    }
    setSavingLead(true);
    try {
      const payload = {
        firstName: String(leadDraft.firstName ?? "").trim(),
        lastName: String(leadDraft.lastName ?? "").trim(),
        email: String(leadDraft.email ?? "").trim() || null,
        phone: String(leadDraft.phone ?? "").trim() || null,
        jobTitle: String(leadDraft.jobTitle ?? "").trim() || null,
        leadSource: String(leadDraft.leadSource ?? "").trim() || null,
        industry: String(leadDraft.industry ?? "").trim() || null,
        companyId: leadDraft.companyId === "" ? null : (leadDraft.companyId as string) || null,
        mobile: String(leadDraft.mobile ?? "").trim() || null,
        annualRevenue: leadDraft.annualRevenue === "" ? null : Number(leadDraft.annualRevenue),
        fax: String(leadDraft.fax ?? "").trim() || null,
        website: String(leadDraft.website ?? "").trim() || null,
        leadStatus: String(leadDraft.leadStatus ?? "").trim() || null,
        employeeCount: leadDraft.employeeCount === "" ? null : parseInt(String(leadDraft.employeeCount), 10),
        skypeId: String(leadDraft.skypeId ?? "").trim() || null,
        secondaryEmail: String(leadDraft.secondaryEmail ?? "").trim() || null,
        twitter: String(leadDraft.twitter ?? "").trim() || null,
        address: String(leadDraft.address ?? "").trim() || null,
        description: String(leadDraft.description ?? "").trim() || null,
        leadOwnerId: leadDraft.leadOwnerId === "" ? null : (leadDraft.leadOwnerId as string) || null,
      };
      const updated = await peopleApi.update(lead.id, payload);
      setLead(updated);
      setLeadDraft({
        firstName: updated.firstName ?? "",
        lastName: updated.lastName ?? "",
        email: updated.email ?? "",
        phone: updated.phone ?? "",
        jobTitle: updated.jobTitle ?? "",
        leadSource: updated.leadSource ?? "",
        industry: updated.industry ?? "",
        companyId: updated.companyId ?? "",
        mobile: updated.mobile ?? "",
        annualRevenue: updated.annualRevenue ?? "",
        fax: updated.fax ?? "",
        website: updated.website ?? "",
        leadStatus: updated.leadStatus ?? "",
        employeeCount: updated.employeeCount ?? "",
        skypeId: updated.skypeId ?? "",
        secondaryEmail: updated.secondaryEmail ?? "",
        twitter: updated.twitter ?? "",
        address: updated.address ?? "",
        description: updated.description ?? "",
        leadOwnerId: updated.leadOwnerId ?? "",
      });
      toast.success("Lead updated successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update lead.");
    } finally {
      setSavingLead(false);
    }
  };

  const handleLinkCompany = async (companyId: string) => {
    if (!lead) return;
    setLinkingCompanyId(companyId);
    try {
      const updated = await peopleApi.update(lead.id, { companyId });
      setLead((current) => (current ? { ...current, companyId: updated.companyId, company: updated.company } : current));
      setCompanyDialogOpen(false);
      setCompanySearch("");
      toast.success("Company linked successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to link company.");
    } finally {
      setLinkingCompanyId(null);
    }
  };

  const handleUnlinkCompany = async () => {
    if (!lead) return;
    setLinkingCompanyId(lead.companyId);
    try {
      const updated = await peopleApi.update(lead.id, { companyId: "" });
      setLead((current) => (current ? { ...current, companyId: updated.companyId, company: updated.company } : current));
      toast.success("Company unlinked successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to unlink company.");
    } finally {
      setLinkingCompanyId(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-[1600px] items-center justify-center px-6 py-10">
        <div className="flex items-center gap-3 text-text-secondary">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading lead…
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-[1600px] flex-col items-center justify-center gap-4 px-6 py-10 text-center">
        <p className="text-lg font-medium text-text-primary">{error || "Lead not found."}</p>
        <button type="button" className="btn-primary" onClick={() => router.push("/leads")}>Back to leads</button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="flex items-center justify-between gap-3">
        <button type="button" className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-secondary px-4 py-2 text-sm text-text-secondary transition hover:text-text-primary" onClick={() => router.push("/leads")}> 
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.24em] text-text-tertiary">Lead detail</p>
          <h1 className="text-2xl font-semibold text-text-primary">{lead.name}</h1>
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_300px]">
        <aside className="space-y-6 rounded-3xl border border-border-subtle bg-bg-secondary/80 p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orbit-primary/15 text-xl font-semibold text-orbit-primary">
              {getInitials(lead.name)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-text-primary">{lead.name}</h2>
              <p className="mt-1 text-sm text-text-secondary">{lead.jobTitle || "No job title"}</p>
              {company ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary transition hover:text-text-primary"
                    onClick={() => router.push(`/companies/${company.id}`)}
                  >
                    <Building2 className="h-3.5 w-3.5" /> {company.name}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-secondary px-3 py-1.5 text-xs text-text-secondary transition hover:border-orbit-primary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-70"
                    onClick={() => void handleUnlinkCompany()}
                    disabled={linkingCompanyId === lead.companyId}
                  >
                    {linkingCompanyId === lead.companyId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                    Unlink company
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-secondary px-3 py-1.5 text-xs text-text-secondary transition hover:border-orbit-primary hover:text-text-primary"
                  onClick={() => setCompanyDialogOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" /> Link company
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3 text-sm text-text-secondary">
            <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {lead.email || "No email"}</div>
            <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {lead.phone || "No phone"}</div>
            <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Created {formatDateTime(lead.createdAt)}</div>
          </div>
        </aside>

        <main className="space-y-6 rounded-3xl border border-border-subtle bg-bg-secondary/80 p-5 shadow-sm">
          <ActivityTimeline workspaceId={workspaceId} personId={lead.id} />

          <section className="rounded-2xl border border-border-subtle bg-bg-tertiary/70 p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">Add note</div>
            <NoteEditor value={newNoteBody} onChange={setNewNoteBody} />
            <div className="mt-3 flex justify-end">
              <button type="button" className="btn-primary h-9 px-4 text-xs" disabled={savingNote} onClick={handleSaveNote}>{savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save note"}</button>
            </div>
          </section>

          <section className="rounded-2xl border border-border-subtle bg-bg-tertiary/70 p-5 space-y-6">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary mb-4">Lead Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-secondary">First Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="First name"
                    value={String(leadDraft.firstName ?? "")}
                    onChange={(e) => handleLeadChange("firstName", e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-secondary">Last Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="Last name"
                    value={String(leadDraft.lastName ?? "")}
                    onChange={(e) => handleLeadChange("lastName", e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-secondary">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="email@example.com"
                    value={String(leadDraft.email ?? "")}
                    onChange={(e) => handleLeadChange("email", e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-secondary">Phone (Indian format: +91 XXXXX XXXXX)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="+91 98765 43210"
                    value={String(leadDraft.phone ?? "")}
                    onChange={(e) => handleLeadChange("phone", e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-secondary">Title (Job Title)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Job title"
                    value={String(leadDraft.jobTitle ?? "")}
                    onChange={(e) => handleLeadChange("jobTitle", e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-secondary">Company</label>
                  <select
                    className="form-input"
                    value={String(leadDraft.companyId ?? "")}
                    onChange={(e) => handleLeadChange("companyId", e.target.value)}
                  >
                    <option value="">Select company...</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-secondary">Lead Owner</label>
                  <select
                    className="form-input"
                    value={String(leadDraft.leadOwnerId ?? "")}
                    onChange={(e) => handleLeadChange("leadOwnerId", e.target.value)}
                  >
                    <option value="">Select owner...</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.userId}>
                        {member.user.name || member.user.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-secondary">Mobile</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="+91 XXXXX XXXXX"
                    value={String(leadDraft.mobile ?? "")}
                    onChange={(e) => handleLeadChange("mobile", e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-secondary">Annual Revenue (INR)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="e.g. 5000000"
                    value={String(leadDraft.annualRevenue ?? "")}
                    onChange={(e) => handleLeadChange("annualRevenue", e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-secondary">Lead Source</label>
                  <select
                    className="form-input"
                    value={String(leadDraft.leadSource ?? "")}
                    onChange={(e) => handleLeadChange("leadSource", e.target.value)}
                  >
                    <option value="">Select lead source...</option>
                    {dynamicLeadSources.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-secondary">Industry</label>
                  <select
                    className="form-input"
                    value={String(leadDraft.industry ?? "")}
                    onChange={(e) => handleLeadChange("industry", e.target.value)}
                  >
                    <option value="">Select industry...</option>
                    {dynamicIndustries.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-secondary">Fax</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Fax number"
                    value={String(leadDraft.fax ?? "")}
                    onChange={(e) => handleLeadChange("fax", e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-secondary">Website</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="https://example.com"
                    value={String(leadDraft.website ?? "")}
                    onChange={(e) => handleLeadChange("website", e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-secondary">Lead Status</label>
                  <select
                    className="form-input"
                    value={String(leadDraft.leadStatus ?? "")}
                    onChange={(e) => handleLeadChange("leadStatus", e.target.value)}
                  >
                    <option value="">Select status...</option>
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Unqualified">Unqualified</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-secondary">No. of Employees</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="e.g. 50"
                    value={String(leadDraft.employeeCount ?? "")}
                    onChange={(e) => handleLeadChange("employeeCount", e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-secondary">Skype ID</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Skype username"
                    value={String(leadDraft.skypeId ?? "")}
                    onChange={(e) => handleLeadChange("skypeId", e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-secondary">Secondary Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="alternative@example.com"
                    value={String(leadDraft.secondaryEmail ?? "")}
                    onChange={(e) => handleLeadChange("secondaryEmail", e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-secondary">Twitter</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Twitter handle"
                    value={String(leadDraft.twitter ?? "")}
                    onChange={(e) => handleLeadChange("twitter", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <hr className="border-border-subtle" />

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary mb-3">Address Information</h3>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-secondary">Address</label>
                <textarea
                  className="form-input min-h-[80px] py-2"
                  placeholder="Street, City, State, ZIP, Country"
                  value={String(leadDraft.address ?? "")}
                  onChange={(e) => handleLeadChange("address", e.target.value)}
                />
              </div>
            </div>

            <hr className="border-border-subtle" />

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary mb-3">Description Information</h3>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-secondary">Description</label>
                <textarea
                  className="form-input min-h-[100px] py-2"
                  placeholder="Additional background, requirements, or profile summary..."
                  value={String(leadDraft.description ?? "")}
                  onChange={(e) => handleLeadChange("description", e.target.value)}
                />
              </div>
            </div>


            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                className="btn-primary h-9 px-4 text-xs"
                disabled={savingLead}
                onClick={handleSaveLead}
              >
                {savingLead ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save details"}
              </button>
            </div>
          </section>
        </main>

        <aside className="space-y-6 rounded-3xl border border-border-subtle bg-bg-secondary/80 p-5 shadow-sm">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-text-tertiary">Related tasks</h3>
              <span className="rounded-full bg-bg-tertiary px-3 py-1 text-xs text-text-secondary">{relatedTasks.length}</span>
            </div>
            <div className="space-y-2">
              {relatedTasks.length === 0 ? <p className="text-sm text-text-tertiary">No tasks linked.</p> : relatedTasks.slice(0, 6).map((task) => (
                <div key={task.id} className="rounded-2xl border border-border-subtle bg-bg-tertiary/70 p-3 text-sm">
                  <p className="font-medium text-text-primary">{task.title}</p>
                  <p className="mt-1 text-xs text-text-tertiary">{task.status} · {task.priority}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-text-tertiary">Notes</h3>
              <span className="rounded-full bg-bg-tertiary px-3 py-1 text-xs text-text-secondary">{notes.length}</span>
            </div>
            <div className="space-y-2">
              {recentNotes.length === 0 ? <p className="text-sm text-text-tertiary">No notes yet.</p> : recentNotes.map((note) => (
                <article
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  className="cursor-pointer rounded-2xl border border-border-subtle bg-bg-tertiary/70 p-3 text-sm transition hover:border-orbit-primary hover:bg-bg-tertiary"
                >
                  <p className="font-medium text-text-primary">{note.title || (note.author?.name ? `Note by ${note.author.name}` : "Note")}</p>
                  <p className="mt-0.5 text-[10px] text-text-tertiary">{formatDateTime(note.createdAt)}</p>
                  <p className="mt-1 line-clamp-3 text-xs text-text-tertiary">{extractTextFromTiptapJson(note.body) || "Empty note"}</p>
                </article>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-text-tertiary">Files</h3>
              <span className="rounded-full bg-bg-tertiary px-3 py-1 text-xs text-text-secondary">{attachments.length}</span>
            </div>
            <div className="space-y-2">
              {attachments.length === 0 ? <p className="text-sm text-text-tertiary">No files uploaded.</p> : attachments.slice(0, 5).map((file) => (
                <div key={file.id} className="rounded-2xl border border-border-subtle bg-bg-tertiary/70 p-3 text-sm">
                  <p className="font-medium text-text-primary">{file.name}</p>
                  <p className="mt-1 text-xs text-text-tertiary">{file.mimeType}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <Dialog open={!!selectedNote} onOpenChange={(open) => !open && setSelectedNote(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedNote?.title || "Note Detail"}</DialogTitle>
            <DialogDescription>
              Logged on {selectedNote && formatDateTime(selectedNote.createdAt)}
              {selectedNote?.author?.name ? ` by ${selectedNote.author.name}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-2xl border border-border-subtle bg-bg-secondary p-4">
            {selectedNote && <ReadOnlyNoteContent content={selectedNote.body} />}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={companyDialogOpen}
        onOpenChange={(open) => {
          setCompanyDialogOpen(open);
          if (!open) {
            setCompanySearch("");
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{lead.companyId ? "Change company" : "Link company"}</DialogTitle>
            <DialogDescription>Search workspace companies and attach one to this lead.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input
                autoFocus
                value={companySearch}
                onChange={(event) => setCompanySearch(event.target.value)}
                placeholder="Search companies"
                className="w-full rounded-2xl border border-border-subtle bg-bg-secondary py-3 pl-10 pr-4 text-sm text-text-primary outline-none transition focus:border-orbit-primary"
              />
            </label>

            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {availableCompanies.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border-subtle px-4 py-8 text-center text-sm text-text-tertiary">
                  No companies match your search.
                </div>
              ) : (
                availableCompanies.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-bg-secondary px-4 py-3 text-left transition hover:border-orbit-primary"
                    onClick={() => void handleLinkCompany(entry.id)}
                    disabled={linkingCompanyId === entry.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text-primary">{entry.name}</p>
                      <p className="mt-1 truncate text-xs text-text-tertiary">
                        {[entry.domain, entry.industry, entry.city].filter(Boolean).join(" · ") || "No additional details"}
                      </p>
                    </div>
                    {linkingCompanyId === entry.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-orbit-primary" />
                    ) : (
                      <Plus className="h-4 w-4 text-orbit-primary" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LeadDetailRoute() {
  return (
    <AppLayout pageTitle="Lead detail">
      <LeadDetailPage />
    </AppLayout>
  );
}
