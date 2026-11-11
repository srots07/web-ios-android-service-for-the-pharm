import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Sidebar from "@/components/layout/Sidebar";
import { ConfirmDialog } from "@/components/forms";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/orders",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("Keyboard & Focus Accessibility Automation Suite (Phase W11)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Mobile Navigation Drawer Accessibility", () => {
    it("renders drawer with appropriate ARIA semantics when open", () => {
      render(
        <Sidebar
          currentRole="admin"
          mobileOpen={true}
          onMobileClose={vi.fn()}
        />
      );

      const dialogAside = screen.getByRole("dialog");
      expect(dialogAside).toHaveAttribute("aria-modal", "true");
      expect(dialogAside).toHaveAttribute("aria-label", "Application Sidebar");
    });

    it("places initial focus on close button or first interactive element when opened", async () => {
      const { rerender } = render(
        <div>
          <button id="drawer-trigger">Open Nav</button>
          <Sidebar currentRole="admin" mobileOpen={false} onMobileClose={vi.fn()} />
        </div>
      );

      const triggerBtn = screen.getByText("Open Nav");
      triggerBtn.focus();
      expect(document.activeElement).toBe(triggerBtn);

      // Open mobile drawer
      rerender(
        <div>
          <button id="drawer-trigger">Open Nav</button>
          <Sidebar currentRole="admin" mobileOpen={true} onMobileClose={vi.fn()} />
        </div>
      );

      await waitFor(() => {
        const closeBtn = screen.getByLabelText("Close sidebar navigation");
        expect(document.activeElement).toBe(closeBtn);
      });
    });

    it("dismisses drawer on Escape key and triggers onMobileClose callback", () => {
      const handleClose = vi.fn();
      render(
        <Sidebar
          currentRole="admin"
          mobileOpen={true}
          onMobileClose={handleClose}
        />
      );

      fireEvent.keyDown(window, { key: "Escape" });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("restores focus to trigger element when drawer is closed", async () => {
      const { rerender } = render(
        <div>
          <button id="open-btn">Open Menu</button>
          <Sidebar currentRole="admin" mobileOpen={false} onMobileClose={vi.fn()} />
        </div>
      );

      const openBtn = screen.getByText("Open Menu");
      openBtn.focus();
      expect(document.activeElement).toBe(openBtn);

      // Open
      rerender(
        <div>
          <button id="open-btn">Open Menu</button>
          <Sidebar currentRole="admin" mobileOpen={true} onMobileClose={vi.fn()} />
        </div>
      );

      // Close
      rerender(
        <div>
          <button id="open-btn">Open Menu</button>
          <Sidebar currentRole="admin" mobileOpen={false} onMobileClose={vi.fn()} />
        </div>
      );

      await waitFor(() => {
        expect(document.activeElement).toBe(openBtn);
      });
    });
  });

  describe("2. Modal Dialog Focus Trapping & Accessibility", () => {
    it("renders ConfirmDialog with dialog semantics and linked label attributes", () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Confirm Order Cancellation"
          message="Are you sure you want to cancel procurement order PRM-ORD-101?"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby", "confirm-dialog-title");
      expect(dialog).toHaveAttribute("aria-describedby", "confirm-dialog-desc");
      expect(screen.getByText("Confirm Order Cancellation")).toHaveAttribute("id", "confirm-dialog-title");
    });

    it("places initial focus onto confirm action when dialog opens", async () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Archive Formulation"
          message="Archive selected formulation?"
          confirmLabel="Archive"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      await waitFor(() => {
        const confirmBtn = screen.getByText("Archive");
        expect(document.activeElement).toBe(confirmBtn);
      });
    });

    it("cancels and closes dialog on Escape key", () => {
      const handleCancel = vi.fn();
      render(
        <ConfirmDialog
          isOpen={true}
          title="Delete Dossier"
          message="Permanent action"
          onConfirm={vi.fn()}
          onCancel={handleCancel}
        />
      );

      fireEvent.keyDown(window, { key: "Escape" });
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });

    it("traps Tab and Shift+Tab focus cycling within modal dialog actions", () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Confirm Dispatch"
          message="Dispatch products now?"
          cancelLabel="Dismiss"
          confirmLabel="Dispatch Now"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const cancelBtn = screen.getByText("Dismiss");
      const confirmBtn = screen.getByText("Dispatch Now");

      // Place focus on confirm button (last focusable)
      confirmBtn.focus();
      expect(document.activeElement).toBe(confirmBtn);

      // Press Tab -> Should loop to Cancel button (first focusable)
      fireEvent.keyDown(window, { key: "Tab", shiftKey: false });
      expect(document.activeElement).toBe(cancelBtn);

      // Press Shift+Tab -> Should loop back to Confirm button (last focusable)
      fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
      expect(document.activeElement).toBe(confirmBtn);
    });

    it("restores focus to trigger element when dialog closes", async () => {
      const { rerender } = render(
        <div>
          <button id="delete-trigger">Delete Product</button>
          <ConfirmDialog
            isOpen={false}
            title="Delete Product"
            message="Confirm delete?"
            onConfirm={vi.fn()}
            onCancel={vi.fn()}
          />
        </div>
      );

      const trigger = screen.getByText("Delete Product");
      trigger.focus();
      expect(document.activeElement).toBe(trigger);

      // Open dialog
      rerender(
        <div>
          <button id="delete-trigger">Delete Product</button>
          <ConfirmDialog
            isOpen={true}
            title="Delete Product"
            message="Confirm delete?"
            onConfirm={vi.fn()}
            onCancel={vi.fn()}
          />
        </div>
      );

      // Close dialog
      rerender(
        <div>
          <button id="delete-trigger">Delete Product</button>
          <ConfirmDialog
            isOpen={false}
            title="Delete Product"
            message="Confirm delete?"
            onConfirm={vi.fn()}
            onCancel={vi.fn()}
          />
        </div>
      );

      await waitFor(() => {
        expect(document.activeElement).toBe(trigger);
      });
    });
  });
});
