"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { clearBearerToken, syncBearerToken } from "@/lib/api-client";
import { workspacesApi, type WorkspaceMemberRole, type WorkspaceMembershipRow } from "@/lib/workspaces-api";
import { ACTIVE_WORKSPACE_STORAGE_KEY, resolveActiveMembership } from "@/lib/workspace-context";
import SearchDialog from "./SearchDialog";
import AiChatDrawer from "./AiChatDrawer";
import { useWorkspaceEvents } from "@/hooks/useWorkspaceEvents";
import { toast } from "sonner";
import {
  Users,
  LayoutGrid,
  Briefcase,
  IndianRupee,
  CheckSquare,
  Bot,
  Settings,
  LogOut,
  Search,
  ChevronDown,
  MoreHorizontal,
  Menu,
  X,
  BarChart2,
  UserPlus,
  Pencil,
  Plus,
  Check,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { shouldCloseWorkspaceDropdown, toggleWorkspaceDropdown } from "./workspace-dropdown-helpers";

// ── Workspace context ──────────────────────────────────────────────────────
interface WorkspaceContextValue {
  workspaceId: string | null;
  workspaceName: string;
  userRole: WorkspaceMemberRole;
}

export const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspaceId: null,
  workspaceName: "",
  userRole: "MEMBER",
});

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
// ──────────────────────────────────────────────────────────────────────────

interface AppLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
}

const ROLE_LABELS: Record<WorkspaceMemberRole, string> = {
  OWNER: "Owner",
  MEMBER: "Member",
};

const INVITE_ROLE_OPTIONS: Array<{ value: WorkspaceMemberRole; label: string }> = [
  { value: "MEMBER", label: "Member" },
];

export default function AppLayout({ children, pageTitle }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const workspaceMenuRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<WorkspaceMemberRole>("MEMBER");
  const [workspaces, setWorkspaces] = useState<WorkspaceMembershipRow[]>([]);
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchShortcut, setSearchShortcut] = useState("⌘K");
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceMemberRole>("MEMBER");
  const [renameWorkspaceName, setRenameWorkspaceName] = useState("");
  const [activeInviteWorkspaceId, setActiveInviteWorkspaceId] = useState<string | null>(null);
  const [isWorkspaceSaving, setIsWorkspaceSaving] = useState(false);
  const [isInviteSending, setIsInviteSending] = useState(false);

  useWorkspaceEvents(workspaceId);

  const refreshSession = useCallback(async (redirectOnMissing = true) => {
    try {
      const session = await authClient.getSession();
      if (!session || !session.data?.user) {
        clearBearerToken();
        if (redirectOnMissing) {
          router.push("/signin");
        }
        return null;
      }

      await syncBearerToken();
      setCurrentUser(session.data.user);
      return session.data.user;
    } catch (err) {
      console.error("Error loading session:", err);
      return null;
    }
  }, [router]);

  const loadWorkspaces = useCallback(async (preferredWorkspaceId?: string | null) => {
    const memberships = await workspacesApi.listMine();
    const nextWorkspaces = memberships ?? [];
    setWorkspaces(nextWorkspaces);

    if (nextWorkspaces.length === 0) {
      setWorkspaceId(null);
      setWorkspaceName("");
      setUserRole("MEMBER");
      return;
    }

    const savedWorkspaceId = window.localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
    const currentMembership = resolveActiveMembership(nextWorkspaces, preferredWorkspaceId, savedWorkspaceId);

    if (!currentMembership) {
      return;
    }

    setWorkspaceId(currentMembership.workspaceId);
    setWorkspaceName(currentMembership.workspace.name);
    setUserRole(currentMembership.role);
    window.localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, currentMembership.workspaceId);
  }, []);

  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} | Orbit CRM` : "Orbit CRM";
  }, [pageTitle]);

  useEffect(() => {
    async function loadSessionAndWorkspace() {
      const user = await refreshSession(true);
      if (!user) {
        return;
      }

      await loadWorkspaces();
    }

    loadSessionAndWorkspace();
  }, [refreshSession, loadWorkspaces]);

  useEffect(() => {
    const handleProfileUpdated = () => {
      void refreshSession(false);
    };

    window.addEventListener("profile-updated", handleProfileUpdated);
    return () => window.removeEventListener("profile-updated", handleProfileUpdated);
  }, [refreshSession]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileDropdownOpen(false);
    setIsWorkspaceDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
        setIsProfileDropdownOpen(false);
        setIsSearchOpen(false);
        setIsAiDrawerOpen(false);
        setIsWorkspaceDropdownOpen(false);
        setIsInviteModalOpen(false);
        setIsRenameModalOpen(false);
      }
    };

    if (isMobileMenuOpen || isProfileDropdownOpen || isSearchOpen || isAiDrawerOpen || isWorkspaceDropdownOpen || isInviteModalOpen || isRenameModalOpen) {
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }

    return undefined;
  }, [isMobileMenuOpen, isProfileDropdownOpen, isSearchOpen, isAiDrawerOpen, isWorkspaceDropdownOpen, isInviteModalOpen, isRenameModalOpen]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isTouchDevice =
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      if (isTouchDevice) {
        setSearchShortcut("");
        return;
      }

      const isMac =
        navigator.platform.toUpperCase().indexOf("MAC") >= 0 ||
        navigator.userAgent.toUpperCase().indexOf("MAC") >= 0 ||
        navigator.userAgent.toUpperCase().indexOf("IPHONE") >= 0 ||
        navigator.userAgent.toUpperCase().indexOf("IPAD") >= 0;
      setSearchShortcut(isMac ? "⌘K" : "Ctrl+K");
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const anyOpen = isMobileMenuOpen || isAiDrawerOpen || isInviteModalOpen || isRenameModalOpen;
    if (!anyOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen, isAiDrawerOpen, isInviteModalOpen, isRenameModalOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (workspaceMenuRef.current && !workspaceMenuRef.current.contains(target)) {
        setIsWorkspaceDropdownOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setIsProfileDropdownOpen(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleWorkspaceMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWorkspaceDropdownOpen((prev) => !prev);
  };

  const handleSignOut = async () => {
    try {
      try {
        await fetch("/api/auth/token", { method: "DELETE" });
      } catch (err) {
        console.error("Error revoking tokens on server:", err);
      }
      clearBearerToken();
      await authClient.signOut();
      toast.success("Signed out successfully");
      router.push("/signin");
    } catch (err: any) {
      console.error("Error during sign out:", err);
      toast.error(err.message || "Failed to sign out");
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const userInitials = currentUser ? getInitials(currentUser.name) : "—";
  const userName = currentUser ? currentUser.name : "";
  const userEmail = currentUser ? currentUser.email : "";
  const currentWorkspace = useMemo(() => workspaces.find((membership) => membership.workspaceId === workspaceId) ?? null, [workspaces, workspaceId]);
  const isPrivilegedRole = userRole === "OWNER";

  const navigationItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, active: pathname === "/dashboard" },
    { href: "/reports", label: "Reports", icon: BarChart2, active: pathname === "/reports" },
    { href: "/leads", label: "Leads", icon: Users, active: pathname === "/leads" },
    { href: "/companies", label: "Companies", icon: Briefcase, active: pathname === "/companies" },
    { href: "/deals", label: "Deals", icon: IndianRupee, active: pathname === "/deals" },
    { href: "/tasks", label: "Tasks", icon: CheckSquare, active: pathname === "/tasks" },
    { href: "/assigned-tasks", label: "Assigned Tasks", icon: ListChecks, active: pathname === "/assigned-tasks" },
  ];

  const settingsItem = { href: "/settings", label: "Settings", icon: Settings, active: pathname === "/settings" };

  const handleDropdownAction = (actionFn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWorkspaceDropdownOpen(false);
    actionFn();
  };

  const switchWorkspace = (membership: WorkspaceMembershipRow) => {
    setWorkspaceId(membership.workspaceId);
    setWorkspaceName(membership.workspace.name);
    setUserRole(membership.role);
    window.localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, membership.workspaceId);
    window.dispatchEvent(new CustomEvent("workspace-switched", { detail: membership }));
    setIsWorkspaceDropdownOpen(false);
    toast.success(`Switched to ${membership.workspace.name}`);
  };

  const openInviteModal = (membership?: WorkspaceMembershipRow) => {
    setActiveInviteWorkspaceId(membership?.workspaceId ?? workspaceId);
    setInviteEmail("");
    setInviteRole("MEMBER");
    setIsInviteModalOpen(true);
    setIsWorkspaceDropdownOpen(false);
  };

  const openRenameModal = () => {
    setRenameWorkspaceName(workspaceName);
    setIsRenameModalOpen(true);
    setIsWorkspaceDropdownOpen(false);
  };

  const handleRenameWorkspace = async () => {
    if (!workspaceId) return;
    const nextName = renameWorkspaceName.trim();
    if (!nextName) {
      toast.error("Workspace name cannot be empty.");
      return;
    }

    setIsWorkspaceSaving(true);
    try {
      const updated = await workspacesApi.update(workspaceId, nextName);
      setWorkspaceName(updated.name);
      setWorkspaces((current) => current.map((membership) => (
        membership.workspaceId === workspaceId
          ? { ...membership, workspace: { ...membership.workspace, name: updated.name, domain: updated.domain, logo: updated.logo } }
          : membership
      )));
      toast.success("Workspace renamed successfully.");
      setIsRenameModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to rename workspace.");
    } finally {
      setIsWorkspaceSaving(false);
    }
  };

  const handleInviteMember = async () => {
    if (!activeInviteWorkspaceId) return;
    const email = inviteEmail.trim();
    if (!email) {
      toast.error("Please enter an email address.");
      return;
    }

    setIsInviteSending(true);
    try {
      await workspacesApi.inviteMember(activeInviteWorkspaceId, email, inviteRole);
      toast.success(`Invitation sent to ${email}`);
      setIsInviteModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitation.");
    } finally {
      setIsInviteSending(false);
    }
  };

  const renderWorkspaceDropdown = () => {
    if (!isWorkspaceDropdownOpen) return null;

    return (
      <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-70 rounded-2xl border border-border-subtle bg-bg-secondary/95 p-3 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-text-primary">{workspaceName || "Workspace"}</div>
            <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-orbit-primary/15 px-2.5 py-1 text-xs font-semibold text-orbit-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-orbit-primary" />
              {ROLE_LABELS[userRole]}
            </div>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-text-secondary">
            {workspaceId ? "Active" : "No workspace"}
          </div>
        </div>

        <div className="mt-3 max-h-64 space-y-3 overflow-y-auto pr-1">
          <div>
            <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
              Workspaces
            </div>
            <div className="flex flex-col gap-1">
              {workspaces.map((membership) => {
                const active = membership.workspaceId === workspaceId;
                const initials = getInitials(membership.workspace.name);

                return (
                  <button
                    key={membership.id}
                    type="button"
                    onMouseDown={handleDropdownAction(() => switchWorkspace(membership))}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${active ? "bg-orbit-primary/12 text-text-primary ring-1 ring-orbit-primary/20" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"}`}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-semibold ${active ? "bg-orbit-primary text-white" : "bg-white/5 text-text-primary"}`}>
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="truncate font-medium">{membership.workspace.name}</div>
                        {active ? <Check className="h-4 w-4 shrink-0 text-orbit-primary" /> : null}
                      </div>
                      <div className="mt-0.5 text-xs text-text-tertiary">{ROLE_LABELS[membership.role]}</div>
                    </div>
                    <div className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-text-tertiary">
                      {membership.role}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {isPrivilegedRole ? (
            <div>
              <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
                Workspace Options
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  className="h-auto w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-text-primary hover:bg-white/5"
                  onMouseDown={handleDropdownAction(() => openInviteModal(currentWorkspace ?? undefined))}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-text-primary">
                    <UserPlus className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">Invite Team Members</span>
                </Button>

                <Button
                  variant="ghost"
                  className="h-auto w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-text-primary hover:bg-white/5"
                  onMouseDown={handleDropdownAction(openRenameModal)}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-text-primary">
                    <Pencil className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">Rename Workspace</span>
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const renderSidebarContent = (isMobileDrawer = false) => {
    const shouldHideWorkspaceSwitcher = isAiDrawerOpen && !isMobileDrawer;

    return (
      <>
        <div>
          <div className="sidebar-brand">
            <div className="brand-mark">
              <svg width="18" height="18" viewBox="0 0 32 32" fill="none" style={{ color: "#fff" }}>
                <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2.5" />
                <ellipse cx="16" cy="16" rx="14" ry="5" stroke="currentColor" strokeWidth="2" transform="rotate(-30 16 16)" />
                <circle cx="16" cy="16" r="3" fill="currentColor" />
              </svg>
            </div>
            <div className="brand-text">Orbit CRM</div>
            {isMobileDrawer ? (
              <button
                type="button"
                className="mobile-drawer-close"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            ) : null}
          </div>

          {!shouldHideWorkspaceSwitcher ? (
            <div className="relative z-50 pb-3" ref={workspaceMenuRef}>
              <button
                type="button"
                className={`workspace-switcher ${isWorkspaceDropdownOpen ? "workspace-switcher-open" : ""}`}
                onMouseDown={handleWorkspaceMouseDown}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                aria-expanded={isWorkspaceDropdownOpen}
                aria-haspopup="menu"
              >
                <div className="min-w-0 flex-1 text-left">
                  <div className="workspace-name truncate">{workspaceName || "Loading…"}</div>
                  <div className="mt-1 inline-flex rounded-full bg-orbit-primary/15 px-2 py-0.5 text-[11px] font-semibold text-orbit-primary">
                    {ROLE_LABELS[userRole]}
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 text-text-tertiary transition-transform ${isWorkspaceDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {renderWorkspaceDropdown()}
            </div>
          ) : null}

          <nav className="sidebar-nav">
            {navigationItems.map(({ href, label, icon: Icon, active }) => (
              <Link key={label} href={href} className={`nav-item ${active ? "active" : ""}`}>
                <Icon className="h-4.5 w-4.5" />
                {label}
              </Link>
            ))}

            <button
              type="button"
              className="nav-item text-left"
              onClick={() => setIsAiDrawerOpen(true)}
            >
              <Bot className="h-4.5 w-4.5" />
              AI Assistant
            </button>

            <div className="nav-group-sep"></div>

            <Link href={settingsItem.href} className={`nav-item ${settingsItem.active ? "active" : ""}`}>
              <settingsItem.icon className="h-4.5 w-4.5" />
              {settingsItem.label}
            </Link>
          </nav>
        </div>

        {!isMobileDrawer && (
          <div className="sidebar-bottom relative">
            <div className="user-avatar">{userInitials}</div>
            <div className="user-info">
              <div className="user-name">{userName}</div>
              <div className="user-role" title={userEmail}>{ROLE_LABELS[userRole]}</div>
            </div>
            <button
              type="button"
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="text-text-tertiary transition hover:text-text-primary focus:outline-none"
              aria-label="Open profile actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {isProfileDropdownOpen && (
              <div ref={profileMenuRef} className="absolute bottom-12 right-2 z-50 w-48 rounded border border-border-light bg-bg-tertiary p-1 shadow-md">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-error hover:bg-surface-hover"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  return (
    <WorkspaceContext.Provider value={{ workspaceId, workspaceName, userRole }}>
      <div className="app-frame min-h-screen">
        <aside className="sidebar desktop-sidebar">{renderSidebarContent()}</aside>

        <div
          className={`sidebar-backdrop ${isMobileMenuOpen ? "open" : ""}`}
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden={!isMobileMenuOpen}
        />

        <aside
          className={`sidebar sidebar-drawer ${isMobileMenuOpen ? "open" : ""}`}
          aria-hidden={!isMobileMenuOpen}
        >
          {renderSidebarContent(true)}
        </aside>

        <div className="main">
          <header className="mobile-header-bar">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="mobile-menu-trigger"
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open navigation menu"
                aria-expanded={isMobileMenuOpen}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="mobile-header-brand">
                <div className="brand-mark">
                  <svg width="18" height="18" viewBox="0 0 32 32" fill="none" style={{ color: "#fff" }}>
                    <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2.5" />
                    <ellipse cx="16" cy="16" rx="14" ry="5" stroke="currentColor" strokeWidth="2" transform="rotate(-30 16 16)" />
                    <circle cx="16" cy="16" r="3" fill="currentColor" />
                  </svg>
                </div>
                <div className="mobile-header-copy">
                  <span className="brand-text">Orbit CRM</span>
                  <span className="mobile-header-workspace">{workspaceName}</span>
                </div>
              </div>
            </div>

            <div className="relative flex items-center gap-2">
              <button
                type="button"
                className="mobile-menu-trigger"
                onClick={() => setIsAiDrawerOpen(true)}
                aria-label="Open AI assistant"
              >
                <Bot className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="top-avatar focus:outline-none"
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                aria-label="Open profile actions"
              >
                {userInitials}
              </button>
              {isProfileDropdownOpen && (
                <div className="absolute top-10 right-0 z-50 w-48 rounded border border-border-light bg-bg-tertiary p-1 shadow-md">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-error hover:bg-surface-hover"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </header>

          <header className="top-bar">
            <h1 className="page-title">{pageTitle}</h1>
            <div className="top-bar-actions">
              <div className="search-trigger" onClick={() => setIsSearchOpen(true)}>
                <Search className="h-3.5 w-3.5" />
                {searchShortcut}
              </div>
            </div>
          </header>

          {children}
        </div>
      </div>

      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent className="sm:max-w-130">
          <DialogHeader>
            <DialogTitle>Invite team members</DialogTitle>
            <DialogDescription>Send an invitation link to a teammate by email.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="teammate@company.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as WorkspaceMemberRole)}
                className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
              >
                {INVITE_ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setIsInviteModalOpen(false)}>Cancel</Button>
            <Button onClick={handleInviteMember} disabled={isInviteSending}>
              {isInviteSending ? "Sending…" : "Send invitation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRenameModalOpen} onOpenChange={setIsRenameModalOpen}>
        <DialogContent className="sm:max-w-130">
          <DialogHeader>
            <DialogTitle>Rename workspace</DialogTitle>
            <DialogDescription>Update the workspace name used across Orbit CRM.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Workspace name</Label>
            <Input
              id="workspace-name"
              value={renameWorkspaceName}
              onChange={(event) => setRenameWorkspaceName(event.target.value)}
              placeholder="Acme CRM"
            />
          </div>
          <div className="mt-5 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setIsRenameModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRenameWorkspace} disabled={isWorkspaceSaving}>
              {isWorkspaceSaving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SearchDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />
      <AiChatDrawer open={isAiDrawerOpen} onOpenChange={setIsAiDrawerOpen} />
    </WorkspaceContext.Provider>
  );
}

