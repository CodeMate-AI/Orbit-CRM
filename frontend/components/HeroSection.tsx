"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

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
    <section className="relative overflow-hidden px-4 pb-16 lg:pb-[140px] pt-[96px] sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
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
            <Button
              id="hero-signup-btn"
              className="bg-orbit-primary font-sans text-sm font-medium tracking-[0.01em] text-[#0b0b0b] hover:bg-orbit-primary-hover"
              asChild
            >
              <Link href="/signup">Start free trial</Link>
            </Button>
            <Button
              id="hero-demo-btn"
              variant="outline"
              className="border-border-default bg-transparent font-sans text-sm font-medium tracking-[0.01em] text-text-primary hover:bg-surface-hover hover:text-text-primary"
            >
              Book a demo
            </Button>
          </div>
        </div>

        {/* Right column — dashboard mockup (hidden on mobile and iPad) */}
        <div className="relative hidden lg:block">
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
            className="animate-float relative z-10 flex w-full max-w-full overflow-hidden rounded-md border border-border-default bg-bg-secondary shadow-[0_32px_72px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(255,255,255,0.03)]"
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
              <div className="flex flex-1 gap-3 overflow-x-auto p-4 lg:overflow-hidden">
                {pipelineColumns.map((col) => (
                  <div
                    key={col.header}
                    className="flex min-w-[160px] flex-1 flex-col gap-2 rounded border border-border-default bg-bg-primary p-3 md:min-w-0"
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
