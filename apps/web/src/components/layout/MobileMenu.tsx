"use client";

import { useEffect, useRef, FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { X, Search, ChevronRight, ShoppingBag, ShieldCheck, ArrowRight } from "lucide-react";
import { publicNavItems } from "@/lib/navigation";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  cartCount?: number;
}

export default function MobileMenu({ isOpen, onClose, cartCount = 0 }: MobileMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Prevent background scrolling and manage keyboard accessibility (Escape key & focus trap)
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Auto-focus the close button or search input on drawer open
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchInputRef.current?.value.trim();
    if (!query) return;

    router.push(`/products?search=${encodeURIComponent(query)}`);
    onClose();
  }

  return (
    <div
      className="mobile-drawer-backdrop"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        className="mobile-drawer-content"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation Menu"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="mobile-drawer-header">
          <Link href="/" className="prime-brand" onClick={onClose}>
            <div className="prime-logo" style={{ width: 36, height: 40 }}>
              <img
                src="/images/logo/prime-logo.png"
                alt="PRIME"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
            <div className="activist-logo" style={{ width: 80, height: 38 }}>
              <img
                src="/images/logo/activist-logo.png"
                alt="Activist"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
          </Link>

          <button
            ref={closeButtonRef}
            type="button"
            className="mobile-drawer-close"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <X size={22} />
          </button>
        </div>

        {/* Search Input */}
        <form className="mobile-drawer-search" onSubmit={handleSearchSubmit}>
          <Search size={16} className="text-muted" />
          <input
            ref={searchInputRef}
            type="search"
            placeholder="Search products or formulations..."
            aria-label="Search formulations"
          />
          <button type="submit" aria-label="Submit search">
            <ChevronRight size={16} />
          </button>
        </form>

        {/* Navigation List */}
        <nav className="mobile-drawer-nav" aria-label="Mobile Navigation">
          {publicNavItems.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
            const IconComponent = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`mobile-nav-item ${isActive ? "active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {IconComponent && <IconComponent size={18} className="nav-item-icon" />}
                  <span>{item.label}</span>
                </div>
                {item.badge && <span className="nav-deal-badge">{item.badge}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Action Shortcuts */}
        <div className="mobile-drawer-actions">
          <Link
            href="/cart"
            onClick={onClose}
            className="mobile-action-card"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ShoppingBag size={18} color="var(--primary)" />
              <span style={{ fontWeight: 700, fontSize: 14 }}>Shopping Cart</span>
            </div>
            <span className="cart-badge-pill">{cartCount}</span>
          </Link>

          <Link
            href="/admin"
            onClick={onClose}
            className="mobile-action-card"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ShieldCheck size={18} color="var(--accent-gold)" />
              <span style={{ fontWeight: 700, fontSize: 14 }}>Admin Hub</span>
            </div>
            <ArrowRight size={16} color="var(--text-muted)" />
          </Link>
        </div>

        {/* Footer info in drawer */}
        <div className="mobile-drawer-footer">
          <Link
            href="/login"
            onClick={onClose}
            className="secondary-button"
            style={{ width: "100%", justifyContent: "center" }}
          >
            Partner Login
          </Link>
          <Link
            href="/contact"
            onClick={onClose}
            className="primary-button"
            style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
          >
            Partner With Us
          </Link>
        </div>
      </div>
    </div>
  );
}
