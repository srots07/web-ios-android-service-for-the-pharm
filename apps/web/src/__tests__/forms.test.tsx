import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  FormField,
  TextInput,
  SelectInput,
  FormActions,
  ConfirmDialog,
  StatusBadge,
} from "@/components/forms";

describe("Enterprise Form Components (components/forms)", () => {
  it("renders FormField with label, required asterisk, and error alert", () => {
    render(
      <FormField label="Batch Number" required hint="e.g. BT-2026-99" error="Invalid batch code format">
        <input data-testid="field-input" />
      </FormField>
    );

    expect(screen.getByText(/BATCH NUMBER/i)).toBeInTheDocument();
    expect(screen.getByText("*")).toBeInTheDocument();
    expect(screen.getByText("e.g. BT-2026-99")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid batch code format");
    expect(screen.getByTestId("field-input")).toBeInTheDocument();
  });

  it("renders TextInput with placeholder, value, and handles input changes", () => {
    const handleChange = vi.fn();
    render(
      <TextInput
        placeholder="Enter formulation name"
        value="Amoxicillin"
        onChange={handleChange}
        data-testid="text-input"
      />
    );

    const input = screen.getByTestId("text-input") as HTMLInputElement;
    expect(input.value).toBe("Amoxicillin");

    fireEvent.change(input, { target: { value: "Ciprofloxacin" } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it("renders SelectInput with formatted options and placeholder", () => {
    const options = [
      { value: "tablets", label: "Oral Solid (Tablets)" },
      { value: "capsules", label: "Oral Solid (Capsules)" },
      { value: "injectables", label: "Sterile Parenteral (Injectable)" },
    ];

    render(
      <SelectInput
        placeholder="Select Dosage Form"
        options={options}
        defaultValue="tablets"
        data-testid="dosage-select"
      />
    );

    const select = screen.getByTestId("dosage-select") as HTMLSelectElement;
    expect(select.value).toBe("tablets");
    expect(screen.getByText("Sterile Parenteral (Injectable)")).toBeInTheDocument();
  });

  it("renders FormActions and triggers onCancel and onDestructive callbacks", () => {
    const handleCancel = vi.fn();
    const handleDestructive = vi.fn();

    render(
      <FormActions
        submitLabel="Commit Formulation"
        cancelLabel="Discard"
        onCancel={handleCancel}
        destructiveLabel="Archive Dossier"
        onDestructive={handleDestructive}
      />
    );

    expect(screen.getByText("Commit Formulation")).toBeInTheDocument();
    const cancelBtn = screen.getByText("Discard");
    fireEvent.click(cancelBtn);
    expect(handleCancel).toHaveBeenCalledTimes(1);

    const destructiveBtn = screen.getByText("Archive Dossier");
    fireEvent.click(destructiveBtn);
    expect(handleDestructive).toHaveBeenCalledTimes(1);
  });

  it("renders ConfirmDialog and responds to confirmation and cancellation", () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    const { rerender } = render(
      <ConfirmDialog
        isOpen={false}
        title="Revoke Permission"
        message="Are you sure you want to revoke this administrative privilege?"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );

    expect(screen.queryByText("Revoke Permission")).not.toBeInTheDocument();

    rerender(
      <ConfirmDialog
        isOpen={true}
        title="Revoke Permission"
        message="Are you sure you want to revoke this administrative privilege?"
        confirmLabel="Revoke Now"
        destructive={true}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );

    expect(screen.getByText("Revoke Permission")).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to revoke/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Revoke Now"));
    expect(handleConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("Cancel"));
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it("renders StatusBadge with semantic styling classes across lifecycle states", () => {
    const { container: c1 } = render(<StatusBadge status="published" />);
    expect(c1.firstChild).toHaveClass("bg-emerald-100", "text-emerald-800");

    const { container: c2 } = render(<StatusBadge status="pending" />);
    expect(c2.firstChild).toHaveClass("bg-amber-100", "text-amber-800");

    const { container: c3 } = render(<StatusBadge status="cancelled" />);
    expect(c3.firstChild).toHaveClass("bg-red-100", "text-red-800");
  });
});
