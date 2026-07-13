"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Mail, Phone, Plus, Search, Users, Loader2, UserX } from "lucide-react";
import AppLayout, { useWorkspace } from "@/components/AppLayout";
import { peopleApi, PersonRow, CreatePersonInput } from "@/lib/people-api";

// ── Add Contact Modal ──────────────────────────────────────────────────────
function AddContactModal({
  workspaceId,
  onClose,
  onCreated,
}: {
  workspaceId: string;
  onClose: () => void;
  onCreated: (person: PersonRow) => void;
}) {
  const [form, setForm] = useState<CreatePersonInput>({ firstName: "", lastName: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First and last name are required.");
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
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
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
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
function ContactsContent() {
  const { workspaceId } = useWorkspace();
  const [contacts, setContacts] = useState<PersonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    peopleApi
      .list(workspaceId)
      .then((res) => setContacts(res.data))
      .catch((err) => setError(err.message || "Failed to load contacts."))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.company ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const newThisMonth = contacts.filter((c) => {
    const d = new Date(c.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="p-6 md:p-8 mx-auto flex w-full max-w-6xl flex-col gap-6 md:gap-8">
      {/* Header */}
      <section className="rounded-xl border border-border-subtle bg-surface-default p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-text-secondary">Contacts</p>
            <h2 className="text-2xl md:text-3xl font-semibold">People pipeline</h2>
            <p className="max-w-2xl text-sm text-text-secondary">
              Manage relationships, track touchpoints, and move leads from first hello to closed won.
            </p>
          </div>
          <button
            id="contacts-add-btn"
            className="inline-flex items-center gap-2 rounded bg-orbit-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-orbit-primary-hover"
            onClick={() => setShowModal(true)}
            disabled={!workspaceId}
          >
            <Plus className="h-4 w-4" />
            Add contact
          </button>
        </div>
      </section>

      {/* Stat cards */}
      <section className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {[
          { label: "Total contacts", value: loading ? "—" : contacts.length.toLocaleString(), icon: Users },
          { label: "New this month", value: loading ? "—" : newThisMonth.toString(), icon: Plus },
          { label: "Showing", value: loading ? "—" : filtered.length.toString(), icon: ArrowRight },
        ].map((item) => (
          <div key={item.label} className="rounded border border-border-subtle bg-bg-secondary p-5">
            <div className="mb-4 inline-flex rounded bg-orbit-primary-muted p-2 text-orbit-primary">
              <item.icon className="h-4 w-4" />
            </div>
            <p className="text-sm text-text-secondary">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold font-mono">{item.value}</p>
          </div>
        ))}
      </section>

      {/* Table */}
      <section className="overflow-hidden rounded border border-border-subtle bg-bg-secondary p-5 md:p-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 rounded border border-border-default px-4 py-2 text-sm text-text-secondary w-full md:w-auto">
            <Search className="h-4 w-4 shrink-0" />
            <input
              className="bg-transparent outline-none placeholder-text-tertiary w-full"
              placeholder="Search contacts, companies…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="text-sm text-text-secondary shrink-0">
            {loading ? "Loading…" : `${filtered.length} contact${filtered.length !== 1 ? "s" : ""}`}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center gap-3 py-16 text-text-tertiary">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading contacts…</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="py-12 text-center text-sm text-error">{error}</div>
        )}

        {/* Empty state */}
        {!loading && !error && contacts.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="rounded-full bg-orbit-primary-muted p-4">
              <UserX className="h-8 w-8 text-orbit-primary" />
            </div>
            <div>
              <p className="font-medium text-text-primary">No contacts yet</p>
              <p className="mt-1 text-sm text-text-secondary">Add your first contact to get started.</p>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded bg-orbit-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-orbit-primary-hover"
              onClick={() => setShowModal(true)}
            >
              <Plus className="h-4 w-4" />
              Add first contact
            </button>
          </div>
        )}

        {/* No search results */}
        {!loading && !error && contacts.length > 0 && filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-text-secondary">
            No contacts match &ldquo;{search}&rdquo;
          </div>
        )}

        {/* Data table */}
        {!loading && !error && filtered.length > 0 && (
          <div className="overflow-x-auto rounded border border-border-subtle">
            <table className="min-w-[700px] divide-y divide-border-subtle text-left md:min-w-full">
              <thead className="bg-surface-default text-sm text-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Job title</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle bg-bg-secondary">
                {filtered.map((contact) => (
                  <tr key={contact.id} className="text-sm hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-4 font-medium text-text-primary">{contact.name}</td>
                    <td className="px-4 py-4 text-text-secondary">{contact.jobTitle ?? "—"}</td>
                    <td className="px-4 py-4">
                      {contact.email ? (
                        <span className="inline-flex items-center gap-2 text-text-secondary">
                          <Mail className="h-4 w-4 shrink-0" />
                          {contact.email}
                        </span>
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {contact.phone ? (
                        <span className="inline-flex items-center gap-2 text-text-secondary">
                          <Phone className="h-4 w-4 shrink-0" />
                          {contact.phone}
                        </span>
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-text-secondary">{contact.company ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal */}
      {showModal && workspaceId && (
        <AddContactModal
          workspaceId={workspaceId}
          onClose={() => setShowModal(false)}
          onCreated={(person) => {
            setContacts((prev) => [person, ...prev]);
            setShowModal(false);
          }}
        />
      )}
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
