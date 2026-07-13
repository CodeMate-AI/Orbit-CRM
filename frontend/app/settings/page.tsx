"use client";

import { Mail, ShieldCheck, UserRound } from "lucide-react";
import AppLayout from "@/components/AppLayout";

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

export default function SettingsPage() {
  return (
    <AppLayout pageTitle="Settings">
      <div className="p-8 mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="rounded-xl border border-border-subtle bg-surface-default p-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-text-secondary">Settings</p>
            <h2 className="mt-2 text-3xl font-semibold">Workspace control center</h2>
            <p className="mt-2 max-w-2xl text-sm text-text-secondary md:text-base">
              Centralize profile settings, SMTP delivery, and security preferences for the whole CRM workspace.
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <article key={card.title} className="rounded border border-border-subtle bg-bg-secondary p-6">
              <div className="inline-flex rounded bg-orbit-primary-muted p-3 text-orbit-primary">
                <card.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-text-primary">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{card.description}</p>
            </article>
          ))}
        </section>
      </div>
    </AppLayout>
  );
}
