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

type ViewState = "signin" | "forgot_password" | "reset_password";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email");
  const tokenParam = searchParams.get("token");

  useEffect(() => {
    document.title = "Sign In | Orbit CRM";
  }, []);

  const [view, setView] = useState<ViewState>("signin");
  const [email, setEmail] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      setResetEmail(emailParam);
    } else {
      setEmail("");
      setResetEmail("");
    }
    setPassword("");
    setConfirmPassword("");
    setOtp(["", "", "", "", "", ""]);
    setView("signin");
  }, [emailParam]);

  const clearResetForm = () => {
    setOtp(["", "", "", "", "", ""]);
    setPassword("");
    setConfirmPassword("");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Unable to send verification code.");
      }

      setResetEmail(email.trim().toLowerCase());
      clearResetForm();
      setView("reset_password");
      toast.success(data?.message || "Verification code sent to your email.");
    } catch (error: any) {
      toast.error(error?.message || "Unable to send verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredOtp = otp.join("");
    if (enteredOtp.length !== 6) {
      toast.error("Please enter the 6-digit verification code.");
      return;
    }
    if (!password || !confirmPassword) {
      toast.error("Please enter and confirm your new password.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetEmail,
          otp: enteredOtp,
          password,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Unable to reset password.");
      }

      toast.success(data?.message || "Your password has been reset.");
      setView("signin");
      setEmail(resetEmail);
      clearResetForm();
    } catch (error: any) {
      toast.error(error?.message || "Unable to reset password.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password.");
      return;
    }

    setIsLoading(true);

    try {
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

  const forgotPasswordView = (
    <form onSubmit={handleForgotPassword} className="mt-8 flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="forgot-email">Email Address</Label>
        <Input
          id="forgot-email"
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-bg-primary border-border-default focus:border-orbit-primary"
          disabled={isLoading}
          required
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          className="px-0 text-orbit-primary hover:bg-transparent hover:text-orbit-primary-hover"
          onClick={() => setView("signin")}
          disabled={isLoading}
        >
          Back to sign in
        </Button>
        <Button
          type="submit"
          className="bg-orbit-primary text-white hover:bg-orbit-primary-hover font-medium transition-colors"
          disabled={isLoading}
        >
          {isLoading ? "Sending code..." : "Send verification code"}
        </Button>
      </div>
    </form>
  );

  const resetPasswordView = (
    <form onSubmit={handleResetPassword} className="mt-8 flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reset-email">Email Address</Label>
        <Input
          id="reset-email"
          type="email"
          value={resetEmail}
          readOnly
          className="bg-bg-primary border-border-default text-text-secondary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Verification Code</Label>
        <div className="grid grid-cols-6 gap-2">
          {otp.map((digit, index) => (
            <Input
              key={index}
              id={`otp-${index}`}
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(-1);
                setOtp((current) => {
                  const next = [...current];
                  next[index] = value;
                  return next;
                });
                if (value && index < otp.length - 1) {
                  const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement | null;
                  nextInput?.focus();
                }
              }}
              className="bg-bg-primary border-border-default text-center text-lg tracking-widest focus:border-orbit-primary"
              disabled={isLoading}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reset-password">New Password</Label>
        <div className="relative">
          <Input
            id="reset-password"
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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reset-confirm-password">Confirm New Password</Label>
        <div className="relative">
          <Input
            id="reset-confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="bg-bg-primary border-border-default pr-10 focus:border-orbit-primary"
            disabled={isLoading}
            required
          />
          <button
            type="button"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            aria-pressed={showConfirmPassword}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-text-secondary transition hover:text-text-primary"
            onClick={() => setShowConfirmPassword((current) => !current)}
            disabled={isLoading}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          className="px-0 text-orbit-primary hover:bg-transparent hover:text-orbit-primary-hover"
          onClick={() => {
            setView("forgot_password");
            clearResetForm();
          }}
          disabled={isLoading}
        >
          Use another email
        </Button>
        <Button
          type="submit"
          className="bg-orbit-primary text-white hover:bg-orbit-primary-hover font-medium transition-colors"
          disabled={isLoading}
        >
          {isLoading ? "Resetting..." : "Reset password"}
        </Button>
      </div>
    </form>
  );

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
          {view === "signin" ? "Welcome back" : view === "forgot_password" ? "Forgot password" : "Reset password"}
        </h1>
        <p className="text-sm text-text-secondary">
          {view === "signin"
            ? tokenParam
              ? "Sign in with your invited email."
              : "Sign in to access your Orbit CRM workspace."
            : view === "forgot_password"
              ? "Enter your email to receive a 6-digit verification code."
              : "Enter the verification code sent to your email and choose a new password."}
        </p>
      </div>

      {view === "signin" ? (
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
              disabled={isLoading || !!emailParam}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="signin-password">Password</Label>
              <Button
                id="signin-forgot-password-link"
                type="button"
                variant="link"
                className="h-auto p-0 text-xs text-orbit-primary hover:text-orbit-primary-hover"
                onClick={() => {
                  setView("forgot_password");
                  setEmail(emailParam || email);
                }}
                disabled={isLoading}
              >
                Forgot password?
              </Button>
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
      ) : view === "forgot_password" ? (
        forgotPasswordView
      ) : (
        resetPasswordView
      )}

      {view === "signin" && (
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
      )}

      {view === "signin" && (
        <p className="mt-6 text-center text-sm text-text-secondary">
          Don't have an account?{" "}
          <Link
            id="signin-signup-link"
            href={signupUrl}
            className="font-medium text-orbit-primary hover:underline"
          >
            Sign up for free
          </Link>
        </p>
      )}
    </motion.div>
  );
}

export default function SignInPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg-primary px-4 py-12 text-text-primary">
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

        <Suspense
          fallback={
            <div className="w-full rounded-xl border border-border-default bg-bg-secondary p-8 text-center shadow-lg">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-orbit-primary border-t-transparent" />
              <p className="mt-4 text-sm text-text-secondary">Loading sign in form...</p>
            </div>
          }
        >
          <SignInForm />
        </Suspense>
      </div>
    </main>
  );
}
