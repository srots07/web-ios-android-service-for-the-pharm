"use client";

import { useState, useEffect, useRef } from "react";
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
  const asideRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus management & keyboard accessibility for mobile drawer
  useEffect(() => {
    if (!mobileOpen) {
      // Restore focus to trigger element when drawer closes
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === "function") {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
      return;
    }

    // Save active element prior to opening drawer
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus close button or first interactive element inside drawer
    const timer = setTimeout(() => {
      if (closeButtonRef.current) {
        closeButtonRef.current.focus();
      } else if (asideRef.current) {
        const firstFocusable = asideRef.current.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onMobileClose?.();
        return;
      }

      // Focus trap cycling inside drawer
      if (e.key === "Tab" && asideRef.current) {
        const focusables = Array.from(
          asideRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetParent !== null || el === closeButtonRef.current);

        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
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
        ref={asideRef}
        className={`app-sidebar ${collapsed ? "collapsed" : "expanded"} ${
          mobileOpen ? "mobile-open" : ""
        } ${className}`}
        role={mobileOpen ? "dialog" : "navigation"}
        aria-modal={mobileOpen ? "true" : undefined}
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
              ref={closeButtonRef}
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
