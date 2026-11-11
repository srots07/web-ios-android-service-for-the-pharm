"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  ShieldCheck,
  ExternalLink,
  X,
} from "lucide-react";
import { sidebarNavGroups, NavItem } from "@/lib/navigation";

interface SidebarProps {
  currentRole?: "admin" | "customer";
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
  className?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({
  currentRole = "admin",
  userName = "Platform Admin",
  userRole = "Administrator",
  onLogout,
  className = "",
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Close mobile drawer on Escape key press
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onMobileClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, onMobileClose]);

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`app-sidebar ${collapsed ? "collapsed" : "expanded"} ${
          mobileOpen ? "mobile-open" : ""
        } ${className}`}
        role="navigation"
        aria-label="Application Sidebar"
      >
        {/* Sidebar Header & Brand */}
        <div className="sidebar-header">
          <Link
            href="/"
            className="sidebar-brand"
            aria-label="PRIME by Activist Home"
            onClick={onMobileClose}
          >
            <div className="prime-logo" style={{ width: 36, height: 40, flexShrink: 0 }}>
              <img
                src="/images/logo/prime-logo.png"
                alt="PRIME"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
            {!collapsed && (
              <div className="sidebar-brand-text">
                <strong>PRIME</strong>
                <small>BY ACTIVIST</small>
              </div>
            )}
          </Link>

          {/* Desktop/Tablet Collapse Toggle */}
          <button
            type="button"
            className="sidebar-collapse-toggle hidden sm:flex"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          {/* Mobile Close Button */}
          {onMobileClose && (
            <button
              type="button"
              className="sidebar-mobile-close sm:hidden"
              onClick={onMobileClose}
              aria-label="Close sidebar navigation"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation Groups */}
        <div className="sidebar-nav-scroll">
          {sidebarNavGroups.map((group) => {
            // Filter out items that require a different role
            const visibleItems = group.items.filter(
              (item) => !item.requiredRole || item.requiredRole === currentRole || item.requiredRole === "all"
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={group.group} className="sidebar-nav-group">
                {!collapsed && <div className="sidebar-group-title">{group.group}</div>}

                <ul className="sidebar-group-list">
                  {visibleItems.map((item: NavItem) => {
                    const isActive =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname?.startsWith(item.href);
                    const Icon = item.icon;

                    if (item.disabled) {
                      return (
                        <li key={item.label}>
                          <span
                            className="sidebar-link disabled"
                            title={collapsed ? `${item.label} (Planned Module)` : undefined}
                            aria-disabled="true"
                          >
                            {Icon && <Icon size={18} className="sidebar-link-icon" />}
                            {!collapsed && (
                              <>
                                <span className="sidebar-link-text">{item.label}</span>
                                <span className="sidebar-status-pill">Soon</span>
                              </>
                            )}
                          </span>
                        </li>
                      );
                    }

                    return (
                      <li key={item.label}>
                        <Link
                          href={item.href}
                          className={`sidebar-link ${isActive ? "active" : ""}`}
                          title={collapsed ? item.label : undefined}
                          aria-current={isActive ? "page" : undefined}
                          onClick={onMobileClose}
                        >
                          {Icon && <Icon size={18} className="sidebar-link-icon" />}
                          {!collapsed && (
                            <>
                              <span className="sidebar-link-text">{item.label}</span>
                              {item.badge && (
                                <span className="sidebar-badge">{item.badge}</span>
                              )}
                            </>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer with User Profile & Back to Store */}
        <div className="sidebar-footer">
          <Link
            href="/"
            className="sidebar-store-link"
            title={collapsed ? "Public Website" : undefined}
            onClick={onMobileClose}
          >
            <ExternalLink size={16} />
            {!collapsed && <span>Public Website</span>}
          </Link>

          <div className="sidebar-profile-card">
            <div className="sidebar-profile-avatar">
              <User size={16} />
            </div>

            {!collapsed && (
              <div className="sidebar-profile-info">
                <strong className="sidebar-profile-name">{userName}</strong>
                <small className="sidebar-profile-role">{userRole}</small>
              </div>
            )}

            {onLogout && !collapsed && (
              <button
                type="button"
                className="sidebar-logout-btn"
                onClick={onLogout}
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
