"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email");
  const tokenParam = searchParams.get("token");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    
    // If invitation token exists, redirect back to accept page after auth. Else go to onboarding.
    const callbackURL = tokenParam
      ? `${window.location.origin}/invite/accept?token=${tokenParam}`
      : `${window.location.origin}/onboarding`;

    const { data, error } = await authClient.signUp.email({
      email,
      password,
      name,
      callbackURL,
    });

    setIsLoading(false);

    if (error) {
      toast.error(error.message || "Something went wrong. Please try again.");
    } else {
      toast.success("Account created successfully!");
      // Manually push to the same destination in client-side router
      const nextUrl = tokenParam
        ? `/invite/accept?token=${tokenParam}`
        : "/onboarding";
      router.push(nextUrl);
    }
  };

  const signinUrl = tokenParam
    ? `/signin?email=${encodeURIComponent(emailParam || "")}&token=${tokenParam}`
    : "/signin";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative z-10 w-full max-w-md rounded-xl border border-border-default bg-bg-secondary p-8 shadow-lg"
    >
      <div className="flex flex-col gap-2 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-border-default bg-surface-default">
          <svg
            width="20"
            height="20"
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
        </div>
        <h1 className="font-serif text-2xl font-normal tracking-tight mt-2">
          Create an account
        </h1>
        <p className="text-sm text-text-secondary">
          {tokenParam ? "Join your teammates on Orbit CRM." : "Get started with Orbit CRM today."}
        </p>
      </div>

      <form onSubmit={handleSignUp} className="mt-8 flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-name">Full Name</Label>
          <Input
            id="signup-name"
            type="text"
            placeholder="Priya Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-bg-primary border-border-default focus:border-orbit-primary"
            disabled={isLoading}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-email">Email Address</Label>
          <Input
            id="signup-email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-bg-primary border-border-default focus:border-orbit-primary"
            disabled={isLoading || !!emailParam} // Lock the email input if invited
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-password">Password</Label>
          <div className="relative">
            <Input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-bg-primary border-border-default pr-10 focus:border-orbit-primary"
              disabled={isLoading}
              required
            />
            <button
              type="button"
              id="signup-password-toggle"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-text-secondary transition hover:text-text-primary"
              onClick={() => setShowPassword((current) => !current)}
              disabled={isLoading}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button
          id="signup-submit-btn"
          type="submit"
          className="mt-2 w-full bg-orbit-primary text-white hover:bg-orbit-primary-hover font-medium transition-colors"
          disabled={isLoading}
        >
          {isLoading ? "Creating account..." : "Sign up"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link
          id="signup-signin-link"
          href={signinUrl}
          className="font-medium text-orbit-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}

export default function SignUpPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-bg-primary px-4 py-12 text-text-primary">
      {/* Background Radial Glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: "500px",
          height: "400px",
          background: "radial-gradient(ellipse at center, rgba(129, 116, 248, 0.08) 0%, transparent 65%)",
        }}
      />

      <Suspense fallback={
        <div className="relative z-10 w-full max-w-md rounded-xl border border-border-default bg-bg-secondary p-8 text-center shadow-lg">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-orbit-primary border-t-transparent" />
          <p className="mt-4 text-sm text-text-secondary">Loading sign up form...</p>
        </div>
      }>
        <SignUpForm />
      </Suspense>
    </main>
  );
}
