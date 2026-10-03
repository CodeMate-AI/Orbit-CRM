"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { workspacesApi } from "@/lib/workspaces-api";

interface InvitationDetails {
  id: string;
  email: string;
  role: string;
  workspaceId: string;
  workspace: {
    name: string;
    logo: string | null;
  };
  userExists?: boolean;
}

function InviteAcceptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      toast.error("Invitation token is missing.");
      setIsLoading(false);
      return;
    }

    async function verifyInviteAndSession() {
      try {
        // 1. Fetch invitation details
        const details = await workspacesApi.getInvitation(token!);
        setInvitation(details);

        // 2. Fetch current session
        const session = await authClient.getSession();
        const user = session?.data?.user;
        setCurrentUser(user || null);

        if (user) {
          // 3. Securely compare emails (case-insensitive)
          if (user.email.toLowerCase().trim() !== details.email.toLowerCase().trim()) {
            toast.warning("Signing you out: Invite is for a different email address.");
            await authClient.signOut();
            setCurrentUser(null);
            router.push(`/signin?email=${encodeURIComponent(details.email)}&token=${token}`);
          }
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to inspect invitation. It may be expired or invalid.");
      } finally {
        setIsLoading(false);
      }
    }

    verifyInviteAndSession();
  }, [token, router]);

  const handleAccept = async () => {
    if (!token) return;
    setIsAccepting(true);
    try {
      await workspacesApi.acceptInvitation(token);
      toast.success("Welcome! You have successfully joined the workspace.");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to accept invitation.");
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-orbit-primary border-t-transparent" />
        <p className="mt-4 text-sm text-text-secondary">Verifying invitation details...</p>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-red-500">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="font-serif text-xl font-normal mt-4">Invalid Invitation</h1>
        <p className="text-sm text-text-secondary mt-1">This invitation link is invalid or has expired.</p>
        <Button onClick={() => router.push("/")} className="mt-6 bg-surface-default hover:bg-surface-hover text-text-primary">
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full"
    >
      <div className="flex flex-col gap-2 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-border-default bg-surface-default">
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="#8174f8" strokeWidth="2.5" />
            <ellipse cx="16" cy="16" rx="14" ry="5" stroke="#8174f8" strokeWidth="2" transform="rotate(-30 16 16)" />
            <circle cx="16" cy="16" r="3" fill="#8174f8" />
          </svg>
        </div>
        <h1 className="font-serif text-2xl font-normal mt-2">Workspace Invitation</h1>
        <p className="text-sm text-text-secondary">You have been invited to join a CRM team.</p>
      </div>

      <div className="mt-8 flex flex-col gap-6 rounded-lg border border-border-default bg-bg-primary p-6 text-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-orbit-primary">Invitation Details</p>
          <h3 className="font-serif text-2xl font-normal mt-2 text-text-primary">
            {invitation.workspace.name}
          </h3>
          <p className="text-xs text-text-tertiary mt-1">
            Role: <span className="font-medium text-text-secondary uppercase">{invitation.role}</span>
          </p>
        </div>

        <div className="border-t border-border-default pt-4 text-left">
          <p className="text-xs text-text-tertiary">Invited Email address</p>
          <p className="text-sm font-medium text-text-primary truncate mt-0.5">{invitation.email}</p>
        </div>

        {!currentUser && (
          <div className="border-t border-border-default pt-4">
            {invitation.userExists ? (
              <div className="rounded-lg border border-orbit-primary/20 bg-orbit-primary/10 p-3 text-left text-sm text-orbit-primary flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-wider">Sign in required</p>
                <p className="text-xs text-text-secondary">You already have an account. Please sign in to accept the invitation and join the workspace.</p>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-left text-sm text-amber-500 flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-wider">Account required</p>
                <p className="text-xs text-text-secondary">It looks like you don't have an account yet. Please sign up to accept this invitation and join the workspace.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-3">
        {currentUser ? (
          <>
            <Button
              id="invite-accept-btn"
              onClick={handleAccept}
              className="w-full bg-orbit-primary text-white hover:bg-orbit-primary-hover font-medium"
              disabled={isAccepting}
            >
              {isAccepting ? "Joining Workspace..." : "Accept & Enter CRM"}
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                await authClient.signOut();
                setCurrentUser(null);
                router.push("/signin");
              }}
              className="w-full text-xs text-text-secondary hover:text-text-primary"
            >
              Sign in as a different user
            </Button>
          </>
        ) : invitation.userExists ? (
          <>
            <Button
              id="invite-signin-btn"
              onClick={() => router.push(`/signin?email=${encodeURIComponent(invitation.email)}&token=${token}`)}
              className="w-full bg-orbit-primary text-white hover:bg-orbit-primary-hover font-medium"
            >
              Sign In to Accept
            </Button>
            <Button
              id="invite-signup-btn"
              variant="outline"
              onClick={() => router.push(`/signup?email=${encodeURIComponent(invitation.email)}&token=${token}`)}
              className="w-full border-border-default hover:bg-surface-hover text-text-primary font-medium"
            >
              Create an Account
            </Button>
          </>
        ) : (
          <>
            <Button
              id="invite-signup-btn"
              onClick={() => router.push(`/signup?email=${encodeURIComponent(invitation.email)}&token=${token}`)}
              className="w-full bg-orbit-primary text-white hover:bg-orbit-primary-hover font-medium"
            >
              Sign Up to Accept
            </Button>
            <Button
              id="invite-signin-btn"
              variant="ghost"
              onClick={() => router.push(`/signin?email=${encodeURIComponent(invitation.email)}&token=${token}`)}
              className="w-full text-xs text-text-secondary hover:text-text-primary"
            >
              Already have an account? Sign In
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function InviteAcceptPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-bg-primary px-4 py-12 text-text-primary">
      {/* Background Glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: "500px",
          height: "400px",
          background: "radial-gradient(ellipse at center, rgba(129, 116, 248, 0.08) 0%, transparent 65%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md rounded-xl border border-border-default bg-bg-secondary p-8 shadow-lg">
        <Suspense
          fallback={
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-orbit-primary border-t-transparent" />
              <p className="mt-4 text-sm text-text-secondary">Loading page component...</p>
            </div>
          }
        >
          <InviteAcceptContent />
        </Suspense>
      </div>
    </main>
  );
}
