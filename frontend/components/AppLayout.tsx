"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { authClient } from "@/lib/auth-client";
import { workspacesApi } from "@/lib/workspaces-api";
import { notificationsApi, type NotificationRow } from "@/lib/notifications-api";
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
  GitFork,
  Sparkles,
  Settings,
  LogOut,
  Bell,
  Search,
  ChevronDown,
  MoreHorizontal,
  Menu,
  X,
  AlertCircle,
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
  const [activeFilter, setActiveFilter] = useState("This week");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);

  useWorkspaceEvents(workspaceId);

  useEffect(() => {
    async function loadSessionAndWorkspace() {
      try {
        const session = await authClient.getSession();
        if (!session || !session.data?.user) {
          router.push("/signin");
          return;
        }
        setCurrentUser(session.data.user);

        const workspaces = await workspacesApi.listMine();
        if (workspaces && workspaces.length > 0) {
          setWorkspaceName(workspaces[0].workspace.name);
          setWorkspaceId(workspaces[0].workspace.id);
        }
      } catch (err) {
        console.error("Error loading session:", err);
      }
    }
    loadSessionAndWorkspace();
  }, [router]);

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
        setIsAiDrawerOpen(true);
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

  const refreshNotifications = useCallback(async () => {
    if (!workspaceId) {
      setNotifications([]);
      setNotificationUnreadCount(0);
      return;
    }

    setIsNotificationsLoading(true);
    try {
      const [items, unreadCount] = await Promise.all([
        notificationsApi.list(workspaceId),
        notificationsApi.unreadCount(workspaceId),
      ]);
      setNotifications(items);
      setNotificationUnreadCount(unreadCount);
    } catch (error) {
      console.error("Error loading notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setIsNotificationsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    if (!workspaceId) return;

    const handleWorkspaceEvent = () => {
      void refreshNotifications();
    };

    window.addEventListener("crm:update", handleWorkspaceEvent);
    return () => window.removeEventListener("crm:update", handleWorkspaceEvent);
  }, [refreshNotifications, workspaceId]);

  useEffect(() => {
    if (!isNotificationsOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-notifications-panel]")) {
        return;
      }
      setIsNotificationsOpen(false);
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [isNotificationsOpen]);

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

  const getNotificationIcon = (type: string) => {
    const normalized = type.toLowerCase();
    if (normalized.includes("task")) return CheckSquare;
    if (normalized.includes("deal") || normalized.includes("opportunity")) return DollarSign;
    if (normalized.includes("company")) return Briefcase;
    if (normalized.includes("contact") || normalized.includes("person")) return Users;
    if (normalized.includes("fail") || normalized.includes("error")) return AlertCircle;
    return Bell;
  };

  const formatNotificationTime = (createdAt: string) => {
    try {
      return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
    } catch {
      return "just now";
    }
  };

  const handleNotificationRead = async (notification: NotificationRow) => {
    if (notification.isRead) {
      setIsNotificationsOpen(false);
      return;
    }

    try {
      await notificationsApi.markRead(notification.id);
      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)),
      );
      setNotificationUnreadCount((current) => Math.max(0, current - 1));
    } catch (error) {
      console.error("Failed to mark notification read:", error);
      toast.error("Failed to mark notification read");
    } finally {
      setIsNotificationsOpen(false);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!workspaceId || notificationUnreadCount === 0) return;

    try {
      await notificationsApi.markAllRead(workspaceId);
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
      setNotificationUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications read:", error);
      toast.error("Failed to mark all notifications read");
    }
  };

  const userInitials = currentUser ? getInitials(currentUser.name) : "—";
  const userName = currentUser ? currentUser.name : "";
  const userEmail = currentUser ? currentUser.email : "";

  const navigationItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, active: pathname === "/dashboard" },
    { href: "/contacts", label: "Contacts", icon: Users, active: pathname === "/contacts" },
    { href: "/companies", label: "Companies", icon: Briefcase, active: pathname === "/companies" },
    { href: "/deals", label: "Deals", icon: DollarSign, active: pathname === "/deals" },
    { href: "/tasks", label: "Tasks", icon: CheckSquare, active: pathname === "/tasks" },
    { href: "/automations", label: "Automations", icon: GitFork, active: pathname.startsWith("/automations") },
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
              <div className="notifications-anchor">
                <button
                  type="button"
                  className="icon-btn notifications-trigger"
                  onClick={() => setIsNotificationsOpen((value) => !value)}
                  aria-label={`Open notifications${notificationUnreadCount ? ` (${notificationUnreadCount} unread)` : ""}`}
                  aria-expanded={isNotificationsOpen}
                >
                  <Bell className="h-4 w-4" />
                  {notificationUnreadCount > 0 && <span className="notification-badge">{notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}</span>}
                </button>
                {isNotificationsOpen && (
                  <div className="notifications-dropdown notifications-dropdown--mobile" data-notifications-panel>
                    <div className="notifications-dropdown__header">
                      <div>
                        <div className="notifications-dropdown__title">Notifications</div>
                        <div className="notifications-dropdown__subtitle">{notificationUnreadCount} unread</div>
                      </div>
                      <button
                        type="button"
                        className="notifications-mark-all"
                        onClick={handleMarkAllNotificationsRead}
                        disabled={notificationUnreadCount === 0 || isNotificationsLoading}
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="notifications-dropdown__body">
                      {isNotificationsLoading ? (
                        <div className="notifications-dropdown__empty">Loading notifications…</div>
                      ) : notifications.length > 0 ? (
                        notifications.map((notification) => {
                          const Icon = getNotificationIcon(notification.type);
                          const content = (
                            <>
                              <div className="notification-row__icon">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="notification-row__content">
                                <div className="notification-row__topline">
                                  <span className="notification-row__title">{notification.title}</span>
                                  <span className="notification-row__time">{formatNotificationTime(notification.createdAt)}</span>
                                </div>
                                <p className="notification-row__message">{notification.message}</p>
                              </div>
                            </>
                          );

                          if (notification.link) {
                            return (
                              <Link
                                key={notification.id}
                                href={notification.link}
                                className={`notification-row ${notification.isRead ? "is-read" : "is-unread"}`}
                                onClick={() => {
                                  void handleNotificationRead(notification);
                                }}
                              >
                                {content}
                              </Link>
                            );
                          }

                          return (
                            <button
                              key={notification.id}
                              type="button"
                              className={`notification-row ${notification.isRead ? "is-read" : "is-unread"}`}
                              onClick={() => {
                                void handleNotificationRead(notification);
                              }}
                            >
                              {content}
                            </button>
                          );
                        })
                      ) : (
                        <div className="notifications-dropdown__empty">No notifications yet.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
              <div className="segmented-control">
                {[
                  "This week",
                  "Month",
                  "Quarter",
                  "Year",
                ].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`segment ${activeFilter === filter ? "active" : ""}`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <div className="notifications-anchor notifications-anchor--desktop">
                <button
                  type="button"
                  className="icon-btn notifications-trigger"
                  onClick={() => setIsNotificationsOpen((value) => !value)}
                  aria-label={`Open notifications${notificationUnreadCount ? ` (${notificationUnreadCount} unread)` : ""}`}
                  aria-expanded={isNotificationsOpen}
                >
                  <Bell className="h-4 w-4" />
                  {notificationUnreadCount > 0 && <span className="notification-badge">{notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}</span>}
                </button>
                {isNotificationsOpen && (
                  <div className="notifications-dropdown notifications-dropdown--desktop" data-notifications-panel>
                    <div className="notifications-dropdown__header">
                      <div>
                        <div className="notifications-dropdown__title">Notifications</div>
                        <div className="notifications-dropdown__subtitle">{notificationUnreadCount} unread</div>
                      </div>
                      <button
                        type="button"
                        className="notifications-mark-all"
                        onClick={handleMarkAllNotificationsRead}
                        disabled={notificationUnreadCount === 0 || isNotificationsLoading}
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="notifications-dropdown__body">
                      {isNotificationsLoading ? (
                        <div className="notifications-dropdown__empty">Loading notifications…</div>
                      ) : notifications.length > 0 ? (
                        notifications.map((notification) => {
                          const Icon = getNotificationIcon(notification.type);
                          const content = (
                            <>
                              <div className="notification-row__icon">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="notification-row__content">
                                <div className="notification-row__topline">
                                  <span className="notification-row__title">{notification.title}</span>
                                  <span className="notification-row__time">{formatNotificationTime(notification.createdAt)}</span>
                                </div>
                                <p className="notification-row__message">{notification.message}</p>
                              </div>
                            </>
                          );

                          if (notification.link) {
                            return (
                              <Link
                                key={notification.id}
                                href={notification.link}
                                className={`notification-row ${notification.isRead ? "is-read" : "is-unread"}`}
                                onClick={() => {
                                  void handleNotificationRead(notification);
                                }}
                              >
                                {content}
                              </Link>
                            );
                          }

                          return (
                            <button
                              key={notification.id}
                              type="button"
                              className={`notification-row ${notification.isRead ? "is-read" : "is-unread"}`}
                              onClick={() => {
                                void handleNotificationRead(notification);
                              }}
                            >
                              {content}
                            </button>
                          );
                        })
                      ) : (
                        <div className="notifications-dropdown__empty">No notifications yet.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
