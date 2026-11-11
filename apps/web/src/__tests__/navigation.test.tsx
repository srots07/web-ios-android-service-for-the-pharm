import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Sidebar from "@/components/layout/Sidebar";
import { publicNavItems, sidebarNavGroups } from "@/lib/navigation";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("Navigation and Layout Components", () => {
  it("defines core public navigation items", () => {
    expect(publicNavItems.length).toBeGreaterThanOrEqual(5);
    const labels = publicNavItems.map((item) => item.label);
    expect(labels).toContain("HOME");
    expect(labels).toContain("PRODUCTS");
    expect(labels).toContain("CONTACT US");
  });

  it("defines admin sidebar navigation groups with role restrictions", () => {
    expect(sidebarNavGroups.length).toBeGreaterThan(0);
    const generalGroup = sidebarNavGroups.find((g) => g.group === "GENERAL");
    expect(generalGroup).toBeDefined();
    expect(generalGroup?.items.some((i) => i.href === "/admin")).toBe(true);
  });

  it("renders Sidebar in expanded state with navigation links and user profile", () => {
    render(
      <Sidebar
        currentRole="admin"
        userName="Dr. Admin"
        userRole="Administrator"
      />
    );

    expect(screen.getByText("Dr. Admin")).toBeInTheDocument();
    expect(screen.getByText("Administrator")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("toggles collapse state when collapse button is clicked", () => {
    const { container } = render(<Sidebar currentRole="admin" />);
    const toggleBtn = screen.getByLabelText("Collapse sidebar");
    expect(toggleBtn).toBeInTheDocument();

    const aside = container.querySelector("aside");
    expect(aside).toHaveClass("expanded");

    fireEvent.click(toggleBtn);
    expect(aside).toHaveClass("collapsed");
  });

  it("renders mobile drawer and calls onMobileClose when backdrop is clicked", () => {
    const handleClose = vi.fn();
    const { container } = render(
      <Sidebar
        currentRole="admin"
        mobileOpen={true}
        onMobileClose={handleClose}
      />
    );

    const backdrop = container.querySelector(".sidebar-mobile-backdrop");
    expect(backdrop).toBeInTheDocument();

    if (backdrop) {
      fireEvent.click(backdrop);
      expect(handleClose).toHaveBeenCalledTimes(1);
    }
  });

  it("calls onLogout callback when logout button is clicked", () => {
    const handleLogout = vi.fn();
    render(
      <Sidebar
        currentRole="admin"
        userName="Admin User"
        onLogout={handleLogout}
      />
    );

    const logoutBtn = screen.getByTitle("Sign out");
    fireEvent.click(logoutBtn);
    expect(handleLogout).toHaveBeenCalledTimes(1);
  });
});
