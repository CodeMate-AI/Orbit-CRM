"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { workspacesApi } from "@/lib/workspaces-api";

interface DiscoveredWorkspace {
  id: string;
  name: string;
  logo: string | null;
  domain: string | null;
  domainAutoJoin: boolean;
  domainRequestJoin: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [discoveredWorkspace, setDiscoveredWorkspace] = useState<DiscoveredWorkspace | null>(null);
  const [showCreationForm, setShowCreationForm] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joinRequestSent, setJoinRequestSent] = useState(false);

  useEffect(() => {
    document.title = "Onboarding | Orbit CRM";
  }, []);

  useEffect(() => {
    async function checkAuthAndDiscovery() {
      try {
        const session = await authClient.getSession();
        if (!session || !session.data?.user) {
          toast.error("Please sign in first.");
          router.push("/signin");
          return;
        }

        setCurrentUser(session.data.user);

        // Check if user already has workspaces
        const myWorkspaces = await workspacesApi.listMine();
        if (myWorkspaces && myWorkspaces.length > 0) {
          router.push("/dashboard");
          return;
        }

        // Fetch domain-based discovery workspace
        const discovery = await workspacesApi.discover();
        if (discovery) {
          setDiscoveredWorkspace(discovery);
        } else {
          setShowCreationForm(true);
        }
      } catch (err: any) {
        console.error(err);
        setShowCreationForm(true);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuthAndDiscovery();
  }, [router]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName) {
      toast.error("Please enter an organization name.");
      return;
    }

    setIsSubmitting(true);
    try {
      await workspacesApi.create(workspaceName);
      toast.success("Workspace created successfully!");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to create workspace.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectJoin = async () => {
    if (!discoveredWorkspace) return;
    setIsSubmitting(true);
    try {
      await workspacesApi.directJoin(discoveredWorkspace.id);
      toast.success(`Joined ${discoveredWorkspace.name} successfully!`);
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to join workspace.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestJoin = async () => {
    if (!discoveredWorkspace) return;
    setIsSubmitting(true);
    try {
      await workspacesApi.requestJoin(discoveredWorkspace.id);
      toast.success("Join request sent successfully! Waiting for admin approval.");
      setJoinRequestSent(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to send join request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary text-text-primary">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-orbit-primary border-t-transparent" />
          <p className="mt-4 text-sm text-text-secondary">Checking for team workspaces...</p>
        </div>
      </div>
    );
  }

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

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md rounded-xl border border-border-default bg-bg-secondary p-8 shadow-lg"
      >
        <div className="flex flex-col gap-2 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-border-default bg-surface-default">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" stroke="#8174f8" strokeWidth="2.5" />
              <ellipse cx="16" cy="16" rx="14" ry="5" stroke="#8174f8" strokeWidth="2" transform="rotate(-30 16 16)" />
              <circle cx="16" cy="16" r="3" fill="#8174f8" />
            </svg>
          </div>
          <h1 className="font-serif text-2xl font-normal mt-2">Welcome to Orbit</h1>
          <p className="text-sm text-text-secondary">Let&apos;s set up your team account.</p>
        </div>

        <AnimatePresence mode="wait">
          {discoveredWorkspace && !showCreationForm ? (
            <motion.div
              key="discovered-flow"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="mt-8 flex flex-col gap-6"
            >
              <div className="rounded-lg border border-border-default bg-bg-primary p-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-orbit-primary">Workspace Detected</p>
                <h3 className="font-serif text-xl font-normal mt-2 text-text-primary">{discoveredWorkspace.name}</h3>
                <p className="text-xs text-text-tertiary mt-1">Matched email domain: @{discoveredWorkspace.domain}</p>
              </div>

              {joinRequestSent ? (
                <div className="rounded-lg bg-orbit-primary-muted/20 border border-orbit-primary/20 p-4 text-center">
                  <p className="text-sm text-orbit-primary font-medium">Access request pending approval</p>
                  <p className="text-xs text-text-secondary mt-1">
                    An email notification was sent to workspace admins. Please wait for them to approve your request.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {discoveredWorkspace.domainAutoJoin ? (
                    <Button
                      id="onboard-join-instantly-btn"
                      onClick={handleDirectJoin}
                      className="w-full bg-orbit-primary text-white hover:bg-orbit-primary-hover font-medium"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Joining..." : "Join Workspace Instantly"}
                    </Button>
                  ) : (
                    <Button
                      id="onboard-request-access-btn"
                      onClick={handleRequestJoin}
                      className="w-full bg-orbit-primary text-white hover:bg-orbit-primary-hover font-medium"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Sending Request..." : "Request Access to Join"}
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    onClick={() => setShowCreationForm(true)}
                    className="text-xs text-text-secondary hover:text-text-primary"
                    disabled={isSubmitting}
                  >
                    No, create a separate organization
                  </Button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.form
              key="creation-flow"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onSubmit={handleCreateWorkspace}
              className="mt-8 flex flex-col gap-5"
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="onboard-org-name">Organization / Workspace Name</Label>
                <Input
                  id="onboard-org-name"
                  type="text"
                  placeholder="Acme Corporation"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="bg-bg-primary border-border-default focus:border-orbit-primary"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="flex flex-col gap-3 mt-2">
                <Button
                  id="onboard-create-submit-btn"
                  type="submit"
                  className="w-full bg-orbit-primary text-white hover:bg-orbit-primary-hover font-medium"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating workspace..." : "Create Workspace"}
                </Button>

                {discoveredWorkspace && (
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => setShowCreationForm(false)}
                    className="text-xs text-text-secondary hover:text-text-primary"
                    disabled={isSubmitting}
                  >
                    Back to detected workspace
                  </Button>
                )}
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}
