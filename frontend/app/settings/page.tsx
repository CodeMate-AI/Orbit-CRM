"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2, MailPlus, Shield, Trash2, UserMinus, Users } from "lucide-react";
import { toast } from "sonner";
import AppLayout, { useWorkspace } from "@/components/AppLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { workspacesApi, type InvitationRow, type WorkspaceMemberRow } from "@/lib/workspaces-api";

const DEFAULT_TIMEZONE = "Asia/Kolkata";
const DEFAULT_LOCALE = "en-IN";

type ProfileFormState = {
  name: string;
  email: string;
  timezone: string;
  locale: string;
};

function getInitials(name?: string | null, email?: string) {
  const source = (name || email || "U").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getInvitationUrl(token: string) {
  return `${window.location.origin.replace(/\/$/, "")}/invite/accept?token=${token}`;
}

export default function SettingsPage() {
  const router = useRouter();
  const { workspaceId, workspaceName } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [teamWorkspaceId, setTeamWorkspaceId] = useState<string | null>(workspaceId);
  const [activeMembers, setActiveMembers] = useState<WorkspaceMemberRow[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<InvitationRow[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [memberActionId, setMemberActionId] = useState<string | null>(null);
  const [invitationActionId, setInvitationActionId] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    name: "",
    email: "",
    timezone: DEFAULT_TIMEZONE,
    locale: DEFAULT_LOCALE,
  });

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const session = await authClient.getSession();
        if (!session || !session.data?.user) {
          router.push("/signin");
          return;
        }

        if (!mounted) {
          return;
        }

        const sessionUser = session.data.user as typeof session.data.user & {
          timezone?: string | null;
          locale?: string | null;
        };

        setProfileForm({
          name: sessionUser.name ?? "",
          email: sessionUser.email ?? "",
          timezone: sessionUser.timezone ?? DEFAULT_TIMEZONE,
          locale: sessionUser.locale ?? DEFAULT_LOCALE,
        });

        const memberships = await workspacesApi.listMine();
        const currentMembership = memberships.find((membership) => membership.workspaceId === workspaceId) ?? memberships[0] ?? null;
        const workspaceScopeId = currentMembership?.workspaceId ?? workspaceId ?? null;

        if (!mounted) {
          return;
        }

        setTeamWorkspaceId(workspaceScopeId);
        setIsOwner(currentMembership?.role === "OWNER");

        if (workspaceScopeId) {
          const [members, invitations] = await Promise.all([
            workspacesApi.listMembers(workspaceScopeId),
            workspacesApi.listInvitations(workspaceScopeId),
          ]);

          if (!mounted) {
            return;
          }

          setActiveMembers(members);
          setPendingInvitations(invitations);
        } else {
          setActiveMembers([]);
          setPendingInvitations([]);
        }

        window.dispatchEvent(new CustomEvent("profile-updated"));
      } catch (error: any) {
        toast.error(error.message || "Failed to load settings.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, [router, workspaceId]);

  async function refreshTeamData() {
    const scopeWorkspaceId = teamWorkspaceId ?? workspaceId;
    if (!scopeWorkspaceId) {
      return;
    }

    const [members, invitations] = await Promise.all([
      workspacesApi.listMembers(scopeWorkspaceId),
      workspacesApi.listInvitations(scopeWorkspaceId),
    ]);

    setActiveMembers(members);
    setPendingInvitations(invitations);
  }

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileSaving(true);

    try {
      await authClient.updateUser({ name: profileForm.name });
      const session = await authClient.getSession();
      const sessionUser = session?.data?.user;

      if (sessionUser) {
        const typedSessionUser = sessionUser as typeof sessionUser & {
          timezone?: string | null;
          locale?: string | null;
        };

        setProfileForm((current) => ({
          ...current,
          name: typedSessionUser.name ?? current.name,
          email: typedSessionUser.email ?? current.email,
          timezone: typedSessionUser.timezone ?? DEFAULT_TIMEZONE,
          locale: typedSessionUser.locale ?? DEFAULT_LOCALE,
        }));
      }

      window.dispatchEvent(new CustomEvent("profile-updated"));
      toast.success("Profile updated successfully.");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleInviteSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workspaceId || !isOwner) {
      return;
    }

    const email = inviteEmail.trim();
    if (!email) {
      toast.error("Enter an email address to send an invitation.");
      return;
    }

    setIsInviting(true);
    try {
      await workspacesApi.inviteMember(workspaceId, email, "MEMBER");
      setInviteEmail("");
      await refreshTeamData();
      toast.success(`Invitation sent to ${email}.`);
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitation.");
    } finally {
      setIsInviting(false);
    }
  }

  async function handleCopyInvitationLink(invitation: InvitationRow) {
    try {
      await navigator.clipboard.writeText(getInvitationUrl(invitation.token));
      toast.success("Invitation link copied to clipboard.");
    } catch {
      toast.error("Failed to copy invitation link.");
    }
  }

  async function handleRevokeInvitation(invitation: InvitationRow) {
    if (!workspaceId || !isOwner) {
      return;
    }

    setInvitationActionId(invitation.id);
    try {
      await workspacesApi.revokeInvitation(workspaceId, invitation.id);
      await refreshTeamData();
      toast.success(`Revoked invitation for ${invitation.email}.`);
    } catch (error: any) {
      toast.error(error.message || "Failed to revoke invitation.");
    } finally {
      setInvitationActionId(null);
    }
  }

  async function handleRemoveMember(member: WorkspaceMemberRow) {
    if (!workspaceId || !isOwner) {
      return;
    }

    setMemberActionId(member.id);
    try {
      await workspacesApi.kickMember(workspaceId, member.id);
      await refreshTeamData();
      toast.success(`Removed ${member.user.name ?? member.user.email} from the workspace.`);
    } catch (error: any) {
      toast.error(error.message || "Failed to remove member.");
    } finally {
      setMemberActionId(null);
    }
  }

  if (loading) {
    return (
      <AppLayout pageTitle="Settings">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
          <Card>
            <CardContent className="flex min-h-[420px] items-center justify-center p-6">
              <div className="flex items-center gap-3 text-text-secondary">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading settings…
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Settings">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Personal profile</CardTitle>
            <CardDescription>
              Update your display name. Email, timezone, and locale are shown for reference only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-5 md:grid-cols-2" onSubmit={handleProfileSubmit}>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="profile-name">Name</Label>
                <Input
                  id="profile-name"
                  value={profileForm.name}
                  onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Enter your full name"
                  autoComplete="name"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input id="profile-email" value={profileForm.email} disabled readOnly className="cursor-not-allowed bg-bg-secondary/50" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-timezone">Timezone</Label>
                <Input
                  id="profile-timezone"
                  value={profileForm.timezone === DEFAULT_TIMEZONE ? "Asia/Kolkata (IST)" : profileForm.timezone}
                  disabled
                  readOnly
                  className="cursor-not-allowed bg-bg-secondary/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-locale">Locale</Label>
                <Input
                  id="profile-locale"
                  value={profileForm.locale === DEFAULT_LOCALE ? "English (India) - en-IN" : profileForm.locale}
                  disabled
                  readOnly
                  className="cursor-not-allowed bg-bg-secondary/50"
                />
              </div>

              <div className="md:col-span-2 mt-2 flex flex-col gap-3">
                <Button type="submit" className="w-full sm:w-auto" disabled={profileSaving}>
                  {profileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save profile
                </Button>
                <p className="text-xs text-text-secondary">
                  Changes are applied to your account profile and reflected across the app.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {teamWorkspaceId ? (
          <Card>
            <CardHeader>
              <CardTitle>Team Members & Pending Invitations</CardTitle>
              <CardDescription>
                View the workspace roster and active invitations for {workspaceName || "your workspace"}. Owners can manage members and invitations from this section.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">Active workspace members</h3>
                      <p className="mt-1 text-xs text-text-secondary">People who currently have access to this workspace.</p>
                    </div>
                    <Badge variant="secondary" className="gap-1.5">
                      <Users className="h-3 w-3" />
                      {activeMembers.length} members
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-3">
                    {activeMembers.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border-subtle bg-bg-primary/60 px-4 py-6 text-sm text-text-secondary">
                        No members found for this workspace.
                      </div>
                    ) : (
                      activeMembers.map((member) => {
                        const isOwnerMember = member.role === "OWNER";
                        const displayName = member.user.name || member.user.email;
                        return (
                          <div key={member.id} className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-bg-primary/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="h-10 w-10 shrink-0">
                                <AvatarFallback>{getInitials(member.user.name, member.user.email)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate text-sm font-medium text-text-primary">{displayName}</p>
                                  <Badge variant={isOwnerMember ? "default" : "outline"}>{isOwnerMember ? "Owner" : "Member"}</Badge>
                                </div>
                                <p className="truncate text-xs text-text-secondary">{member.user.email}</p>
                              </div>
                            </div>

                            {isOwner ? (
                              !isOwnerMember ? (
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="w-full sm:w-auto"
                                  onClick={() => void handleRemoveMember(member)}
                                  disabled={memberActionId === member.id}
                                >
                                  {memberActionId === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
                                  Remove member
                                </Button>
                              ) : null
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">Pending invitations</h3>
                      <p className="mt-1 text-xs text-text-secondary">Track active invites, expiration dates, and acceptance links.</p>
                    </div>
                    <Badge variant="secondary" className="gap-1.5">
                      <MailPlus className="h-3 w-3" />
                      {pendingInvitations.length} pending
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-3">
                    {pendingInvitations.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border-subtle bg-bg-primary/60 px-4 py-6 text-sm text-text-secondary">
                        No pending invitations right now.
                      </div>
                    ) : (
                      pendingInvitations.map((invitation) => (
                        <div key={invitation.id} className="rounded-xl border border-border-subtle bg-bg-primary/80 p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-medium text-text-primary">{invitation.email}</p>
                                <Badge variant="outline">Member</Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                                <span className="inline-flex items-center gap-1.5">
                                  <Shield className="h-3.5 w-3.5" />
                                  Expires {formatDateTime(invitation.expiresAt)}
                                </span>
                              </div>
                            </div>

                            {isOwner ? (
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void handleCopyInvitationLink(invitation)}
                                >
                                  <Copy className="h-4 w-4" />
                                  Copy link
                                </Button>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => void handleRevokeInvitation(invitation)}
                                  disabled={invitationActionId === invitation.id}
                                >
                                  {invitationActionId === invitation.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                  Revoke
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {isOwner ? (
                <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orbit-primary/10 text-orbit-primary">
                      <MailPlus className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">Direct invite form</h3>
                      <p className="mt-1 text-xs text-text-secondary">Send a new teammate an invitation link directly from settings.</p>
                    </div>
                  </div>

                  <form className="mt-4 flex flex-col gap-3 lg:flex-row" onSubmit={handleInviteSubmit}>
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="invite-email">Teammate email</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                        placeholder="teammate@company.com"
                        autoComplete="email"
                      />
                    </div>

                    <div className="flex items-end">
                      <Button type="submit" className="w-full lg:w-auto" disabled={isInviting}>
                        {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailPlus className="h-4 w-4" />}
                        Send invitation
                      </Button>
                    </div>
                  </form>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppLayout>
  );
}
