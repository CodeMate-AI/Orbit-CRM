"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#32d583" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const plans = [
  {
    name: "Starter",
    desc: "For individuals and early-stage teams getting organized.",
    price: "1,999",
    period: "/month",
    featured: false,
    features: [
      "Up to 3 users",
      "1,000 contacts",
      "Core CRM features",
      "Email integration",
      "Basic reporting",
    ],
    cta: "Start free trial",
    ctaVariant: "outline" as const,
  },
  {
    name: "Growth",
    desc: "For growing teams that need more power and intelligence.",
    price: "4,999",
    period: "/month",
    featured: true,
    features: [
      "Up to 10 users",
      "10,000 contacts",
      "Everything in Starter",
      "AI Assistant",
      "Workflow automation",
      "Advanced dashboards",
      "Priority support",
    ],
    cta: "Start free trial",
    ctaVariant: "default" as const,
  },
  {
    name: "Enterprise",
    desc: "For larger organizations with advanced security and scale needs.",
    price: "Custom",
    period: "",
    featured: false,
    features: [
      "Unlimited users",
      "Unlimited contacts",
      "Everything in Growth",
      "SSO & SAML",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
    ],
    cta: "Contact sales",
    ctaVariant: "outline" as const,
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

export default function PricingSection() {
  return (
    <section id="pricing" className="px-4 py-[140px] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55 }}
          className="mx-auto mb-20 flex max-w-[560px] flex-col items-center gap-4 text-center"
        >
          <p className="text-xs font-normal uppercase tracking-[0.1em] text-text-tertiary">
            Pricing
          </p>
          <h2 className="font-serif text-[clamp(2rem,4vw,2.75rem)] font-normal leading-[1.15] tracking-[-0.01em] text-text-primary">
            Simple, transparent pricing
          </h2>
          <p className="text-lg font-normal leading-[1.55] text-text-secondary sm:text-[19px]">
            Start free. Upgrade when you&apos;re ready. No hidden fees, no surprises.
          </p>
        </motion.div>

        <div className="grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={cardVariants}
              className={`relative flex flex-col gap-7 rounded border p-10 ${
                plan.featured
                  ? "border-[rgba(129,116,248,0.35)] bg-gradient-to-b from-[rgba(129,116,248,0.06)] to-bg-secondary"
                  : "border-border-default bg-bg-secondary"
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orbit-primary px-[18px] py-[5px] text-[11px] font-medium uppercase tracking-[0.06em] text-[#0b0b0b]">
                  Most Popular
                </span>
              )}

              <div className="flex flex-col gap-2">
                <div className="text-xl font-medium text-text-primary">{plan.name}</div>
                <div className="text-[13px] leading-[1.5] text-text-tertiary">{plan.desc}</div>
              </div>

              <div className="flex items-baseline gap-1.5 border-b border-border-default pb-7">
                {plan.price !== "Custom" && (
                  <span className="text-xl text-text-secondary">₹</span>
                )}
                <span
                  className={`font-mono leading-none text-text-primary ${
                    plan.price === "Custom" ? "text-[28px]" : "text-[40px]"
                  }`}
                >
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-sm text-text-tertiary">{plan.period}</span>
                )}
              </div>

              <ul className="flex flex-col gap-3.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-text-secondary">
                    <CheckIcon />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-2">
                {plan.ctaVariant === "default" ? (
                  <Button className="w-full bg-orbit-primary font-sans text-sm font-medium text-[#0b0b0b] hover:bg-orbit-primary-hover">
                    {plan.cta}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full border-border-default bg-transparent font-sans text-sm font-medium text-text-primary hover:bg-surface-hover hover:text-text-primary"
                  >
                    {plan.cta}
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
