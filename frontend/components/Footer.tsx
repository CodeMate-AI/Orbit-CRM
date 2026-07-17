"use client";

export default function Footer() {
  return (
    <footer className="px-4 pt-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-16">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex flex-col items-center gap-4">
              <svg
                width="28"
                height="28"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0"
              >
                <circle cx="16" cy="16" r="14" stroke="#8174f8" strokeWidth="2.5" />
                <ellipse
                  cx="16"
                  cy="16"
                  rx="14"
                  ry="5"
                  stroke="#8174f8"
                  strokeWidth="2"
                  transform="rotate(-30 16 16)"
                />
                <circle cx="16" cy="16" r="3" fill="#8174f8" />
              </svg>
              <span className="font-serif text-[22px] font-normal tracking-[-0.01em] text-text-primary">
                Orbit
              </span>
            </div>
            <p className="max-w-[420px] text-sm leading-[1.6] text-text-tertiary">
              The AI-native CRM for startups and small teams who've outgrown spreadsheets. Fast, beautiful, and priced for growth.
            </p>
          </div>
        </div>

        <div className="mt-20 flex flex-col items-center justify-center gap-4 border-t border-border-default py-8 text-center">
          <p className="text-[13px] text-text-tertiary">
            © {new Date().getFullYear()} Orbit CRM. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
