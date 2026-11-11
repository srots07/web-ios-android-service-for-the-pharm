"use client";

import Link from "next/link";
import { useEffect, useState, FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  ShoppingBag,
  LogOut,
  Menu,
  ChevronRight,
  User,
  ShieldAlert,
} from "lucide-react";
import { publicNavItems } from "@/lib/navigation";
import MobileMenu from "@/components/layout/MobileMenu";
import { useAuthStore } from "@/lib/store/authStore";

type CurrentUser = {
  name?: string;
  email?: string;
  role?: string;
};

export function PublicHeader() {
  const router = useRouter();
  const pathname = usePathname();

  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const user = useAuthStore((s) => s.user);
  const authenticated = useAuthStore((s) => s.isAuthenticated);
  const initAuth = useAuthStore((s) => s.init);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = search.trim();
    if (!value) return;

    router.push(`/products?search=${encodeURIComponent(value)}`);
    setSearch("");
  }

  async function handleLogout() {
    await logout();
    router.refresh();
    router.push("/");
  }

  return (
    <>
      <header className="prime-header prime-navbar" role="banner">
        <div className="prime-header-inner prime-navbar-inner">

          {/* BRAND LOGOS */}
          <Link
            href="/"
            className="prime-brand"
            aria-label="PRIME by Activist - Home"
          >
            <div className="prime-logo">
              <img
                src="/images/logo/prime-logo.png"
                alt="PRIME Healthcare Formulations"
                style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
              />
            </div>

            <div className="activist-logo">
              <img
                src="/images/logo/activist-logo.png"
                alt="Activist Quality Healthcare"
                style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
              />
            </div>
          </Link>

          <div className="prime-header-cluster">
            {/* SEARCH BAR (Desktop) */}
            <form
              className="prime-search"
              role="search"
              onSubmit={handleSearch}
              aria-label="Product Search"
            >
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                placeholder="Search products..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search products"
              />
            </form>

            {/* DESKTOP NAVIGATION */}
            <nav
              className="prime-navigation"
              role="navigation"
              aria-label="Main Navigation"
            >
              {publicNavItems.map((item) => {
                const isActive =
                  item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`prime-nav-link ${isActive ? "selected active" : ""}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span>{item.label}</span>

                    {item.badge && (
                      <span className="nav-deal-badge nav-badge" aria-label={`${item.badge} alert`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* ACTION BUTTONS */}
            <div className="prime-header-actions prime-actions">
              {/* Cart Button */}
              <Link
                href="/cart"
                className="cart-button prime-cart"
                aria-label={`Shopping Cart, ${cartCount} items`}
              >
                <ShoppingBag size={18} aria-hidden="true" />
                <span>Cart</span>
                {cartCount > 0 && (
                  <span className="cart-badge-indicator" aria-hidden="true">
                    {cartCount}
                  </span>
                )}
              </Link>

              {/* Admin Hub / Account Access */}
              <Link
                href="/admin"
                className="admin-hub prime-admin"
                aria-label={`Admin Hub - Logged in as ${user?.full_name || "Dr."}`}
              >
                <span className="admin-avatar" aria-hidden="true">
                  {(user?.full_name || "D").charAt(0).toUpperCase()}
                </span>
                <span className="admin-info admin-label">
                  <small>ADMIN HUB</small>
                  <strong>{user?.full_name || "Dr."}</strong>
                </span>
              </Link>

              {/* Logout button */}
              {authenticated ? (
                <button
                  type="button"
                  className="logout-button prime-logout"
                  onClick={handleLogout}
                  title="Sign out"
                  aria-label="Sign out of account"
                >
                  <LogOut size={18} />
                </button>
              ) : (
                <Link
                  href="/login"
                  className="logout-button prime-logout"
                  title="Sign out"
                  aria-label="Sign out of account"
                >
                  <LogOut size={18} />
                </Link>
              )}
            </div>
          </div>

          {/* MOBILE MENU TOGGLE BUTTON */}
          <button
            type="button"
            className="prime-mobile-toggle"
            onClick={() => setMobileOpen(true)}
            aria-label="Open mobile navigation menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu-drawer"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {/* REUSABLE MOBILE DRAWER */}
      <MobileMenu
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        cartCount={cartCount}
      />
    </>
  );
}

export default PublicHeader;
export { PublicHeader as Header };
