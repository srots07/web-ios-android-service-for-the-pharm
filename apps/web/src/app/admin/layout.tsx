"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Search,
  LogOut,
  User,
  ShieldCheck,
  ChevronDown,
  Loader2,
  ExternalLink,
  Menu,
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import { useAuthStore } from "@/lib/store/authStore";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const init = useAuthStore((s) => s.init);
  const logout = useAuthStore((s) => s.logout);

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !user) {
        router.replace(`/login?returnUrl=${encodeURIComponent(pathname)}`);
      } else if (user.role !== "admin" && user.role !== "staff") {
        router.replace("/");
      }
    }
  }, [isLoading, isAuthenticated, user, pathname, router]);

  async function handleSignOut() {
    await logout();
    router.replace("/login");
  }

  if (isLoading || !user) {
    return (
      <div className="admin-loading-screen">
        <div style={{ textAlign: "center" }}>
          <Loader2 size={36} className="animate-spin text-primary" style={{ margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: 18, margin: "0 0 6px" }}>Authenticating Administrative Session...</h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            Verifying cryptographic token and role credentials with core security authority.
          </p>
        </div>
      </div>
    );
  }

  // Derive active breadcrumb
  const currentPathSegment = pathname.split("/").pop() || "Dashboard";
  const formattedTitle = currentPathSegment.charAt(0).toUpperCase() + currentPathSegment.slice(1);

  return (
    <div className="admin-shell-container">
      {/* 1. Administrative Sidebar */}
      <Sidebar
        currentRole="admin"
        userName={user?.full_name || "Platform Admin"}
        userRole={user?.role === "admin" ? "Chief Administrator" : "Staff Specialist"}
        onLogout={handleSignOut}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* 2. Main Content Wrapper */}
      <div className="admin-main-wrapper">
        {/* Topbar */}
        <header className="admin-topbar" role="banner">
          <div className="admin-topbar-left">
            <button
              type="button"
              className="admin-mobile-toggle"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              aria-label={mobileSidebarOpen ? "Close sidebar menu" : "Open sidebar menu"}
              aria-expanded={mobileSidebarOpen}
            >
              <Menu size={20} />
            </button>
            <nav aria-label="Breadcrumb" className="admin-breadcrumbs">
              <span className="admin-crumb-parent">Administration</span>
              <span className="admin-crumb-sep">/</span>
              <span className="admin-crumb-active">{formattedTitle}</span>
            </nav>
          </div>

          <div className="admin-topbar-right">
            {/* Quick Search */}
            <div className="admin-quick-search">
              <Search size={15} className="admin-search-icon" aria-hidden="true" />
              <input
                type="search"
                placeholder="Search dossiers, inquiries, users..."
                aria-label="Quick administrative search"
              />
            </div>

            {/* Notification Trigger */}
            <Link
              href="/admin/notifications"
              className="admin-topbar-icon-btn"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="admin-notification-dot" aria-hidden="true"></span>
            </Link>

            {/* Public Store Shortcut */}
            <Link
              href="/"
              target="_blank"
              className="admin-topbar-icon-btn"
              title="View Public Website"
              aria-label="View Public Website"
            >
              <ExternalLink size={17} />
            </Link>

            {/* User Profile & Account Menu */}
            <div className="admin-profile-menu-wrap">
              <button
                type="button"
                className="admin-profile-btn"
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                aria-expanded={accountMenuOpen}
                aria-haspopup="true"
              >
                <div className="admin-profile-avatar">
                  {(user?.full_name || "A").charAt(0).toUpperCase()}
                </div>
                <div className="admin-profile-text">
                  <span className="admin-name">{user?.full_name}</span>
                  <span className="admin-role-badge">
                    <ShieldCheck size={11} />
                    <span>ADMIN</span>
                  </span>
                </div>
                <ChevronDown size={14} className="text-muted" />
              </button>

              {accountMenuOpen && (
                <div className="admin-account-dropdown" role="menu">
                  <div className="admin-dropdown-header">
                    <strong>{user?.full_name}</strong>
                    <small>{user?.email}</small>
                  </div>

                  <Link
                    href="/admin/profile"
                    className="admin-dropdown-item"
                    role="menuitem"
                    onClick={() => setAccountMenuOpen(false)}
                  >
                    <User size={15} />
                    <span>Profile & Account</span>
                  </Link>

                  <Link
                    href="/admin/settings"
                    className="admin-dropdown-item"
                    role="menuitem"
                    onClick={() => setAccountMenuOpen(false)}
                  >
                    <ShieldCheck size={15} />
                    <span>Security & Keys</span>
                  </Link>

                  <div className="admin-dropdown-divider"></div>

                  <button
                    type="button"
                    className="admin-dropdown-item text-danger"
                    role="menuitem"
                    onClick={handleSignOut}
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="admin-page-content" id="admin-main">
          {children}
        </main>
      </div>
    </div>
  );
}

