"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  Loader2,
  Mail,
  Plus,
  RefreshCcw,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  KeyRound,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { customFieldsApi, CustomFieldRow, FieldType, EntityType } from "@/lib/custom-fields-api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";
import { settingsApi } from "@/lib/settings-api";
import {
  InvitationRow,
  WorkspaceMemberRole,
  WorkspaceMemberRow,
  WorkspaceMembershipRow,
  workspacesApi,
} from "@/lib/workspaces-api";

const DEFAULT_TIMEZONE = "Asia/Kolkata";
const DEFAULT_LOCALE = "en-IN";

const TIMEZONE_OPTIONS = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
];

const LOCALE_OPTIONS = [
  { value: "en-IN", label: "English (India) - en-IN" },
];

const ROLE_OPTIONS: Array<{ value: WorkspaceMemberRole; label: string }> = [
  { value: "OWNER", label: "Owner" },
  { value: "ADMIN", label: "Admin" },
  { value: "MEMBER", label: "Member" },
  { value: "VIEWER", label: "Viewer" },
];

const PROFILE_TAB = "profile";
const SMTP_TAB = "smtp";
const WORKSPACE_TAB = "workspace";
const CUSTOM_FIELDS_TAB = "custom-fields";

type SettingsTab = typeof PROFILE_TAB | typeof SMTP_TAB | typeof WORKSPACE_TAB | typeof CUSTOM_FIELDS_TAB;

type ProfileFormState = {
  name: string;
  timezone: string;
  locale: string;
};

type SmtpFormState = {
  host: string;
  port: string;
  username: string;
  password: string;
  senderName: string;
  senderEmail: string;
};

type InviteFormState = {
  email: string;
  role: WorkspaceMemberRole;
};

function roleLabel(role: WorkspaceMemberRole) {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

function roleBadgeVariant(role: WorkspaceMemberRole) {
  return role === "OWNER" ? "default" : role === "ADMIN" ? "secondary" : "outline";
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Invalid date";
  }

  return parsed.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SettingsPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [workspaceMembership, setWorkspaceMembership] = useState<WorkspaceMembershipRow | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>(PROFILE_TAB);
  const [loading, setLoading] = useState(true);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [memberMutationId, setMemberMutationId] = useState<string | null>(null);

  // Custom Fields States
  const [customFields, setCustomFields] = useState<CustomFieldRow[]>([]);
  const [activeEntity, setActiveEntity] = useState<EntityType>("PERSON");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<FieldType>("TEXT");
  const [newFieldOptions, setNewFieldOptions] = useState("");
  const [customFieldsLoading, setCustomFieldsLoading] = useState(false);
  const [customFieldsSaving, setCustomFieldsSaving] = useState(false);
  const [inviteMutationId, setInviteMutationId] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    name: "",
    timezone: DEFAULT_TIMEZONE,
    locale: DEFAULT_LOCALE,
  });
  const [smtpForm, setSmtpForm] = useState<SmtpFormState>({
    host: "",
    port: "587",
    username: "",
    password: "",
    senderName: "",
    senderEmail: "",
  });
  const [smtpPasswordExists, setSmtpPasswordExists] = useState(false);
  const [members, setMembers] = useState<WorkspaceMemberRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [inviteForm, setInviteForm] = useState<InviteFormState>({
    email: "",
    role: "MEMBER",
  });

  const workspaceId = workspaceMembership?.workspaceId ?? null;
  const workspaceName = workspaceMembership?.workspace.name ?? "Workspace settings";
  const workspaceRole = workspaceMembership?.role ?? null;
  const canManageWorkspace = workspaceRole === "OWNER" || workspaceRole === "ADMIN";
  const memberCount = members.length;
  const inviteCount = invitations.length;
  const smtpConfigured = smtpPasswordExists || Boolean(smtpForm.password);

  const currentUserId = currentUser?.id ?? null;

  const selectedWorkspaceSummary = useMemo(() => {
    if (!workspaceMembership) {
      return null;
    }

    return [
      workspaceMembership.workspace.name,
      workspaceMembership.workspace.domain ? `@${workspaceMembership.workspace.domain}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }, [workspaceMembership]);

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

        setCurrentUser(sessionUser);
        setProfileForm({
          name: sessionUser.name ?? "",
          timezone: sessionUser.timezone ?? DEFAULT_TIMEZONE,
          locale: sessionUser.locale ?? DEFAULT_LOCALE,
        });

        const workspaces = await workspacesApi.listMine();
        if (!mounted) {
          return;
        }

        if (!workspaces || workspaces.length === 0) {
          setLoading(false);
          return;
        }

        const activeWorkspace = workspaces[0];
        setWorkspaceMembership(activeWorkspace);
        await loadWorkspaceData(activeWorkspace.workspaceId);
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
  }, [router]);

  async function loadWorkspaceData(id: string) {
    setWorkspaceLoading(true);
    try {
      const [smtpConfig, memberRows, invitationRows, fields] = await Promise.all([
        settingsApi.getSmtpConfig(id),
        workspacesApi.listMembers(id),
        workspacesApi.listInvitations(id),
        customFieldsApi.list(id),
      ]);

      setMembers(memberRows ?? []);
      setInvitations(invitationRows ?? []);
      setCustomFields(fields ?? []);

      if (smtpConfig) {
        setSmtpPasswordExists(smtpConfig.passwordExists);
        setSmtpForm({
          host: smtpConfig.host,
          port: String(smtpConfig.port),
          username: smtpConfig.username,
          password: "",
          senderName: smtpConfig.senderName,
          senderEmail: smtpConfig.senderEmail,
        });
      } else {
        setSmtpPasswordExists(false);
        setSmtpForm({
          host: "",
          port: "587",
          username: "",
          password: "",
          senderName: "",
          senderEmail: "",
        });
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load workspace settings.");
    } finally {
      setWorkspaceLoading(false);
    }
  }

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileSaving(true);

    try {
      await settingsApi.updateProfile({
        name: profileForm.name,
        timezone: profileForm.timezone,
        locale: profileForm.locale,
      });
      toast.success("Profile updated successfully.");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  function buildSmtpPayload() {
    const port = Number(smtpForm.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error("Port must be a valid port number between 1 and 65535.");
    }

    return {
      host: smtpForm.host,
      port,
      username: smtpForm.username,
      password: smtpForm.password,
      senderName: smtpForm.senderName,
      senderEmail: smtpForm.senderEmail,
    };
  }

  async function handleSaveSmtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspaceId) return;

    let payload;
    try {
      payload = buildSmtpPayload();
    } catch (error: any) {
      toast.error(error.message || "Invalid SMTP settings.");
      return;
    }

    setSmtpSaving(true);
    try {
      await settingsApi.saveSmtpConfig(workspaceId, payload);
      setSmtpPasswordExists(true);
      setSmtpForm((current) => ({ ...current, password: "" }));
      toast.success("SMTP settings saved successfully.");
    } catch (error: any) {
      toast.error(error.message || "Failed to save SMTP settings.");
    } finally {
      setSmtpSaving(false);
    }
  }

  async function handleTestSmtp() {
    if (!workspaceId) return;

    let payload;
    try {
      payload = buildSmtpPayload();
    } catch (error: any) {
      toast.error(error.message || "Invalid SMTP settings.");
      return;
    }

    setSmtpTesting(true);
    try {
      await settingsApi.testSmtpConfig(workspaceId, {
        ...payload,
        to: currentUser?.email,
      });
      toast.success("SMTP connection verified. Test email sent.");
    } catch (error: any) {
      toast.error(error.message || "SMTP test failed.");
    } finally {
      setSmtpTesting(false);
    }
  }

  async function handleInviteMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspaceId) return;

    setInviteMutationId("invite");
    try {
      const invitation = await workspacesApi.inviteMember(workspaceId, inviteForm.email, inviteForm.role);
      setInvitations((current) => [invitation, ...current]);
      setInviteDialogOpen(false);
      setInviteForm({ email: "", role: "MEMBER" });
      toast.success(`Invitation sent to ${invitation.email}.`);
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitation.");
    } finally {
      setInviteMutationId(null);
    }
  }

  async function handleUpdateMemberRole(memberId: string, role: WorkspaceMemberRole) {
    if (!workspaceId) return;

    setMemberMutationId(memberId);
    try {
      const updated = await workspacesApi.updateMemberRole(workspaceId, memberId, role);
      setMembers((current) => current.map((member) => (member.id === updated.id ? updated : member)));
      toast.success("Member role updated.");
    } catch (error: any) {
      toast.error(error.message || "Failed to update member role.");
    } finally {
      setMemberMutationId(null);
    }
  }

  async function handleKickMember(memberId: string) {
    if (!workspaceId) return;

    setMemberMutationId(memberId);
    try {
      await workspacesApi.kickMember(workspaceId, memberId);
      setMembers((current) => current.filter((member) => member.id !== memberId));
      toast.success("Member removed from the workspace.");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove member.");
    } finally {
      setMemberMutationId(null);
    }
  }

  async function handleRevokeInvitation(inviteId: string) {
    if (!workspaceId) return;

    setInviteMutationId(inviteId);
    try {
      await workspacesApi.revokeInvitation(workspaceId, inviteId);
      setInvitations((current) => current.filter((invite) => invite.id !== inviteId));
      toast.success("Invitation revoked.");
    } catch (error: any) {
      toast.error(error.message || "Failed to revoke invitation.");
    } finally {
      setInviteMutationId(null);
    }
  }

  async function handleCreateCustomField(event: React.FormEvent) {
    event.preventDefault();
    if (!workspaceId) return;
    if (!newFieldLabel.trim()) {
      toast.error("Field label is required.");
      return;
    }

    setCustomFieldsSaving(true);
    try {
      const options = newFieldType === "SELECT" || newFieldType === "MULTI_SELECT"
        ? newFieldOptions.split(",").map(o => o.trim()).filter(Boolean)
        : undefined;

      const created = await customFieldsApi.create(workspaceId, {
        label: newFieldLabel.trim(),
        type: newFieldType,
        entityType: activeEntity,
        options,
      });

      setCustomFields(current => [...current, created]);
      setNewFieldLabel("");
      setNewFieldOptions("");
      toast.success("Custom field created successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to create custom field.");
    } finally {
      setCustomFieldsSaving(false);
    }
  }

  async function handleDeleteCustomField(id: string) {
    if (!workspaceId) return;

    setCustomFieldsLoading(true);
    try {
      await customFieldsApi.delete(workspaceId, id);
      setCustomFields(current => current.filter(field => field.id !== id));
      toast.success("Custom field deleted.");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete custom field.");
    } finally {
      setCustomFieldsLoading(false);
    }
  }

  if (loading) {
    return (
      <AppLayout pageTitle="Settings">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
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

  if (!workspaceMembership) {
    return (
      <AppLayout pageTitle="Settings">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
          <Card>
            <CardHeader>
              <CardTitle>No workspace found</CardTitle>
              <CardDescription>
                You do not currently belong to a workspace. Create or join one to manage settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push("/onboarding")}>Go to onboarding</Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Settings">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <section className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-default shadow-[0_1px_0_rgba(255,255,255,0.03)]">
          <div className="grid gap-6 px-5 py-6 md:grid-cols-[1.3fr_0.7fr] md:px-6 lg:px-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-tertiary px-3 py-1 text-xs font-medium uppercase tracking-[0.28em] text-text-secondary">
                <Building2 className="h-3.5 w-3.5" />
                Settings & workspace administration
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-text-primary md:text-4xl">
                  Manage your profile, email delivery, and workspace access from one place.
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-text-secondary md:text-base">
                  Update your name, timezone, and locale; configure Gmail SMTP for transactional email; and manage
                  members and invitations for {workspaceName}.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
                <Badge variant="secondary">{workspaceRole ? roleLabel(workspaceRole) : "Member"}</Badge>
                <Badge variant={smtpConfigured ? "default" : "outline"}>
                  {smtpConfigured ? "SMTP configured" : "SMTP not configured"}
                </Badge>
                <Badge variant="outline">{memberCount} members</Badge>
                <Badge variant="outline">{inviteCount} pending invites</Badge>
              </div>
            </div>
            <Card className="bg-bg-secondary/80">
              <CardHeader>
                <CardTitle className="text-base">Workspace summary</CardTitle>
                <CardDescription>{selectedWorkspaceSummary ?? workspaceName}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-text-secondary">
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Active members
                  </span>
                  <span className="font-medium text-text-primary">{memberCount}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Pending invites
                  </span>
                  <span className="font-medium text-text-primary">{inviteCount}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Current role
                  </span>
                  <span className="font-medium text-text-primary">{workspaceRole ? roleLabel(workspaceRole) : "Member"}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2">
                    <UserRound className="h-4 w-4" />
                    Signed in as
                  </span>
                  <span className="max-w-[70%] truncate font-medium text-text-primary">{currentUser?.email}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SettingsTab)} className="gap-4">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value={PROFILE_TAB}>Profile</TabsTrigger>
            <TabsTrigger value={SMTP_TAB}>SMTP</TabsTrigger>
            <TabsTrigger value={WORKSPACE_TAB}>Workspace</TabsTrigger>
            <TabsTrigger value={CUSTOM_FIELDS_TAB}>Custom Fields</TabsTrigger>
          </TabsList>

          <TabsContent value={PROFILE_TAB} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Personal profile</CardTitle>
                <CardDescription>
                  Keep your display name, timezone, and locale aligned with how you work.
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
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-timezone">Timezone</Label>
                    <NativeSelect
                      id="profile-timezone"
                      value={profileForm.timezone}
                      onChange={(event) =>
                        setProfileForm((current) => ({ ...current, timezone: event.target.value }))
                      }
                    >
                      {TIMEZONE_OPTIONS.map((option) => (
                        <NativeSelectOption key={option.value} value={option.value}>
                          {option.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-locale">Locale</Label>
                    <NativeSelect
                      id="profile-locale"
                      value={profileForm.locale}
                      onChange={(event) => setProfileForm((current) => ({ ...current, locale: event.target.value }))}
                    >
                      {LOCALE_OPTIONS.map((option) => (
                        <NativeSelectOption key={option.value} value={option.value}>
                          {option.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="md:col-span-2 mt-2 flex flex-col gap-3">
                    <Button type="submit" className="w-full sm:w-auto" disabled={profileSaving}>
                      {profileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Save profile
                    </Button>
                    <p className="text-xs text-text-secondary">
                      These values are stored on your user profile and used across the app.
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value={SMTP_TAB} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Gmail SMTP configuration</CardTitle>
                <CardDescription>
                  Configure the workspace email account that Orbit CRM uses for transactional and workflow email.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSaveSmtp}>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-host">Host</Label>
                    <Input
                      id="smtp-host"
                      value={smtpForm.host}
                      onChange={(event) => setSmtpForm((current) => ({ ...current, host: event.target.value }))}
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-port">Port</Label>
                    <Input
                      id="smtp-port"
                      type="number"
                      min={1}
                      max={65535}
                      value={smtpForm.port}
                      onChange={(event) => setSmtpForm((current) => ({ ...current, port: event.target.value }))}
                      placeholder="587"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-username">Username</Label>
                    <Input
                      id="smtp-username"
                      value={smtpForm.username}
                      onChange={(event) => setSmtpForm((current) => ({ ...current, username: event.target.value }))}
                      placeholder="workspace@gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-password">Password</Label>
                    <Input
                      id="smtp-password"
                      type="password"
                      value={smtpForm.password}
                      onChange={(event) => setSmtpForm((current) => ({ ...current, password: event.target.value }))}
                      placeholder="App password or existing saved password"
                    />
                    <p className="text-xs text-text-secondary">
                      {smtpPasswordExists
                        ? "A password is already stored. Leave blank to keep it unchanged."
                        : "Provide the Gmail app password for the workspace inbox."}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-sender-name">Sender name</Label>
                    <Input
                      id="smtp-sender-name"
                      value={smtpForm.senderName}
                      onChange={(event) =>
                        setSmtpForm((current) => ({ ...current, senderName: event.target.value }))
                      }
                      placeholder="Orbit CRM"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-sender-email">Sender email</Label>
                    <Input
                      id="smtp-sender-email"
                      type="email"
                      value={smtpForm.senderEmail}
                      onChange={(event) =>
                        setSmtpForm((current) => ({ ...current, senderEmail: event.target.value }))
                      }
                      placeholder="noreply@orbitcrm.com"
                    />
                  </div>
                  <div className="md:col-span-2 mt-2 flex flex-col gap-3">
                    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                      <Button type="submit" className="w-full sm:w-auto" disabled={smtpSaving || workspaceLoading}>
                        {smtpSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Save SMTP settings
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleTestSmtp}
                        className="w-full sm:w-auto"
                        disabled={smtpTesting || workspaceLoading}
                      >
                        {smtpTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Test connection
                      </Button>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Test emails are sent to {currentUser?.email || "your account email"}.
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value={WORKSPACE_TAB} className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <Card>
                <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle>Active members</CardTitle>
                    <CardDescription>
                      View current members, adjust their roles, or remove them from this workspace.
                    </CardDescription>
                  </div>
                  <Badge variant={canManageWorkspace ? "default" : "outline"}>
                    {canManageWorkspace ? "Management enabled" : "Read only"}
                  </Badge>
                </CardHeader>
                <CardContent>
                  {workspaceLoading ? (
                    <div className="flex items-center justify-center py-12 text-text-secondary">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading members…
                    </div>
                  ) : members.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border-subtle p-6 text-sm text-text-secondary">
                      No active members were found for this workspace.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {members.map((member) => {
                        const isSelf = member.userId === currentUserId;
                        const isOwner = member.role === "OWNER";
                        const canEditMember = canManageWorkspace && !isOwner;

                        return (
                          <div
                            key={member.id}
                            className="grid gap-4 rounded-xl border border-border-subtle bg-bg-secondary p-4 lg:grid-cols-[1.2fr_0.7fr_auto] lg:items-center"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium text-text-primary">
                                  {member.user.name || member.user.email}
                                </p>
                                <Badge variant={roleBadgeVariant(member.role)}>{roleLabel(member.role)}</Badge>
                                {isSelf ? <Badge variant="outline">You</Badge> : null}
                              </div>
                              <p className="mt-1 text-sm text-text-secondary">{member.user.email}</p>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`member-role-${member.id}`} className="text-xs uppercase tracking-[0.18em] text-text-secondary">
                                Role
                              </Label>
                              <NativeSelect
                                id={`member-role-${member.id}`}
                                value={member.role}
                                disabled={!canEditMember || memberMutationId === member.id}
                                onChange={(event) =>
                                  handleUpdateMemberRole(member.id, event.target.value as WorkspaceMemberRole)
                                }
                              >
                                {ROLE_OPTIONS.map((option) => (
                                  <NativeSelectOption key={option.value} value={option.value}>
                                    {option.label}
                                  </NativeSelectOption>
                                ))}
                              </NativeSelect>
                              <p className="text-xs text-text-secondary">
                                {canEditMember
                                  ? "Roles determine what a member can do inside the workspace."
                                  : "Only workspace owners and admins can change roles."}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!canManageWorkspace || isSelf || isOwner || memberMutationId === member.id}
                                onClick={() => handleKickMember(member.id)}
                              >
                                {memberMutationId === member.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                                Kick
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                    <div>
                      <CardTitle>Pending invitations</CardTitle>
                      <CardDescription>Review outstanding invites and revoke any that are no longer needed.</CardDescription>
                    </div>
                    <Button type="button" onClick={() => setInviteDialogOpen(true)} disabled={!canManageWorkspace}>
                      <Plus className="h-4 w-4" />
                      Invite member
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {workspaceLoading ? (
                      <div className="flex items-center justify-center py-10 text-text-secondary">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading invitations…
                      </div>
                    ) : invitations.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border-subtle p-6 text-sm text-text-secondary">
                        No pending invitations right now.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {invitations.map((invite) => (
                          <div
                            key={invite.id}
                            className="rounded-xl border border-border-subtle bg-bg-secondary p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-medium text-text-primary">{invite.email}</p>
                                  <Badge variant={roleBadgeVariant(invite.role)}>{roleLabel(invite.role)}</Badge>
                                </div>
                                <p className="mt-1 text-sm text-text-secondary">
                                  Expires {formatDateTime(invite.expiresAt)}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!canManageWorkspace || inviteMutationId === invite.id}
                                onClick={() => handleRevokeInvitation(invite.id)}
                              >
                                {inviteMutationId === invite.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                                Revoke
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Workspace access</CardTitle>
                    <CardDescription>Role-based controls and invitation management are gated by workspace privilege.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-text-secondary">
                    <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-bg-secondary p-4">
                      <ShieldCheck className="mt-0.5 h-4 w-4 text-orbit-primary" />
                      <p>
                        Owners and admins can update roles, remove members, create invitations, and revoke pending
                        invites. Viewer members stay read-only.
                      </p>
                    </div>
                    <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-bg-secondary p-4">
                      <RefreshCcw className="mt-0.5 h-4 w-4 text-orbit-primary" />
                      <p>
                        SMTP changes can be verified instantly with a test email to make sure Gmail credentials are
                        valid before sending workflow notifications.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value={CUSTOM_FIELDS_TAB} className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <CardTitle>Field schema settings</CardTitle>
                        <CardDescription>
                          Define custom attributes that team members can fill in for CRM records.
                        </CardDescription>
                      </div>
                      <div className="inline-flex rounded-full border border-border-subtle bg-bg-tertiary p-1">
                        <button
                          type="button"
                          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                            activeEntity === "PERSON" ? "bg-orbit-primary text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
                          }`}
                          onClick={() => setActiveEntity("PERSON")}
                        >
                          Contacts
                        </button>
                        <button
                          type="button"
                          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                            activeEntity === "COMPANY" ? "bg-orbit-primary text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
                          }`}
                          onClick={() => setActiveEntity("COMPANY")}
                        >
                          Companies
                        </button>
                        <button
                          type="button"
                          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                            activeEntity === "OPPORTUNITY" ? "bg-orbit-primary text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
                          }`}
                          onClick={() => setActiveEntity("OPPORTUNITY")}
                        >
                          Deals
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {customFieldsLoading ? (
                      <div className="flex justify-center py-8 text-text-tertiary">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    ) : customFields.filter(f => f.entityType === activeEntity).length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border-subtle p-8 text-center text-sm text-text-secondary">
                        No custom fields configured for this entity yet. Use the panel on the right to add one.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-text-secondary">
                          <thead>
                            <tr className="border-b border-border-subtle text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                              <th className="py-3 px-4">Label</th>
                              <th className="py-3 px-4">Key</th>
                              <th className="py-3 px-4">Type</th>
                              <th className="py-3 px-4">Required</th>
                              <th className="py-3 px-4">Options</th>
                              <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border-subtle">
                            {customFields
                              .filter(f => f.entityType === activeEntity)
                              .map(field => (
                                <tr key={field.id} className="hover:bg-surface-hover transition-colors">
                                  <td className="py-3 px-4 font-medium text-text-primary">{field.label}</td>
                                  <td className="py-3 px-4 font-mono text-xs text-orbit-primary">{field.name}</td>
                                  <td className="py-3 px-4">
                                    <Badge variant="outline" className="text-xs">{field.type}</Badge>
                                  </td>
                                  <td className="py-3 px-4">{field.isRequired ? "Yes" : "No"}</td>
                                  <td className="py-3 px-4 max-w-[200px] truncate">
                                    {field.options && Array.isArray(field.options)
                                      ? field.options.join(", ")
                                      : "—"}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-red-300 hover:bg-red-500/10 hover:text-red-200"
                                      onClick={() => handleDeleteCustomField(field.id)}
                                      disabled={!canManageWorkspace}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Add custom field</CardTitle>
                    <CardDescription>Configure a new field schema for {activeEntity.toLowerCase()} records.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateCustomField} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="field-label">Field Label</Label>
                        <Input
                          id="field-label"
                          placeholder="e.g. Lead Score, Segment"
                          value={newFieldLabel}
                          onChange={(e) => setNewFieldLabel(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="field-type">Type</Label>
                        <NativeSelect
                          id="field-type"
                          value={newFieldType}
                          onChange={(e) => setNewFieldType(e.target.value as FieldType)}
                        >
                          <NativeSelectOption value="TEXT">Text</NativeSelectOption>
                          <NativeSelectOption value="NUMBER">Number</NativeSelectOption>
                          <NativeSelectOption value="CURRENCY">Currency</NativeSelectOption>
                          <NativeSelectOption value="DATE">Date</NativeSelectOption>
                          <NativeSelectOption value="BOOLEAN">Checkbox / Toggle</NativeSelectOption>
                          <NativeSelectOption value="EMAIL">Email</NativeSelectOption>
                          <NativeSelectOption value="PHONE">Phone</NativeSelectOption>
                          <NativeSelectOption value="URL">URL Link</NativeSelectOption>
                          <NativeSelectOption value="SELECT">Single Select Dropdown</NativeSelectOption>
                          <NativeSelectOption value="MULTI_SELECT">Multi Select Dropdown</NativeSelectOption>
                          <NativeSelectOption value="RATING">Rating / Star Scale</NativeSelectOption>
                        </NativeSelect>
                      </div>

                      {(newFieldType === "SELECT" || newFieldType === "MULTI_SELECT") && (
                        <div className="space-y-2">
                          <Label htmlFor="field-options">Dropdown Options</Label>
                          <Input
                            id="field-options"
                            placeholder="Hot, Warm, Cold"
                            value={newFieldOptions}
                            onChange={(e) => setNewFieldOptions(e.target.value)}
                          />
                          <p className="text-xs text-text-tertiary">Separate options with commas.</p>
                        </div>
                      )}

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={!canManageWorkspace || customFieldsSaving}
                      >
                        {customFieldsSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Schema Field
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Role requirement</CardTitle>
                    <CardDescription>Gated schema configurations</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-text-secondary">
                    <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-bg-secondary p-4">
                      <Settings2 className="mt-0.5 h-4 w-4 text-orbit-primary" />
                      <p>
                        Workspace owners and admins can configure fields. Standard members can fill in values on CRM record drawers, but cannot modify the schema types here.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite a workspace member</DialogTitle>
            <DialogDescription>
              Send a fresh invitation by email and assign the role they should receive when they join.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-5" onSubmit={handleInviteMember}>
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteForm.email}
                onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="teammate@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <NativeSelect
                id="invite-role"
                value={inviteForm.role}
                onChange={(event) => setInviteForm((current) => ({ ...current, role: event.target.value as WorkspaceMemberRole }))}
              >
                {ROLE_OPTIONS.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canManageWorkspace || inviteMutationId === "invite"}>
                {inviteMutationId === "invite" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Send invitation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
