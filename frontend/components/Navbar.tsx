"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const navLinks = [
  { label: "Product", href: "#product" },
  { label: "Pricing", href: "#pricing" },
];

function OrbitLogo() {
  return (
    <Link id="nav-logo" href="/" className="flex items-center gap-2.5">
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
      <span className="font-sans text-lg font-semibold tracking-tight text-text-primary">
        Orbit
      </span>
    </Link>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const el = document.querySelector(href);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        setOpen(false);
      }
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[72px]">
      <div className="h-full border-b border-border-default bg-bg-primary/70 backdrop-blur-xl">
        <nav className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <OrbitLogo />

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                id={`nav-link-${link.label.toLowerCase()}`}
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Button
              id="nav-signin-btn"
              variant="ghost"
              size="sm"
              className="text-text-secondary hover:text-text-primary"
              asChild
            >
              <Link href="/signin">Sign in</Link>
            </Button>
            <Button
              id="nav-signup-btn"
              size="sm"
              className="bg-orbit-primary text-white hover:bg-orbit-primary-hover"
              asChild
            >
              <Link href="/signup">Start free trial</Link>
            </Button>
          </div>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                </svg>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-[300px] flex-col justify-between border-border-default bg-bg-secondary p-6">
              <div>
                <div className="flex items-center gap-2.5 border-b border-border-default pb-6">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
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
                  <span className="font-sans text-md font-semibold tracking-tight text-text-primary">
                    Orbit
                  </span>
                </div>

                <div className="mt-6 flex flex-col gap-2">
                  {navLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={(e) => handleNavClick(e, link.href)}
                      className="-mx-3 flex items-center rounded-lg px-3 py-2.5 text-base font-medium text-text-secondary transition-all duration-200 hover:bg-surface-default hover:text-text-primary"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-border-default pt-6">
                <Button
                  variant="ghost"
                  className="w-full justify-center text-text-secondary hover:bg-surface-default hover:text-text-primary"
                  asChild
                >
                  <Link href="/signin" onClick={() => setOpen(false)}>
                    Sign in
                  </Link>
                </Button>
                <Button
                  className="w-full bg-orbit-primary text-white hover:bg-orbit-primary-hover"
                  asChild
                >
                  <Link href="/signup" onClick={() => setOpen(false)}>
                    Start free trial
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </nav>
      </div>
    </header>
  );
}
