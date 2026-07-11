import type { Metadata } from "next";
import Link from "next/link";
import { Mail, ShieldCheck, UserRound } from "lucide-react";

const cards = [
  {
    title: "Profile & workspace",
    description: "Manage display name, locale, timezone, and workspace branding.",
    icon: UserRound,
  },
  {
    title: "SMTP delivery",
    description: "Configure Gmail SMTP credentials for transactional and workflow emails.",
    icon: Mail,
  },
  {
    title: "Security & access",
    description: "Control session policies, invite permissions, and audit visibility.",
    icon: ShieldCheck,
  },
];

export const metadata: Metadata = {
  title: "Workspace Settings | Orbit CRM",
  description:
    "Centralize profile settings, SMTP delivery, and security preferences for the whole CRM workspace.",
};

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-bg-primary px-6 py-12 text-text-primary md:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-default p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-text-secondary">Settings</p>
            <h1 className="mt-2 text-3xl font-semibold">Workspace control center</h1>
            <p className="mt-2 max-w-2xl text-sm text-text-secondary md:text-base">
              Centralize profile settings, SMTP delivery, and security preferences for the whole CRM workspace.
            </p>
          </div>
          <Link
            id="settings-back-btn"
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-border-default px-4 py-2 text-sm text-text-primary transition hover:bg-surface-hover"
          >
            Back to landing
          </Link>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <article key={card.title} className="rounded-2xl border border-border-subtle bg-bg-secondary p-6">
              <div className="inline-flex rounded-lg bg-orbit-primary-muted p-3 text-orbit-primary">
                <card.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-xl font-semibold">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{card.description}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
