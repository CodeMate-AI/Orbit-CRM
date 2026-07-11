"use client";

function TwitterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

const linkColumns = [
  {
    title: "Product",
    links: ["Features", "Pricing", "Integrations", "API", "Changelog"],
  },
  {
    title: "Company",
    links: ["About", "Blog", "Careers", "Contact"],
  },
  {
    title: "Legal",
    links: ["Privacy", "Terms", "Security", "Cookies"],
  },
];

export default function Footer() {
  return (
    <footer className="px-4 pt-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-16 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          {/* Brand column */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
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
            <p className="max-w-[280px] text-sm leading-[1.6] text-text-tertiary">
              The AI-native CRM for startups and small teams who&apos;ve outgrown spreadsheets. Fast, beautiful, and priced for growth.
            </p>
          </div>

          {/* Link columns */}
          {linkColumns.map((col) => (
            <div key={col.title} className="flex flex-col gap-4">
              <div className="mb-1 text-xs uppercase tracking-[0.1em] text-text-tertiary">
                {col.title}
              </div>
              {col.links.map((link) => (
                <a
                  key={link}
                  href="#"
                  className="text-sm text-text-secondary transition-colors hover:text-text-primary"
                >
                  {link}
                </a>
              ))}
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-20 flex flex-col items-center justify-between gap-4 border-t border-border-default py-8 sm:flex-row">
          <p className="text-[13px] text-text-tertiary">
            © 2025 Orbit CRM. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <a href="#" className="transition-colors hover:text-text-primary">
              <TwitterIcon />
            </a>
            <a href="#" className="transition-colors hover:text-text-primary">
              <LinkedInIcon />
            </a>
            <a href="#" className="transition-colors hover:text-text-primary">
              <FacebookIcon />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
