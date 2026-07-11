import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail, Phone, Plus, Search, Users } from "lucide-react";

const contacts = [
  {
    name: "Priya Sharma",
    company: "Orbit Labs",
    email: "priya@orbitlabs.ai",
    phone: "+91 98765 43210",
    stage: "Qualified",
  },
  {
    name: "Rahul Verma",
    company: "Northstar Ventures",
    email: "rahul@northstar.vc",
    phone: "+91 98111 22334",
    stage: "Proposal",
  },
  {
    name: "Ananya Gupta",
    company: "Freelance Studio",
    email: "ananya@studio.dev",
    phone: "+91 99000 77889",
    stage: "New Lead",
  },
];

export const metadata: Metadata = {
  title: "Contacts | Orbit CRM",
  description:
    "Manage relationships, track touchpoints, and move leads from first hello to closed won.",
};

export default function ContactsPage() {
  return (
    <main className="min-h-screen bg-bg-primary px-6 py-12 text-text-primary md:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-default p-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-text-secondary">Contacts</p>
            <h1 className="text-3xl font-semibold">People pipeline built for modern teams</h1>
            <p className="max-w-2xl text-sm text-text-secondary md:text-base">
              Manage relationships, track touchpoints, and move leads from first hello to closed won.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              id="contacts-back-btn"
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-border-default px-4 py-2 text-sm text-text-primary transition hover:bg-surface-hover"
            >
              Back to landing
            </Link>
            <button
              id="contacts-add-btn"
              className="inline-flex items-center gap-2 rounded-full bg-orbit-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-orbit-primary-hover"
            >
              <Plus className="h-4 w-4" />
              Add contact
            </button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Total contacts", value: "1,284", icon: Users },
            { label: "New this week", value: "42", icon: Plus },
            { label: "Ready to follow up", value: "18", icon: ArrowRight },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border-subtle bg-bg-secondary p-5">
              <div className="mb-4 inline-flex rounded-lg bg-orbit-primary-muted p-2 text-orbit-primary">
                <item.icon className="h-4 w-4" />
              </div>
              <p className="text-sm text-text-secondary">{item.label}</p>
              <p className="mt-2 text-3xl font-semibold">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-border-subtle bg-bg-secondary p-6 overflow-hidden">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 rounded-full border border-border-default px-4 py-2 text-sm text-text-secondary">
              <Search className="h-4 w-4" />
              Search contacts, companies, or tags
            </div>
            <div className="text-sm text-text-secondary">Showing {contacts.length} sample contacts</div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border-subtle">
            <table className="min-w-[800px] divide-y divide-border-subtle text-left md:min-w-full">
              <thead className="bg-surface-default text-sm text-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle bg-bg-secondary">
                {contacts.map((contact) => (
                  <tr key={contact.email} className="text-sm">
                    <td className="px-4 py-4 font-medium text-text-primary">{contact.name}</td>
                    <td className="px-4 py-4 text-text-secondary">{contact.company}</td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-2 text-text-secondary">
                        <Mail className="h-4 w-4" />
                        {contact.email}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-2 text-text-secondary">
                        <Phone className="h-4 w-4" />
                        {contact.phone}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-orbit-primary-muted px-3 py-1 text-xs font-medium text-orbit-primary">
                        {contact.stage}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
