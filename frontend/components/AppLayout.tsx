"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { workspacesApi } from "@/lib/workspaces-api";
import SearchDialog from "./SearchDialog";
import AiChatDrawer from "./AiChatDrawer";
import { useWorkspaceEvents } from "@/hooks/useWorkspaceEvents";
import { toast } from "sonner";
import {
  Users,
  LayoutGrid,
  Briefcase,
  DollarSign,
  CheckSquare,
  Sparkles,
  Settings,
  LogOut,
  Search,
  ChevronDown,
  MoreHorizontal,
  Menu,
  X,
  BarChart2,
} from "lucide-react";

// ── Workspace context ──────────────────────────────────────────────────────
interface WorkspaceContextValue {
  workspaceId: string | null;
  workspaceName: string;
}

export const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspaceId: null,
  workspaceName: "",
});

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
// ──────────────────────────────────────────────────────────────────────────

interface AppLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
}

export default function AppLayout({ children, pageTitle }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);

  useWorkspaceEvents(workspaceId);

  const refreshSession = useCallback(async (redirectOnMissing = true) => {
    try {
      const session = await authClient.getSession();
      if (!session || !session.data?.user) {
        if (redirectOnMissing) {
          router.push("/signin");
        }
        return null;
      }

      setCurrentUser(session.data.user);
      return session.data.user;
    } catch (err) {
      console.error("Error loading session:", err);
      return null;
    }
  }, [router]);

  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} | Orbit CRM` : "Orbit CRM";
  }, [pageTitle]);

  useEffect(() => {
    async function loadSessionAndWorkspace() {
      const user = await refreshSession(true);
      if (!user) {
        return;
      }

      const workspaces = await workspacesApi.listMine();
      if (workspaces && workspaces.length > 0) {
        setWorkspaceName(workspaces[0].workspace.name);
        setWorkspaceId(workspaces[0].workspace.id);
      }
    }

    loadSessionAndWorkspace();
  }, [refreshSession]);

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
  }, [pathname]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
        setIsProfileDropdownOpen(false);
        setIsSearchOpen(false);
        setIsAiDrawerOpen(false);
      }
    };

    if (isMobileMenuOpen || isProfileDropdownOpen || isSearchOpen || isAiDrawerOpen) {
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }

    return undefined;
  }, [isMobileMenuOpen, isProfileDropdownOpen, isSearchOpen, isAiDrawerOpen]);

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
    const anyOpen = isMobileMenuOpen || isAiDrawerOpen;
    if (!anyOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen, isAiDrawerOpen]);

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      toast.success("Signed out successfully");
      router.push("/signin");
    } catch (err: any) {
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

  const navigationItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, active: pathname === "/dashboard" },
    { href: "/reports", label: "Reports", icon: BarChart2, active: pathname === "/reports" },
    { href: "/contacts", label: "Contacts", icon: Users, active: pathname === "/contacts" },
    { href: "/companies", label: "Companies", icon: Briefcase, active: pathname === "/companies" },
    { href: "/deals", label: "Deals", icon: DollarSign, active: pathname === "/deals" },
    { href: "/tasks", label: "Tasks", icon: CheckSquare, active: pathname === "/tasks" },
  ];

  const settingsItem = { href: "/settings", label: "Settings", icon: Settings, active: pathname === "/settings" };

  const renderSidebarContent = (isMobileDrawer = false) => (
    <>
      <div>
        <div className="sidebar-brand">
          <div className="brand-mark">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#fff" }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              <path d="M2 12h20" />
            </svg>
          </div>
          <div className="brand-text">Orbit</div>
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

        <div className="workspace-switcher">
          <div className="workspace-name">{workspaceName || "Loading…"}</div>
          <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" />
        </div>

        <nav className="sidebar-nav">
          {navigationItems.map(({ href, label, icon: Icon, active }) => (
            <Link key={label} href={href} className={`nav-item ${active ? "active" : ""}`}>
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </Link>
          ))}

          <button
            type="button"
            className="nav-item text-left"
            onClick={() => setIsAiDrawerOpen(true)}
          >
            <Sparkles className="h-[18px] w-[18px]" />
            AI Assistant
          </button>

          <div className="nav-group-sep"></div>

          <Link href={settingsItem.href} className={`nav-item ${settingsItem.active ? "active" : ""}`}>
            <settingsItem.icon className="h-[18px] w-[18px]" />
            {settingsItem.label}
          </Link>
        </nav>
      </div>

      {!isMobileDrawer && (
        <div className="sidebar-bottom relative">
          <div className="user-avatar">{userInitials}</div>
          <div className="user-info">
            <div className="user-name">{userName}</div>
            <div className="user-role" title={userEmail}>Team Member</div>
          </div>
          <button
            type="button"
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            className="text-text-tertiary hover:text-text-primary transition focus:outline-none"
            aria-label="Open profile actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {isProfileDropdownOpen && (
            <div className="absolute bottom-12 right-2 z-50 w-48 rounded border border-border-light bg-bg-tertiary p-1 shadow-md">
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

  return (
    <WorkspaceContext.Provider value={{ workspaceId, workspaceName }}>
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#fff" }}>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    <path d="M2 12h20" />
                  </svg>
                </div>
                <div className="mobile-header-copy">
                  <span className="brand-text">Orbit</span>
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
                <Sparkles className="h-5 w-5" />
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
                ⌘K
              </div>
            </div>
          </header>

          {children}
        </div>
      </div>
      <SearchDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />
      <AiChatDrawer open={isAiDrawerOpen} onOpenChange={setIsAiDrawerOpen} />
    </WorkspaceContext.Provider>
  );
}
