"use client";

import { motion } from "framer-motion";

const stats = [
  { value: "2,400+", label: "Active teams" },
  { value: "₹480Cr+", label: "Pipeline managed" },
  { value: "4.9/5", label: "Average rating" },
];

export default function SocialProof() {
  return (
    <section className="border-y border-border-default">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-10 px-4 py-11 sm:px-6 md:flex-row md:items-center lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="text-xs uppercase tracking-[0.08em] text-text-tertiary"
        >
          Trusted by fast-moving teams
        </motion.p>

        <div className="flex flex-wrap gap-12 md:gap-14">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: 0.1 * (i + 1) }}
            >
              <div className="font-serif text-3xl font-normal leading-none tracking-[-0.02em] text-text-primary sm:text-[32px]">
                {stat.value}
              </div>
              <div className="mt-2 text-xs tracking-[0.04em] text-text-tertiary">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
