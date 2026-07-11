"use client";

import { motion } from "framer-motion";

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8174f8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8174f8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8174f8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8174f8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

const cards = [
  {
    icon: LockIcon,
    title: "Multi-tenant isolation",
    desc: "Every workspace is fully isolated with dedicated data boundaries, encrypted at rest and in transit.",
  },
  {
    icon: UsersIcon,
    title: "Role-based access",
    desc: "Granular permissions ensure team members see only what they need. Admin, manager, and user roles out of the box.",
  },
  {
    icon: FileTextIcon,
    title: "Audit logs",
    desc: "Track every change, login, and export with immutable audit trails. Compliance-ready reporting when you need it.",
  },
  {
    icon: RefreshIcon,
    title: "Automated backups",
    desc: "Point-in-time recovery with automated daily backups and cross-region redundancy for peace of mind.",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export default function SecuritySection() {
  return (
    <section className="border-y border-border-default bg-bg-secondary px-4 py-[140px] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55 }}
          className="mb-[72px] flex max-w-[560px] flex-col gap-4"
        >
          <p className="text-xs font-normal uppercase tracking-[0.1em] text-text-tertiary">
            Security & Reliability
          </p>
          <h2 className="font-serif text-[clamp(2rem,4vw,2.75rem)] font-normal leading-[1.15] tracking-[-0.01em] text-text-primary">
            Enterprise-grade trust
          </h2>
          <p className="text-lg font-normal leading-[1.55] text-text-secondary sm:text-[19px]">
            Built for teams that take data protection seriously. Your information is isolated, encrypted, and always under your control.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={cardVariants}
              className="flex flex-col gap-4 rounded border border-border-default bg-bg-primary p-8"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded border border-orbit-primary-muted bg-orbit-primary-muted">
                <card.icon />
              </div>
              <div className="text-[15px] font-medium text-text-primary">{card.title}</div>
              <p className="text-sm leading-[1.55] text-text-secondary">{card.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
