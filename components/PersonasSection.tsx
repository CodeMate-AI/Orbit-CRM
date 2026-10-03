"use client";

import { motion } from "framer-motion";

const personas = [
  {
    initial: "P",
    name: "Priya Krishnan",
    role: "Solo Founder",
    quote:
      "I went from scattered spreadsheets to organized deals in an afternoon. Orbit didn't demand a tutorial - it just made sense.",
    tag: "Self-serve setup",
    tagColor: "green" as const,
  },
  {
    initial: "R",
    name: "Rahul Desai",
    role: "Sales Manager",
    quote:
      "My team evaluated six CRMs. Orbit was the only one they asked to keep. We saw value in five minutes, not five days.",
    tag: "Team adoption",
    tagColor: "pink" as const,
  },
  {
    initial: "A",
    name: "Ananya Reddy",
    role: "Freelancer",
    quote:
      "I manage clients on the move. Orbit's mobile experience means I'm never scrambling through emails to find context.",
    tag: "Mobile-first",
    tagColor: "green" as const,
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export default function PersonasSection() {
  return (
    <section className="border-y border-border-default bg-bg-secondary px-4 py-35 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55 }}
          className="mb-18 flex max-w-140 flex-col gap-4"
        >
          <p className="text-xs font-normal uppercase tracking-widest text-text-tertiary">
            Use Cases
          </p>
          <h2 className="font-serif text-[clamp(2rem,4vw,2.75rem)] font-normal leading-[1.15] tracking-[-0.01em] text-text-primary">
            Built for how you actually work
          </h2>
          <p className="text-lg font-normal leading-[1.55] text-text-secondary sm:text-[19px]">
            Orbit is designed around the real workflows of modern teams - no training manuals required.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {personas.map((p, i) => (
            <motion.div
              key={p.name}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={cardVariants}
              className="flex flex-col gap-5 rounded border border-border-default bg-bg-primary p-10"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border-default bg-bg-tertiary font-serif text-lg text-orbit-primary">
                  {p.initial}
                </div>
                <div>
                  <div className="text-base font-medium text-text-primary">{p.name}</div>
                  <div className="mt-0.5 text-xs tracking-[0.04em] text-text-tertiary">
                    {p.role}
                  </div>
                </div>
              </div>

              <p className="text-[15px] font-normal leading-[1.65] text-text-secondary">
                &ldquo;{p.quote}&rdquo;
              </p>

              <div className="mt-auto pt-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium tracking-[0.06em] ${
                    p.tagColor === "green"
                      ? "border border-[rgba(176,253,190,0.15)] bg-[rgba(176,253,190,0.08)] text-[#b0fdbe]"
                      : "border border-[rgba(243,171,253,0.15)] bg-[rgba(243,171,253,0.08)] text-[#f3abfd]"
                  }`}
                >
                  {p.tag}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
