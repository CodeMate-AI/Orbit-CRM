"use client";

// FEATURE: Authentication [Frontend] - Sign-In Page
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { syncBearerToken } from "@/lib/api-client";

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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "/api"}/auth/forgot-password`, {
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "/api"}/auth/reset-password`, {
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
      await syncBearerToken();
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

  const handleGoogleSignIn = async () => {
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
        toast.error(error.message || "Google sign in failed.");
        return;
      }
    } catch (err: any) {
      toast.error(err?.message || "Google sign in failed.");
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
      toast.error(err?.message || "Google signup failed.");
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
      {view === "signin" ? (
        <>
          <div className="flex flex-col gap-2 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-border-default bg-surface-default">
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
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
              {tokenParam
                ? "Sign in with your invited email."
                : "Sign in to access your Orbit CRM workspace."}
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
              className="w-full bg-orbit-primary text-white hover:bg-orbit-primary-hover font-medium transition-colors"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
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
              onClick={handleGoogleSignIn}
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

            <div className="flex flex-col gap-2 text-center text-sm">
              <button
                type="button"
                className="text-orbit-primary hover:underline"
                onClick={() => setView("forgot_password")}
                disabled={isLoading}
              >
                Forgot your password?
              </button>
              <p className="text-text-secondary">
                Don't have an account?{" "}
                <Link href={signupUrl} className="font-medium text-orbit-primary hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          </form>
        </>
      ) : view === "forgot_password" ? (
        <>
          <div className="flex flex-col gap-2 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-border-default bg-surface-default">
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
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
              Forgot password
            </h1>
            <p className="text-sm text-text-secondary">
              Enter your email to receive a 6-digit verification code.
            </p>
          </div>
          {forgotPasswordView}
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-border-default bg-surface-default">
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
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
              Reset password
            </h1>
            <p className="text-sm text-text-secondary">
              Enter the verification code sent to your email and choose a new password.
            </p>
          </div>
          {resetPasswordView}
        </>
      )}
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
