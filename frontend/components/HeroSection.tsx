"use client";

import { Button } from "@/components/ui/button";

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

const trustItems = [
  { icon: ShieldIcon, label: "SOC 2 Type II ready" },
  { icon: ActivityIcon, label: "99.9% uptime SLA" },
  { icon: UsersIcon, label: "Trusted by 2,400+ teams" },
];

const sidebarItems = [
  { label: "Pipeline", active: true },
  { label: "Contacts" },
  { label: "Deals" },
  { label: "Tasks" },
  { label: "Analytics" },
];

const pipelineColumns = [
  {
    header: "New Lead",
    count: "12",
    deals: [
      { title: "Acme Corporation", meta: "₹24,00,000 · Rahul S", tag: "Warm" },
      { title: "BuildRight Inc", meta: "₹18,50,000 · Priya K", tag: null },
    ],
  },
  {
    header: "Qualified",
    count: "8",
    deals: [
      { title: "CloudNine SaaS", meta: "₹42,00,000 · Rahul S", tag: "Hot" },
      { title: "DataFlow Systems", meta: "₹12,00,000 · Ananya R", tag: null },
    ],
  },
  {
    header: "Negotiation",
    count: "5",
    deals: [
      { title: "Vertex Labs", meta: "₹35,00,000 · Priya K", tag: "Proposal" },
    ],
  },
  {
    header: "Closed Won",
    count: "24",
    deals: [
      { title: "TechStart Fund", meta: "₹64,00,000 · Rahul S", tag: null },
    ],
  },
];

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-[140px] pt-[96px] sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-[1fr_1.15fr] lg:gap-16">
        {/* Left column */}
        <div className="flex flex-col gap-7">
          <p className="text-xs font-normal uppercase tracking-[0.1em] text-text-tertiary">
            Orbit CRM
          </p>
          <h1 className="font-serif text-[clamp(2.5rem,5vw,4.25rem)] font-normal leading-[1.08] tracking-[-0.03em] text-text-primary">
            A fast, beautiful CRM you&apos;ll actually want to use.
          </h1>
          <p className="max-w-[460px] text-lg font-normal leading-[1.55] text-text-secondary sm:text-[19px]">
            Orbit replaces spreadsheets and overpriced enterprise tools with an AI-native CRM designed for modern startups and small teams. Set up in minutes. Priced for growth.
          </p>
          <div className="mt-2 flex flex-wrap gap-4">
            <Button className="bg-orbit-primary font-sans text-sm font-medium tracking-[0.01em] text-[#0b0b0b] hover:bg-orbit-primary-hover">
              Start free trial
            </Button>
            <Button
              variant="outline"
              className="border-border-default bg-transparent font-sans text-sm font-medium tracking-[0.01em] text-text-primary hover:bg-surface-hover hover:text-text-primary"
            >
              Book a demo
            </Button>
          </div>
          <div className="mt-10 flex flex-col gap-6 border-t border-border-default pt-8 sm:flex-row sm:items-center sm:gap-7">
            {trustItems.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-[13px] text-text-tertiary">
                <item.icon />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        {/* Right column — dashboard mockup */}
        <div className="relative">
          {/* Radial purple glow */}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: "600px",
              height: "480px",
              background: "radial-gradient(ellipse at center, rgba(129, 116, 248, 0.14) 0%, transparent 65%)",
            }}
          />

          {/* Floating mockup shell */}
          <div
            className="animate-float relative z-10 flex overflow-hidden rounded-md border border-border-default bg-bg-secondary shadow-[0_32px_72px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(255,255,255,0.03)]"
            style={{ height: "440px" }}
          >
            {/* Sidebar */}
            <div className="hidden flex-col gap-7 border-r border-border-default bg-bg-secondary/95 px-3.5 py-5 sm:flex" style={{ width: "176px" }}>
              <div className="pl-2 font-serif text-[17px] font-normal tracking-[-0.01em] text-text-primary">
                Orbit
              </div>
              <div className="flex flex-col gap-1">
                {sidebarItems.map((item) => (
                  <div
                    key={item.label}
                    className={`rounded px-3 py-2 text-xs tracking-[0.01em] ${
                      item.active
                        ? "bg-orbit-primary-muted text-orbit-primary"
                        : "text-text-tertiary"
                    }`}
                  >
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="flex min-w-0 flex-1 flex-col">
              {/* Topbar */}
              <div className="flex h-[52px] items-center justify-between border-b border-border-default px-5">
                <div className="text-sm font-medium text-text-primary">
                  Sales Pipeline
                </div>
                <div className="rounded bg-orbit-primary px-3.5 py-1.5 text-xs font-medium text-[#0b0b0b]">
                  + Add deal
                </div>
              </div>

              {/* Board */}
              <div className="flex flex-1 gap-3 overflow-hidden p-4">
                {pipelineColumns.map((col) => (
                  <div
                    key={col.header}
                    className="flex min-w-0 flex-1 flex-col gap-2 rounded border border-border-default bg-bg-primary p-3"
                  >
                    <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.1em] text-text-tertiary">
                      {col.header}
                      <span className="rounded-full bg-bg-tertiary px-1.5 py-0.5 text-[10px] text-text-secondary">
                        {col.count}
                      </span>
                    </div>
                    {col.deals.map((deal) => (
                      <div
                        key={deal.title}
                        className="flex flex-col gap-1.5 rounded border border-border-default bg-bg-secondary p-2.5"
                      >
                        <div className="text-xs font-medium text-text-primary">
                          {deal.title}
                        </div>
                        <div className="font-mono text-[11px] text-text-tertiary">
                          {deal.meta}
                        </div>
                        {deal.tag && (
                          <div className="mt-0.5 flex gap-1">
                            <span
                              className="rounded-full px-1.5 py-0.5 text-[9px]"
                              style={{
                                background: "rgba(129,116,248,0.1)",
                                color: "var(--orbit-primary)",
                              }}
                            >
                              {deal.tag}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
