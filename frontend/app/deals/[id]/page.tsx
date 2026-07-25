"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout, { useWorkspace } from "@/components/AppLayout";
import ActivityTimeline from "@/components/ActivityTimeline";
import AttachmentList from "@/components/AttachmentList";
import NotesTimeline from "@/components/NotesTimeline";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { companiesApi, CompanyRow } from "@/lib/companies-api";
import { opportunitiesApi, OpportunityDetailRow, StageColumn } from "@/lib/opportunities-api";
import { peopleApi, PersonRow } from "@/lib/people-api";
import { formatMoney, buildContactLabel } from "../deal-detail-utils.js";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Paperclip,
  Loader2,
  Mail,
  Phone,
  Plus,
  Search,
  X,
  ChevronDown,
  Users,
  Clock3,
} from "lucide-react";

function formatDate(value: string | null, options: Intl.DateTimeFormatOptions) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", options);
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function DealDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const dealId = params.id;
  const { workspaceId } = useWorkspace();

  const [detail, setDetail] = useState<OpportunityDetailRow | null>(null);
  const [stages, setStages] = useState<StageColumn[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draftName, setDraftName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingStageId, setSavingStageId] = useState<string | null>(null);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [linkingPersonId, setLinkingPersonId] = useState<string | null>(null);
  const [unlinkingPersonId, setUnlinkingPersonId] = useState<string | null>(null);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [linkingCompanyId, setLinkingCompanyId] = useState<string | null>(null);

  useEffect(() => {
    document.title = detail?.name ? `${detail.name} | Orbit CRM` : "Deal detail | Orbit CRM";
  }, [detail?.name]);

  useEffect(() => {
    if (!workspaceId || !dealId) return;

    setLoading(true);
    setError("");

    Promise.all([
      opportunitiesApi.get(dealId),
      opportunitiesApi.list(workspaceId),
      companiesApi.list(workspaceId),
      peopleApi.list(workspaceId),
    ])
      .then(([opp, listResponse, companyRows, peopleResponse]) => {
        setDetail(opp);
        setDraftName(opp.name);
        setStages(listResponse.stages);
        setCompanies(companyRows);
        setPeople(peopleResponse.data);
      })
      .catch((err: any) => {
        setError(err.message || "Failed to load deal.");
      })
      .finally(() => setLoading(false));
  }, [workspaceId, dealId]);

  const currentStage = useMemo(() => {
    if (!detail) return null;
    return stages.find((stage) => stage.id === detail.stageId) ?? detail.stage ?? null;
  }, [detail, stages]);

  const company = useMemo(() => {
    if (!detail?.companyId) return null;
    return companies.find((entry) => entry.id === detail.companyId) ?? detail.company ?? null;
  }, [companies, detail?.company, detail?.companyId]);

  const availableCompanies = useMemo(() => {
    const search = companySearch.trim().toLowerCase();
    return companies
      .filter((entry) => {
        if (!search) return true;
        return [entry.name, entry.domain ?? "", entry.industry ?? "", entry.city ?? ""].join(" ").toLowerCase().includes(search);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [companySearch, companies]);

  const linkedContactIds = useMemo(() => new Set(detail?.contacts.map((contact) => contact.id) ?? []), [detail?.contacts]);

  const availableContacts = useMemo(() => {
    const search = contactSearch.trim().toLowerCase();
    return people
      .filter((person) => !linkedContactIds.has(person.id))
      .filter((person) => {
        if (!search) return true;
        const companyName = person.company ?? "";
        return [person.name, person.email ?? "", person.jobTitle ?? "", companyName]
          .join(" ")
          .toLowerCase()
          .includes(search);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [contactSearch, linkedContactIds, people]);

  const handleSaveName = async () => {
    if (!detail) return;

    const nextName = draftName.trim();
    if (!nextName) {
      toast.error("Deal name is required.");
      setDraftName(detail.name);
      return;
    }

    if (nextName === detail.name) return;

    setSavingName(true);
    try {
      await opportunitiesApi.update(detail.id, { name: nextName });
      const refreshed = await opportunitiesApi.get(detail.id);
      setDetail(refreshed);
      setDraftName(refreshed.name);
      toast.success("Deal name updated.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update deal name.");
      setDraftName(detail.name);
    } finally {
      setSavingName(false);
    }
  };

  const handleStageChange = async (stageId: string) => {
    if (!detail || stageId === detail.stageId) return;

    const previousStageId = detail.stageId;
    const previousStage = stages.find((stage) => stage.id === previousStageId) ?? detail.stage ?? null;
    const nextStage = stages.find((stage) => stage.id === stageId) ?? null;

    setSavingStageId(stageId);
    setDetail((current) =>
      current
        ? {
            ...current,
            stageId,
            stage: nextStage ?? current.stage,
          }
        : current,
    );

    try {
      const updated = await opportunitiesApi.update(detail.id, { stageId });
      const refreshed = await opportunitiesApi.get(detail.id);
      setDetail(refreshed);
      toast.success(updated.stageName ? `Moved to ${updated.stageName}` : "Stage updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to move stage.");
      setDetail((current) =>
        current
          ? {
              ...current,
              stageId: previousStageId,
              stage: previousStage,
            }
          : current,
      );
    } finally {
      setSavingStageId(null);
    }
  };

  const handleLinkContact = async (personId: string) => {
    if (!detail) return;
    setLinkingPersonId(personId);
    try {
      const updated = await opportunitiesApi.linkContact(detail.id, personId);
      setDetail(updated);
      setContactDialogOpen(false);
      setContactSearch("");
      toast.success("Contact linked successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to link contact.");
    } finally {
      setLinkingPersonId(null);
    }
  };

  const handleUnlinkContact = async (personId: string) => {
    if (!detail) return;
    setUnlinkingPersonId(personId);
    try {
      const updated = await opportunitiesApi.unlinkContact(detail.id, personId);
      setDetail(updated);
      toast.success("Contact removed.");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove contact.");
    } finally {
      setUnlinkingPersonId(null);
    }
  };

  const handleLinkCompany = async (companyId: string) => {
    if (!detail) return;
    setLinkingCompanyId(companyId);
    try {
      await opportunitiesApi.update(detail.id, { companyId });
      const refreshed = await opportunitiesApi.get(detail.id);
      setDetail(refreshed);
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
    if (!detail) return;
    setLinkingCompanyId(detail.companyId);
    try {
      await opportunitiesApi.update(detail.id, { companyId: "" });
      const refreshed = await opportunitiesApi.get(detail.id);
      setDetail(refreshed);
      setCompanyDialogOpen(false);
      setCompanySearch("");
      toast.success("Company unlinked successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to unlink company.");
    } finally {
      setLinkingCompanyId(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-[1600px] items-center justify-center px-6 py-10 text-text-secondary">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading deal…
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-[1600px] flex-col items-center justify-center gap-4 px-6 py-10 text-center">
        <p className="text-sm text-text-secondary">{error || "Deal not found."}</p>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-secondary px-4 py-2 text-sm text-text-secondary transition hover:border-orbit-primary hover:text-text-primary"
          onClick={() => router.push("/deals")}
        >
          <ArrowLeft className="h-4 w-4" /> Back to deals
        </button>
      </div>
    );
  }

  const stageLabel = currentStage?.name ?? "No stage";
  const stageProbability = detail.probability ?? currentStage?.probability ?? null;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-secondary px-4 py-2 text-sm text-text-secondary transition hover:border-orbit-primary hover:text-text-primary"
          onClick={() => router.push("/deals")}
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-secondary px-3 py-1.5 text-xs uppercase tracking-[0.24em] text-text-tertiary">
          <Clock3 className="h-3.5 w-3.5" /> Deal detail
        </div>
      </div>

      <section className="rounded-[28px] border border-border-subtle bg-[radial-gradient(circle_at_top_right,_rgba(129,116,248,0.12),_transparent_32%),linear-gradient(180deg,_var(--bg-secondary),_var(--bg-primary))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)] md:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.24em] text-text-tertiary">
              <CircleDollarSign className="h-3.5 w-3.5" /> Opportunity workspace
            </div>

            <div className="space-y-3">
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onBlur={() => void handleSaveName()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.currentTarget.blur();
                  }
                  if (event.key === "Escape") {
                    setDraftName(detail.name);
                    event.currentTarget.blur();
                  }
                }}
                disabled={savingName}
                className="w-full max-w-4xl rounded-3xl border border-border-subtle bg-bg-secondary/70 px-4 py-3 text-2xl font-semibold text-text-primary outline-none transition placeholder:text-text-muted focus:border-orbit-primary disabled:cursor-not-allowed disabled:opacity-70 sm:text-3xl"
                aria-label="Deal name"
              />
              <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                <span className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-tertiary/70 px-3 py-1.5">
                  <CircleDollarSign className="h-4 w-4 text-orbit-primary" /> {formatMoney(detail.amount)}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-tertiary/70 px-3 py-1.5">
                  <CalendarDays className="h-4 w-4 text-orbit-primary" /> Close date {formatDate(detail.closeDate, { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <span
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-text-primary"
                  style={{
                    borderColor: currentStage?.color ?? "var(--border-subtle)",
                    backgroundColor: currentStage?.color ? `${currentStage.color}18` : undefined,
                  }}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: currentStage?.color ?? "var(--orbit-primary)" }} />
                  {stageLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="w-full max-w-md space-y-2 rounded-3xl border border-border-subtle bg-bg-secondary/70 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-text-tertiary">Quick stage change</h2>
                <p className="mt-1 text-sm text-text-secondary">Move the deal to a different pipeline stage.</p>
              </div>
              {savingStageId ? <Loader2 className="h-4 w-4 animate-spin text-orbit-primary" /> : null}
            </div>

            <label className="relative block">
              <select
                value={detail.stageId}
                onChange={(event) => void handleStageChange(event.target.value)}
                disabled={Boolean(savingStageId)}
                className="w-full appearance-none rounded-2xl border border-border-subtle bg-bg-primary/80 px-4 py-3 pr-10 text-sm text-text-primary outline-none transition focus:border-orbit-primary disabled:cursor-not-allowed disabled:opacity-70"
              >
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            </label>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-border-subtle bg-bg-secondary/80 p-5 shadow-sm md:p-6">
            <ActivityTimeline workspaceId={workspaceId} opportunityId={detail.id} />
          </div>

          <div className="rounded-[28px] border border-border-subtle bg-bg-secondary/80 p-5 shadow-sm md:p-6">
            {workspaceId ? <NotesTimeline workspaceId={workspaceId} entityType="opportunity" entityId={detail.id} /> : null}
          </div>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-[28px] border border-border-subtle bg-bg-secondary/80 p-5 shadow-sm md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-text-tertiary">Company</h3>
                <p className="mt-1 text-sm text-text-secondary">Linked account information.</p>
              </div>
              <Building2 className="h-5 w-5 text-orbit-primary" />
            </div>

            {company || detail.company ? (
              <div className="rounded-3xl border border-border-subtle bg-bg-tertiary/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={detail.companyId ? `/companies/${detail.companyId}` : "#"}
                    className={`text-lg font-semibold transition ${detail.companyId ? "text-text-primary hover:text-orbit-primary" : "text-text-primary pointer-events-none"}`}
                  >
                    {company?.name ?? detail.company?.name ?? "Unknown company"}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-primary px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:border-orbit-primary hover:text-text-primary"
                      onClick={() => setCompanyDialogOpen(true)}
                    >
                      {detail.companyId ? "Change company" : "Link company"}
                    </button>
                    {detail.companyId ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-primary px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:border-red-400 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-70"
                        onClick={() => void handleUnlinkCompany()}
                        disabled={linkingCompanyId === detail.companyId}
                      >
                        {linkingCompanyId === detail.companyId ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                        Unlink
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 space-y-2 text-sm text-text-secondary">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-text-tertiary" />
                    <span>{company?.name ?? "Company not set"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-text-tertiary" />
                    <span>{company?.id ? "Linked account" : "Account not linked"}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-border-subtle bg-bg-tertiary/40 p-4 text-sm text-text-tertiary">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>No company linked to this deal.</span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-primary px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:border-orbit-primary hover:text-text-primary"
                    onClick={() => setCompanyDialogOpen(true)}
                  >
                    Link company
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-border-subtle bg-bg-secondary/80 p-5 shadow-sm md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-text-tertiary">Linked contacts</h3>
                <p className="mt-1 text-sm text-text-secondary">People associated with this opportunity.</p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-tertiary/70 px-3 py-2 text-xs font-medium text-text-secondary transition hover:border-orbit-primary hover:text-text-primary"
                onClick={() => setContactDialogOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" /> Add contact
              </button>
            </div>

            {detail.contacts.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border-subtle bg-bg-tertiary/40 p-4 text-sm text-text-tertiary">
                No contacts linked yet.
              </div>
            ) : (
              <div className="space-y-3">
                {detail.contacts.map((contact) => (
                  <div key={contact.id} className="rounded-3xl border border-border-subtle bg-bg-tertiary/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/contacts/${contact.id}`} className="block truncate text-sm font-semibold text-text-primary transition hover:text-orbit-primary">
                          {contact.name}
                        </Link>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-text-tertiary">
                          {contact.jobTitle || "No job title"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleUnlinkContact(contact.id)}
                        disabled={unlinkingPersonId === contact.id}
                        className="inline-flex items-center gap-2 rounded-full border border-border-subtle px-3 py-2 text-xs font-medium text-text-secondary transition hover:border-red-400 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {unlinkingPersonId === contact.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                        Remove
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3 text-xs text-text-secondary">
                      {contact.email ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-bg-primary/70 px-3 py-1.5">
                          <Mail className="h-3.5 w-3.5" /> {contact.email}
                        </span>
                      ) : null}
                      {contact.phone ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-bg-primary/70 px-3 py-1.5">
                          <Phone className="h-3.5 w-3.5" /> {contact.phone}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-border-subtle bg-bg-secondary/80 p-5 shadow-sm md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-text-tertiary">Details</h3>
                <p className="mt-1 text-sm text-text-secondary">Core deal metadata.</p>
              </div>
              <Users className="h-5 w-5 text-orbit-primary" />
            </div>

            <div className="grid gap-3 text-sm text-text-secondary sm:grid-cols-2">
              <div className="rounded-3xl border border-border-subtle bg-bg-tertiary/60 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Probability</p>
                <p className="mt-2 text-lg font-semibold text-text-primary">{stageProbability == null ? "—" : `${stageProbability}%`}</p>
              </div>
              <div className="rounded-3xl border border-border-subtle bg-bg-tertiary/60 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Lead source</p>
                <p className="mt-2 text-lg font-semibold text-text-primary">{detail.source || "—"}</p>
              </div>
              <div className="rounded-3xl border border-border-subtle bg-bg-tertiary/60 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Created</p>
                <p className="mt-2 text-sm font-medium text-text-primary">{formatDateTime(detail.createdAt)}</p>
              </div>
              <div className="rounded-3xl border border-border-subtle bg-bg-tertiary/60 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Last updated</p>
                <p className="mt-2 text-sm font-medium text-text-primary">{formatDateTime(detail.updatedAt)}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-border-subtle bg-bg-secondary/80 p-5 shadow-sm md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-text-tertiary">Attachments</h3>
                <p className="mt-1 text-sm text-text-secondary">Files stored against this opportunity.</p>
              </div>
              <Paperclip className="h-5 w-5 text-orbit-primary" />
            </div>

            {workspaceId ? (
              <AttachmentList workspaceId={workspaceId} entityType="opportunity" entityId={detail.id} />
            ) : (
              <div className="rounded-3xl border border-dashed border-border-subtle bg-bg-tertiary/40 p-4 text-sm text-text-tertiary">
                Workspace is not available.
              </div>
            )}
          </section>
        </aside>
      </section>

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
            <DialogTitle>Link company</DialogTitle>
            <DialogDescription>Search workspace companies and attach one to this deal.</DialogDescription>
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

      <Dialog
        open={contactDialogOpen}
        onOpenChange={(open) => {
          setContactDialogOpen(open);
          if (!open) {
            setContactSearch("");
            setLinkingPersonId(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add contact</DialogTitle>
            <DialogDescription>Search workspace people and link one to this deal.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input
                autoFocus
                value={contactSearch}
                onChange={(event) => setContactSearch(event.target.value)}
                placeholder="Search by name, title, email, or company"
                className="w-full rounded-2xl border border-border-subtle bg-bg-secondary py-3 pl-10 pr-4 text-sm text-text-primary outline-none transition focus:border-orbit-primary"
              />
            </label>

            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {availableContacts.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border-subtle bg-bg-tertiary/40 p-6 text-center text-sm text-text-tertiary">
                  No matching people found.
                </div>
              ) : (
                availableContacts.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => void handleLinkContact(person.id)}
                    disabled={linkingPersonId === person.id}
                    className="flex w-full items-center justify-between gap-4 rounded-3xl border border-border-subtle bg-bg-tertiary/60 p-4 text-left transition hover:border-orbit-primary hover:bg-bg-tertiary disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text-primary">{buildContactLabel(person)}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                        {person.email ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-bg-primary/70 px-2.5 py-1">
                            <Mail className="h-3 w-3" /> {person.email}
                          </span>
                        ) : null}
                        {person.company ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-bg-primary/70 px-2.5 py-1">
                            <Building2 className="h-3 w-3" /> {person.company}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-2 rounded-full border border-border-subtle px-3 py-2 text-xs font-medium text-text-secondary">
                      {linkingPersonId === person.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Link
                    </span>
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

export default function DealDetailRoute() {
  return (
    <AppLayout pageTitle="Deal detail">
      <DealDetailPage />
    </AppLayout>
  );
}
