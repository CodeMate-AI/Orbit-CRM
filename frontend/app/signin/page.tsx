"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

const demoCredentials = {
  owner: {
    label: "Workspace Owner",
    email: "demo@orbitcrm.com",
    password: "DemoPassword123!",
  },
  member: {
    label: "Workspace Member",
    email: "jayh31572@gmail.com",
    password: "DemoPassword123!",
  },
} as const;

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email");
  const tokenParam = searchParams.get("token");

  useEffect(() => {
    document.title = "Sign In | Orbit CRM";
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [demoRole, setDemoRole] = useState<"owner" | "member">("owner");
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const handleCopy = (text: string, type: "email" | "password") => {
    navigator.clipboard.writeText(text);
    if (type === "email") {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
      toast.success("Email copied to clipboard!");
    } else {
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
      toast.success("Password copied to clipboard!");
    }
  };

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    } else {
      setEmail("");
    }
    setPassword("");
  }, [emailParam]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password.");
      return;
    }

    setIsLoading(true);

    try {
      // If invitation token exists, redirect back to accept page after auth. Else go to onboarding.
      const callbackURL = tokenParam
        ? `${window.location.origin}/invite/accept?token=${tokenParam}`
        : `${window.location.origin}/onboarding`;

      const { error } = await authClient.signIn.email({
        email,
        password,
        callbackURL,
      });

      if (error) {
        setPassword("");
        toast.error(error.message || "Invalid email or password.");
        return;
      }

      setEmail("");
      setPassword("");
      toast.success("Signed in successfully!");
      const nextUrl = tokenParam
        ? `/invite/accept?token=${tokenParam}`
        : "/onboarding";
      router.push(nextUrl);
    } catch (err: any) {
      setPassword("");
      toast.error(err?.message || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  const signupUrl = tokenParam
    ? `/signup?email=${encodeURIComponent(emailParam || "")}&token=${tokenParam}`
    : "/signup";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative z-10 w-full max-w-md rounded-xl border border-border-default bg-bg-secondary p-6 shadow-lg sm:p-8"
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
          Welcome back
        </h1>
        <p className="text-sm text-text-secondary">
          {tokenParam ? "Sign in with your invited email." : "Sign in to access your Orbit CRM workspace."}
        </p>
      </div>

      <form onSubmit={handleSignIn} className="mt-8 flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signin-email">Email Address</Label>
          <Input
            id="signin-email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            className="bg-bg-primary border-border-default focus:border-orbit-primary"
            disabled={isLoading || !!emailParam} // Lock the email input if prefilled via invite
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="signin-password">Password</Label>
            <Link
              id="signin-forgot-password-link"
              href="#"
              className="text-xs text-orbit-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="signin-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="bg-bg-primary border-border-default pr-10 focus:border-orbit-primary"
              disabled={isLoading}
              required
            />
            <button
              type="button"
              id="signin-password-toggle"
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
          id="signin-submit-btn"
          type="submit"
          className="mt-2 w-full bg-orbit-primary text-white hover:bg-orbit-primary-hover font-medium transition-colors"
          disabled={isLoading}
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      {/* Demo Credentials Box */}
      <div className="mt-6 rounded-lg border border-border-default bg-bg-primary/50 p-4 text-xs backdrop-blur-sm">
        <div className="flex border-b border-border-default mb-3 gap-2">
          <button
            type="button"
            onClick={() => setDemoRole("owner")}
            className={`flex-1 pb-2 text-center font-medium border-b-2 transition-colors cursor-pointer ${
              demoRole === "owner"
                ? "border-orbit-primary text-orbit-primary font-semibold"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            Workspace Owner
          </button>
          <button
            type="button"
            onClick={() => setDemoRole("member")}
            className={`flex-1 pb-2 text-center font-medium border-b-2 transition-colors cursor-pointer ${
              demoRole === "member"
                ? "border-orbit-primary text-orbit-primary font-semibold"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            Workspace Member
          </button>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-text-primary">
            {demoRole === "owner" ? "Owner Accounts" : "Member Accounts"}
          </span>
          <button
            type="button"
            onClick={() => {
              const activeCredentials = demoCredentials[demoRole];
              setEmail(activeCredentials.email);
              setPassword(activeCredentials.password);
              toast.success(`${demoRole === "owner" ? "Owner" : "Member"} credentials autofilled!`);
            }}
            className="text-orbit-primary hover:text-orbit-primary-hover font-medium underline cursor-pointer"
          >
            Autofill
          </button>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded border border-border-default bg-bg-secondary p-2">
            <span className="font-mono text-text-secondary">
              {demoCredentials[demoRole].email}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-text-secondary hover:text-text-primary"
              onClick={() => handleCopy(demoCredentials[demoRole].email, "email")}
            >
              {copiedEmail ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
          <div className="flex items-center justify-between rounded border border-border-default bg-bg-secondary p-2">
            <span className="font-mono text-text-secondary">{demoCredentials[demoRole].password}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-text-secondary hover:text-text-primary"
              onClick={() => handleCopy(demoCredentials[demoRole].password, "password")}
            >
              {copiedPassword ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Don&apos;t have an account?{" "}
        <Link
          id="signin-signup-link"
          href={signupUrl}
          className="font-medium text-orbit-primary hover:underline"
        >
          Sign up for free
        </Link>
      </p>
    </motion.div>
  );
}

export default function SignInPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg-primary px-4 py-12 text-text-primary">
      {/* Background Radial Glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: "500px",
          height: "400px",
          background: "radial-gradient(ellipse at center, rgba(129, 116, 248, 0.08) 0%, transparent 65%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex justify-start">
          <Link
            id="signin-back-btn"
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-border-default bg-bg-secondary px-4 py-2 text-sm text-text-secondary transition hover:bg-surface-hover hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>

        <Suspense fallback={
          <div className="w-full rounded-xl border border-border-default bg-bg-secondary p-8 text-center shadow-lg">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-orbit-primary border-t-transparent" />
            <p className="mt-4 text-sm text-text-secondary">Loading sign in form...</p>
          </div>
        }>
          <SignInForm />
        </Suspense>
      </div>
    </main>
  );
}
