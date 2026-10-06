"use client";

// FEATURE: Authentication [Frontend] - Sign-Up Page with 6-Digit Email Verification (OTP)
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { setBearerToken } from "@/lib/api-client";

type Step = "form" | "verify";

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email");
  const tokenParam = searchParams.get("token");

  useEffect(() => {
    document.title = "Sign Up | Orbit CRM";
  }, []);

  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/signup/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send verification email.");
      }

      setStep("verify");
      setResendCooldown(60);
      setOtp(["", "", "", "", "", ""]);
      toast.success("Verification code sent to your email!");
    } catch (err: any) {
      console.error("Error sending verification OTP:", err);
      toast.error(err?.message || "Failed to send verification email.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/signup/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to resend code.");
      }

      setResendCooldown(60);
      toast.success("New verification code sent!");
    } catch (err: any) {
      console.error("Error resending verification code:", err);
      toast.error(err?.message || "Failed to resend verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredOtp = otp.join("");
    if (enteredOtp.length !== 6) {
      toast.error("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/signup/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          otp: enteredOtp,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid verification code.");
      }

      // Store tab-isolated Bearer token
      if (data.token) {
        setBearerToken(data.token);
      }

      // Authenticate active session with Better Auth
      await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });

      toast.success("Email verified! Account created successfully.");
      const nextUrl = tokenParam
        ? `/invite/accept?token=${tokenParam}`
        : "/onboarding";
      router.push(nextUrl);
    } catch (err: any) {
      console.error("Error verifying signup OTP:", err);
      toast.error(err?.message || "Verification failed. Please check the code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    try {
      const callbackURL = tokenParam
        ? `${window.location.origin}/invite/accept?token=${tokenParam}`
        : `${window.location.origin}/onboarding`;
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL,
      });
      if (error) {
        toast.error(error.message || "Google signup failed.");
        return;
      }
    } catch (err: any) {
      console.error("Error in Google signup:", err);
      toast.error(err?.message || "Google signup failed.");
    } finally {
      setIsLoading(false);
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
      className="relative z-10 w-full max-w-md rounded-xl border border-border-default bg-bg-secondary p-6 shadow-lg sm:p-8"
    >
      <AnimatePresence mode="wait">
        {step === "form" ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
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

            <form onSubmit={handleSendOtp} className="mt-8 flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="signup-name">Full Name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Priya Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
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
                  autoComplete="email"
                  className="bg-bg-primary border-border-default focus:border-orbit-primary"
                  disabled={isLoading || !!emailParam}
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
                    autoComplete="new-password"
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
                {isLoading ? "Sending code..." : "Continue"}
              </Button>

              {/* OR Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border-default" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-bg-secondary px-2 text-text-secondary">Or continue with</span>
                </div>
              </div>

              {/* Google Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full border border-border-default bg-bg-primary text-text-primary hover:bg-surface-hover transition-colors flex items-center justify-center gap-2 font-medium py-5 cursor-pointer"
                onClick={handleGoogleSignUp}
                disabled={isLoading}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                Continue with Google
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
        ) : (
          <motion.div
            key="verify"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col gap-2 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-border-default bg-surface-default text-orbit-primary">
                <Mail className="h-5 w-5" />
              </div>
              <h1 className="font-serif text-2xl font-normal tracking-tight mt-2">
                Verify your email
              </h1>
              <p className="text-sm text-text-secondary">
                We sent a 6-digit verification code to <span className="font-medium text-text-primary">{email}</span>.
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="mt-8 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label className="text-center text-xs uppercase tracking-wider text-text-secondary">
                  Enter 6-Digit Code
                </Label>
                <div className="grid grid-cols-6 gap-2">
                  {otp.map((digit, index) => (
                    <Input
                      key={index}
                      id={`signup-otp-${index}`}
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(-1);
                        setOtp((curr) => {
                          const next = [...curr];
                          next[index] = val;
                          return next;
                        });
                        if (val && index < 5) {
                          const nextInput = document.getElementById(`signup-otp-${index + 1}`) as HTMLInputElement | null;
                          nextInput?.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !digit && index > 0) {
                          const prevInput = document.getElementById(`signup-otp-${index - 1}`) as HTMLInputElement | null;
                          prevInput?.focus();
                        }
                      }}
                      className="bg-bg-primary border-border-default text-center text-lg font-semibold tracking-widest focus:border-orbit-primary h-12"
                      disabled={isLoading}
                      autoFocus={index === 0}
                    />
                  ))}
                </div>
              </div>

              <Button
                id="signup-verify-btn"
                type="submit"
                className="mt-2 w-full bg-orbit-primary text-white hover:bg-orbit-primary-hover font-medium transition-colors"
                disabled={isLoading}
              >
                {isLoading ? "Verifying..." : "Verify & Create Account"}
              </Button>

              <div className="flex items-center justify-between text-xs text-text-secondary pt-2">
                <button
                  type="button"
                  onClick={() => setStep("form")}
                  className="text-text-secondary hover:text-text-primary transition"
                  disabled={isLoading}
                >
                  Change email
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isLoading}
                  className="flex items-center gap-1.5 text-orbit-primary hover:text-orbit-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
                >
                  <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function SignUpPage() {
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
            id="signup-back-btn"
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
            <p className="mt-4 text-sm text-text-secondary">Loading sign up form...</p>
          </div>
        }>
          <SignUpForm />
        </Suspense>
      </div>
    </main>
  );
}
