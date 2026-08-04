"use client";

import { motion } from "framer-motion";

function ChatBubbleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8174f8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function TrendingUpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8174f8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8174f8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

const contextItems = [
  {
    icon: ChatBubbleIcon,
    title: "Natural language queries",
    desc: "\"Show me deals closing this month worth over ₹10 lakhs.\" No filters, no clicks.",
  },
  {
    icon: TrendingUpIcon,
    title: "Outreach templates",
    desc: "Draft follow-ups, email copy, or internal notes with context from the workspace.",
  },
  {
    icon: EditIcon,
    title: "Contextual search",
    desc: "Search across companies, leads, tasks, and notes in plain English.",
  },
];

const chatBubbles = [
  {
    type: "user" as const,
    text: "What's my Q3 revenue forecast based on current pipeline?",
  },
  {
    type: "ai" as const,
    text: "Based on your pipeline velocity and historical close rates, projected Q3 revenue is ₹42.8 lakhs — an 18% increase over Q2.",
    chart: true,
  },
  {
    type: "user" as const,
    text: "Which deals are at risk?",
  },
  {
    type: "ai" as const,
    text: "3 deals totaling ₹18.5 lakhs haven't had activity in 14+ days. Would you like me to draft follow-up emails?",
    chart: false,
  },
];

const chatContainerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.18 },
  },
};

const chatBubbleVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export default function AISection() {
  return (
    <section className="px-4 py-35 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl items-center gap-16 md:grid-cols-2 md:gap-20">
        {/* Left — header + context */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55 }}
          className="flex flex-col gap-5"
        >
          <p className="text-xs font-normal uppercase tracking-widest text-text-tertiary">
            Artificial Intelligence
          </p>
          <h2 className="font-serif text-[clamp(2rem,4vw,2.75rem)] font-normal leading-[1.15] tracking-[-0.01em] text-text-primary">
            An assistant that knows your workspace
          </h2>
          <p className="max-w-115 text-lg font-normal leading-[1.55] text-text-secondary sm:text-[19px]">
            Ask questions in plain English. Get context-aware drafts and workspace search instantly — without interrupting your flow.
          </p>

          <div className="mt-6 flex flex-col gap-5">
            {contextItems.map((item) => (
              <div key={item.title} className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-orbit-primary-muted bg-orbit-primary-muted">
                  <item.icon />
                </div>
                <div>
                  <div className="text-[15px] font-medium text-text-primary">{item.title}</div>
                  <div className="mt-1 text-sm leading-normal text-text-secondary">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right — chat UI */}
        <motion.div
          variants={chatContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="flex flex-col gap-4 rounded border border-border-default bg-bg-secondary p-8"
        >
          {chatBubbles.map((bubble, i) => (
            <motion.div
              key={i}
              variants={chatBubbleVariants}
              className={`flex max-w-[88%] flex-col gap-3.5 rounded px-4.5 py-3.5 text-sm leading-[1.55] ${
                bubble.type === "user"
                  ? "self-end bg-orbit-primary font-medium text-[#0b0b0b]"
                  : "self-start border border-border-default bg-bg-primary text-text-secondary"
              }`}
            >
              <p>
                {bubble.type === "ai" ? (
                  <span dangerouslySetInnerHTML={{ __html: formatAiText(bubble.text) }} />
                ) : (
                  bubble.text
                )}
              </p>

              {bubble.chart && (
                <div>
                  <div className="flex h-14 items-end gap-2">
                    {[45, 60, 55, 85].map((h, idx) => (
                      <div
                        key={idx}
                        className={`w-7 rounded-t ${idx === 3 ? "bg-orbit-primary" : "bg-bg-tertiary"}`}
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    {["Q1", "Q2", "Q3", "Q4"].map((label) => (
                      <div key={label} className="w-7 text-center font-mono text-[10px] text-text-tertiary">
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function formatAiText(text: string) {
  return text
    .replace("₹42.8 lakhs", "<strong class=\"text-text-primary font-medium\">₹42.8 lakhs</strong>")
    .replace("18% increase", "<strong class=\"text-text-primary font-medium\">18% increase</strong>")
    .replace("3 deals", "<strong class=\"text-text-primary font-medium\">3 deals</strong>")
    .replace("₹18.5 lakhs", "<strong class=\"text-text-primary font-medium\">₹18.5 lakhs</strong>");
}
