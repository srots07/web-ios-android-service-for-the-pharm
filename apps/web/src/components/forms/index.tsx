"use client";

import React, { ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  X,
  type LucideIcon,
} from "lucide-react";

// --- 1. FormField ---
export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className = "",
}: FormFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={htmlFor}
          className="block text-xs font-semibold tracking-wide text-foreground uppercase"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-600 mt-1" role="alert">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

// --- 2. TextInput ---
export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  icon?: LucideIcon;
}

export function TextInput({ error, icon: Icon, className = "", ...props }: TextInputProps) {
  return (
    <div className="relative">
      {Icon && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
      )}
      <input
        className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-50 ${
          Icon ? "pl-9" : ""
        } ${
          error
            ? "border-red-500 focus:border-red-600 focus:ring-red-500/20"
            : "border-border focus:border-emerald-600"
        } ${className}`}
        {...props}
      />
    </div>
  );
}

// --- 3. SelectInput ---
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  error?: boolean;
  placeholder?: string;
}

export function SelectInput({
  options,
  error,
  placeholder,
  className = "",
  ...props
}: SelectInputProps) {
  return (
    <select
      className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground transition-colors focus:outline-hidden focus:ring-2 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-50 ${
        error
          ? "border-red-500 focus:border-red-600 focus:ring-red-500/20"
          : "border-border focus:border-emerald-600"
      } ${className}`}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// --- 4. TextArea ---
export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function TextArea({ error, className = "", ...props }: TextAreaProps) {
  return (
    <textarea
      className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-50 ${
        error
          ? "border-red-500 focus:border-red-600 focus:ring-red-500/20"
          : "border-border focus:border-emerald-600"
      } ${className}`}
      {...props}
    />
  );
}

// --- 5. FileUpload ---
export interface FileUploadProps {
  label?: string;
  accept?: string;
  maxSizeBytes?: number;
  onFileSelect: (file: File | null) => void;
  selectedFile?: File | null;
  error?: string | null;
  hint?: string;
}

export function FileUpload({
  label = "Upload File",
  accept = ".pdf,.doc,.docx,.png,.jpg,.jpeg",
  maxSizeBytes = 10 * 1024 * 1024,
  onFileSelect,
  selectedFile,
  error,
  hint = "Maximum 10MB (PDF, DOCX, PNG, JPG)",
}: FileUploadProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.size > maxSizeBytes) {
      alert(`File size exceeds ${(maxSizeBytes / (1024 * 1024)).toFixed(0)}MB limit.`);
      return;
    }
    onFileSelect(file);
  };

  return (
    <div className="space-y-1.5">
      <div className="rounded-lg border-2 border-dashed border-border p-4 text-center hover:border-emerald-600/50 transition-colors">
        <UploadCloud className="mx-auto h-7 w-7 text-muted-foreground mb-1.5" />
        <label className="cursor-pointer text-xs font-semibold text-emerald-700 hover:text-emerald-800">
          <span>{label}</span>
          <input
            type="file"
            accept={accept}
            onChange={handleChange}
            className="sr-only"
          />
        </label>
        <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
        {selectedFile && (
          <div className="mt-2.5 inline-flex items-center gap-2 rounded-md bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800 font-mono">
            <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
            <button
              type="button"
              onClick={() => onFileSelect(null)}
              className="text-emerald-600 hover:text-emerald-800"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

// --- 6. FormActions ---
export interface FormActionsProps {
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  loading?: boolean;
  disabled?: boolean;
  destructiveLabel?: string;
  onDestructive?: () => void;
  className?: string;
}

export function FormActions({
  submitLabel = "Save Changes",
  cancelLabel = "Cancel",
  onCancel,
  loading = false,
  disabled = false,
  destructiveLabel,
  onDestructive,
  className = "",
}: FormActionsProps) {
  return (
    <div className={`flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-border ${className}`}>
      <div>
        {destructiveLabel && onDestructive && (
          <button
            type="button"
            onClick={onDestructive}
            disabled={loading || disabled}
            className="w-full sm:w-auto rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
          >
            {destructiveLabel}
          </button>
        )}
      </div>
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="w-full sm:w-auto text-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
        )}
        <button
          type="submit"
          disabled={loading || disabled}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-800 disabled:opacity-50 transition-colors"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

// --- 7. FormError ---
export interface FormErrorProps {
  error: string | null;
  onDismiss?: () => void;
  className?: string;
}

export function FormError({ error, onDismiss, className = "" }: FormErrorProps) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className={`flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50/80 p-3 text-sm text-red-800 ${className}`}
    >
      <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
      <div className="flex-1 text-xs leading-relaxed">{error}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-red-600 hover:text-red-800 shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// --- 8. ConfirmDialog ---
export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{message}</p>
        <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="w-full sm:w-auto text-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-xs disabled:opacity-50 ${
              destructive ? "bg-red-600 hover:bg-red-700" : "bg-emerald-700 hover:bg-emerald-800"
            }`}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- 9. StatusBadge ---
export interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const norm = (status || "").toLowerCase().trim();

  let style = "bg-zinc-100 text-zinc-800";
  if (["published", "confirmed", "delivered", "active", "resolved", "accepted"].includes(norm)) {
    style = "bg-emerald-100 text-emerald-800 border-emerald-200";
  } else if (["in review", "reviewing", "pending", "in production"].includes(norm)) {
    style = "bg-amber-100 text-amber-800 border-amber-200";
  } else if (["quotation sent", "sent", "submitted"].includes(norm)) {
    style = "bg-sky-100 text-sky-800 border-sky-200";
  } else if (["draft"].includes(norm)) {
    style = "bg-purple-100 text-purple-800 border-purple-200";
  } else if (["cancelled", "archived", "suspended", "declined", "expired"].includes(norm)) {
    style = "bg-red-100 text-red-800 border-red-200";
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style} ${className}`}
    >
      {status}
    </span>
  );
}

// --- 10. Pagination ---
export interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (newPage: number) => void;
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  onPageChange,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-between border-t border-border px-4 py-3 sm:px-6 ${className}`}>
      <div className="text-xs text-muted-foreground">
        Showing page <span className="font-semibold text-foreground">{page}</span> of{" "}
        <span className="font-semibold text-foreground">{totalPages}</span> ({totalItems} records)
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Previous
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// --- 11. SearchFilter ---
export interface SearchFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  statusFilter?: string;
  onStatusChange?: (value: string) => void;
  statusOptions?: SelectOption[];
  onRefresh?: () => void;
  loading?: boolean;
}

export function SearchFilter({
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Search records...",
  statusFilter,
  onStatusChange,
  statusOptions,
  onRefresh,
  loading = false,
}: SearchFilterProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-4 text-sm text-foreground focus:border-emerald-600 focus:outline-hidden"
        />
      </div>
      <div className="flex items-center gap-2.5">
        {statusOptions && onStatusChange && (
          <select
            value={statusFilter || ""}
            onChange={(e) => onStatusChange(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald-600 focus:outline-hidden"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

// --- 12. LoadingState ---
export function LoadingState({ message = "Loading records..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// --- 13. EmptyState ---
export function EmptyState({
  icon: Icon = AlertCircle,
  title = "No records found",
  description = "No entries matching your filter criteria were located in the database.",
  actionLabel,
  onAction,
}: {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border bg-card/50">
      <Icon className="h-10 w-10 text-muted-foreground mb-3 opacity-60" />
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <p className="text-xs text-muted-foreground max-w-sm mt-1 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-800"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

