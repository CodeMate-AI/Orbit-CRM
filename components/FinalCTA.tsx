"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function FinalCTA() {
  return (
    <section
      className="px-4 py-[120px] sm:px-6 lg:px-8"
      style={{
        background:
          "linear-gradient(135deg, rgba(129,116,248,0.1) 0%, rgba(129,116,248,0.02) 100%)",
        borderTop: "1px solid rgba(129,116,248,0.15)",
        borderBottom: "1px solid rgba(129,116,248,0.15)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
        className="mx-auto flex max-w-[560px] flex-col items-center gap-6 text-center"
      >
        <h2 className="font-serif text-[clamp(1.75rem,4vw,2.5rem)] font-normal leading-[1.15] tracking-[-0.01em] text-text-primary">
          Ready to get your team
          <br />
          out of spreadsheets?
        </h2>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
          <Button className="bg-orbit-primary font-sans text-sm font-medium text-[#0b0b0b] hover:bg-orbit-primary-hover" asChild>
            <Link href="/signup">Sign up</Link>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
