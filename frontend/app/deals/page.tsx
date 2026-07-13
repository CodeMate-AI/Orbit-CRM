"use client";

import { CalendarClock, CircleDollarSign, Plus } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const columns = [
  {
    title: "New",
    deals: [
      { name: "Acme Expansion", value: "₹3.2L", closeDate: "16 Jul" },
      { name: "Northstar Pilot", value: "₹90K", closeDate: "20 Jul" },
    ],
  },
  {
    title: "Qualified",
    deals: [{ name: "Orbit Annual Plan", value: "₹4.8L", closeDate: "22 Jul" }],
  },
  {
    title: "Proposal",
    deals: [
      { name: "Studio Retainer", value: "₹1.6L", closeDate: "27 Jul" },
      { name: "Helio Migration", value: "₹2.4L", closeDate: "30 Jul" },
    ],
  },
  {
    title: "Won",
    deals: [{ name: "Fintech CRM Rollout", value: "₹8.1L", closeDate: "02 Jul" }],
  },
];

export default function DealsPage() {
  return (
    <AppLayout pageTitle="Deals">
      <div className="p-8 mx-auto flex w-full max-w-7xl flex-col gap-8">
        <section className="rounded-xl border border-border-subtle bg-surface-default p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-text-secondary">Deals</p>
              <h2 className="mt-2 text-3xl font-semibold">Opportunity board</h2>
              <p className="mt-2 max-w-2xl text-sm text-text-secondary md:text-base">
                Review pipeline health, spot stuck deals, and keep revenue momentum visible across the team.
              </p>
            </div>
            <button
              id="deals-add-btn"
              className="inline-flex items-center gap-2 rounded bg-orbit-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-orbit-primary-hover"
            >
              <Plus className="h-4 w-4" />
              New deal
            </button>
          </div>
        </section>

        <section className="flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-4 md:overflow-visible">
          {columns.map((column) => (
            <div key={column.title} className="min-w-[280px] rounded border border-border-subtle bg-bg-secondary p-4 md:min-w-0">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">{column.title}</h2>
                  <p className="text-sm text-text-secondary">{column.deals.length} deals</p>
                </div>
                <span className="rounded bg-bg-tertiary px-2.5 py-1 text-xs text-text-secondary">
                  {column.deals.length}
                </span>
              </div>

              <div className="space-y-3">
                {column.deals.map((deal) => (
                  <article key={deal.name} className="rounded border border-border-subtle bg-bg-tertiary p-4 shadow-sm">
                    <h3 className="font-medium text-text-primary">{deal.name}</h3>
                    <div className="mt-3 flex items-center gap-2 text-sm text-text-secondary">
                      <CircleDollarSign className="h-4 w-4 text-orbit-primary" />
                      <span className="font-mono">{deal.value}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm text-text-secondary">
                      <CalendarClock className="h-4 w-4" />
                      <span className="font-mono">Close by {deal.closeDate}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </AppLayout>
  );
}
