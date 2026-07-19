"use client";

import { motion } from "framer-motion";

function CheckIcon() {
  return (
    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-success/25 bg-success/10">
      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
        <path d="M1 3L3 5L7 1" stroke="#32d583" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

const rowVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

const features = [
  {
    eyebrow: "Contacts & Deals",
    title: "One record for every relationship",
    body: "Stop digging through emails and notes. Every contact, company, and deal lives in one unified profile with complete context — interactions, deal history, and next steps all in a single view.",
    checks: ["Rich contact profiles with timeline", "Company hierarchy and relationships", "Deal timeline and activity history"],
    visualType: "contact",
  },
  {
    eyebrow: "Pipeline",
    title: "See your pipeline at a glance",
    body: "Drag, drop, and manage deals through every stage. A visual sales process your team will actually use — clean, fast, and designed for momentum.",
    checks: ["Fully customizable stages", "Deal value and probability tracking", "Win rates and deal status tracking"],
    visualType: "kanban",
  },
  {
    eyebrow: "Customization",
    title: "Your business isn't generic. Neither is your CRM.",
    body: "Capture the data that matters to you. Add custom fields, tags, and categories without writing a single line of code. Make Orbit fit your workflow, not the other way around.",
    checks: ["Text, number, date, and dropdown fields", "Multi-select and customizable fields", "Required field enforcement"],
    visualType: "fields",
  },
  {
    eyebrow: "AI Assistant",
    title: "Answers, insights, and updates — just ask.",
    body: "Orbit's AI understands your data and helps you work faster. Generate summaries, update records, and get forecasts without clicking through menus or running reports.",
    checks: ["Natural language queries", "Pipeline forecasting and insights", "Smart follow-up reminders"],
    visualType: "ai",
  },
  {
    eyebrow: "Analytics",
    title: "See what's working. Fix what isn't.",
    body: "Real-time dashboards give every team member the metrics they need. From individual performance to company-wide trends — clarity without the complexity of enterprise reporting tools.",
    checks: ["Workspace dashboards", "Revenue forecasting", "Stage summaries and activity logs"],
    visualType: "analytics",
  },
];

function ContactVisual() {
  return (
    <div className="w-full max-w-[340px] rounded border border-border-default bg-bg-primary p-6 flex flex-col gap-5">
      <div className="flex items-center gap-3.5">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-bg-tertiary font-serif text-lg text-orbit-primary">R</div>
        <div>
          <div className="text-[15px] font-medium text-text-primary">Rahul Sharma</div>
          <div className="mt-0.5 text-xs text-text-tertiary">BuildRight Inc · Sales Director</div>
        </div>
      </div>
      <div>
        {[
          { label: "Email", value: "rahul@buildright.in" },
          { label: "Phone", value: "+91 98765 43210" },
          { label: "Source", value: "Website" },
          { label: "Last contact", value: "2 days ago" },
        ].map((r) => (
          <div key={r.label} className="flex justify-between border-b border-border-default py-2 text-xs">
            <span className="text-text-tertiary">{r.label}</span>
            <span className="font-mono text-[11px] text-text-secondary">{r.value}</span>
          </div>
        ))}
      </div>
      <div>
        <div className="mb-2 text-[10px] uppercase tracking-[0.08em] text-text-tertiary">Active Deals</div>
        <div className="flex items-center justify-between rounded border border-border-default bg-bg-secondary px-3 py-2.5 text-xs">
          <span className="text-text-secondary">Enterprise License</span>
          <span className="font-mono text-[11px] text-orbit-primary">₹42L</span>
        </div>
      </div>
    </div>
  );
}

function KanbanVisual() {
  return (
    <div className="flex w-full max-w-[380px] gap-3">
      {[
        {
          header: "Qualified",
          count: "8",
          cards: [
            { title: "CloudNine SaaS", meta: "₹42,00,000", fill: "75%" },
            { title: "DataFlow", meta: "₹12,00,000", fill: "40%" },
          ],
        },
        {
          header: "Proposal",
          count: "3",
          cards: [{ title: "Vertex Labs", meta: "₹35,00,000", fill: "90%" }],
        },
      ].map((col) => (
        <div key={col.header} className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.1em] text-text-tertiary">
            {col.header}
            <span className="rounded-full bg-bg-tertiary px-1.5 py-0.5 text-[9px]">{col.count}</span>
          </div>
          {col.cards.map((c) => (
            <div key={c.title} className="flex flex-col gap-2 rounded border border-border-default bg-bg-primary p-3">
              <div className="text-xs font-medium text-text-primary">{c.title}</div>
              <div className="font-mono text-[10px] text-text-tertiary">{c.meta}</div>
              <div className="mt-1 h-[3px] overflow-hidden rounded bg-bg-tertiary">
                <div className="h-full rounded bg-orbit-primary" style={{ width: c.fill }} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function FieldsVisual() {
  return (
    <div className="flex w-full max-w-[340px] flex-col gap-2.5">
      <div className="mb-1 text-[11px] uppercase tracking-[0.08em] text-text-tertiary">Custom Fields</div>
      {[
        { type: "Text", name: "GST Number" },
        { type: "Select", name: "Industry Vertical" },
        { type: "Date", name: "Contract Renewal" },
        { type: "Number", name: "Team Size" },
      ].map((f) => (
        <div key={f.name} className="flex items-center gap-3 rounded border border-border-default bg-bg-primary px-3.5 py-3">
          <span className="rounded bg-bg-tertiary px-2 py-[3px] font-mono text-[10px] uppercase tracking-[0.08em] text-text-tertiary">{f.type}</span>
          <span className="text-[13px] text-text-secondary">{f.name}</span>
        </div>
      ))}
      <div className="mt-1 text-xs text-orbit-primary">+ Add custom field</div>
    </div>
  );
}

function AiVisual() {
  return (
    <div className="flex w-full max-w-[360px] flex-col gap-4">
      <div className="relative rounded border border-border-default bg-bg-primary p-4 text-[13px] leading-[1.5] text-text-secondary">
        <span
          className="absolute -top-2 left-3 rounded-full px-2 py-[2px] text-[9px] font-medium tracking-[0.06em] text-[#0b0b0b]"
          style={{ background: "var(--orbit-primary)" }}
        >
          AI
        </span>
        <p className="mb-2">
          Based on your current velocity,{" "}
          <strong className="text-text-primary">Q3 revenue is forecasted at ₹42.8 lakhs</strong>{" "}
          — an 18% increase over Q2.
        </p>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-text-tertiary">Confidence: 87%</span>
          <div className="mt-0 h-1 flex-1 overflow-hidden rounded bg-bg-tertiary">
            <div
              className="h-full rounded"
              style={{
                width: "87%",
                background: "linear-gradient(90deg, var(--orbit-primary), #f3abfd)",
              }}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-[rgba(243,171,253,0.15)] bg-[rgba(243,171,253,0.08)] px-3 py-1 text-[11px] font-medium tracking-[0.06em] text-[#f3abfd]">
          Forecast
        </span>
        <span className="rounded-full border border-[rgba(176,253,190,0.15)] bg-[rgba(176,253,190,0.08)] px-3 py-1 text-[11px] font-medium tracking-[0.06em] text-[#b0fdbe]">
          +18% QoQ
        </span>
      </div>
    </div>
  );
}

function AnalyticsVisual() {
  const bars = [35, 50, 42, 65, 58, 82];
  return (
    <div className="flex w-full max-w-[360px] flex-col gap-5">
      <div className="flex items-end justify-between rounded border border-border-default bg-bg-primary p-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.08em] text-text-tertiary">Monthly Revenue</div>
          <div className="mt-1.5 font-mono text-2xl text-text-primary">₹24.5L</div>
        </div>
        <div className="rounded-full bg-[rgba(176,253,190,0.08)] px-2.5 py-1 text-xs text-[#b0fdbe]">+18%</div>
      </div>
      <div className="flex h-[100px] items-end gap-2 rounded border border-border-default bg-bg-primary p-5">
        {bars.map((h, i) => (
          <div
            key={i}
            className={`flex-1 rounded-t ${i === bars.length - 1 ? "bg-orbit-primary" : "bg-bg-tertiary"}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function FeatureVisual({ type }: { type: string }) {
  switch (type) {
    case "contact":
      return <ContactVisual />;
    case "kanban":
      return <KanbanVisual />;
    case "fields":
      return <FieldsVisual />;
    case "ai":
      return <AiVisual />;
    case "analytics":
      return <AnalyticsVisual />;
    default:
      return null;
  }
}

export default function FeaturesSection() {
  return (
    <section id="product" className="px-4 py-16 lg:py-[140px] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55 }}
          className="mb-20 flex max-w-[560px] flex-col gap-4"
        >
          <p className="text-xs font-normal uppercase tracking-[0.1em] text-text-tertiary">Features</p>
          <h2 className="font-serif text-[clamp(2rem,4vw,2.75rem)] font-normal leading-[1.15] tracking-[-0.01em] text-text-primary">
            Everything you need.
            <br />
            Nothing you don&apos;t.
          </h2>
          <p className="text-lg font-normal leading-[1.55] text-text-secondary sm:text-[19px]">
            Powerful capabilities, thoughtfully designed for teams that value clarity over complexity.
          </p>
        </motion.div>

        <div className="flex flex-col gap-[140px]">
          {features.map((feature, i) => {
            const isReversed = i % 2 !== 0;
            return (
              <motion.div
                key={feature.eyebrow}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                variants={rowVariants}
                className={`flex flex-col gap-12 md:gap-20 ${isReversed ? "md:flex-row-reverse" : "md:flex-row"} md:items-center`}
              >
                <div className="flex min-h-[360px] flex-1 items-center justify-center rounded border border-border-default bg-bg-secondary p-8 relative overflow-hidden">
                  <FeatureVisual type={feature.visualType} />
                </div>
                <div className="flex flex-1 flex-col gap-4">
                  <p className="mb-1 text-xs font-normal uppercase tracking-[0.1em] text-text-tertiary">{feature.eyebrow}</p>
                  <h3 className="font-serif text-[clamp(1.5rem,3vw,2rem)] font-normal leading-[1.2] text-text-primary">
                    {feature.title}
                  </h3>
                  <p className="max-w-[420px] text-[15px] font-normal leading-[1.65] text-text-secondary">{feature.body}</p>
                  <ul className="mt-1.5 flex flex-col gap-3">
                    {feature.checks.map((check) => (
                      <li key={check} className="flex items-start gap-2.5 text-sm text-text-secondary">
                        <CheckIcon />
                        {check}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
