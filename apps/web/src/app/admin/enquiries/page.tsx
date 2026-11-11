"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Mail,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  User,
  Globe,
  Loader2,
  Calendar,
} from "lucide-react";
import { enquiriesApi, usersApi } from "@/lib/api";
import { EnquiryListItem, EnquiryDetail, AuthUser } from "@/lib/api/types";
import {
  StatusBadge,
  FormField,
  TextInput,
  SelectInput,
  TextArea,
  FormActions,
  FormError,
  Pagination,
  LoadingState,
  EmptyState,
} from "@/components/forms";

const ENQUIRY_STATUSES = ["Pending", "Reviewing", "Quoted", "Resolved", "Closed"];

export default function AdminEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<EnquiryListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Detail Modal
  const [selectedEnquiry, setSelectedEnquiry] = useState<EnquiryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Edit / Action State
  const [editStatus, setEditStatus] = useState("Pending");
  const [editAdminId, setEditAdminId] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Admin user list for assignment
  const [admins, setAdmins] = useState<AuthUser[]>([]);

  const fetchEnquiries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await enquiriesApi.listAdmin({
        page,
        limit,
        search: searchTerm.trim() || undefined,
        status: statusFilter || undefined,
      });
      setEnquiries(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err: any) {
      setError(err.message || "Failed to load commercial enquiries.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, statusFilter]);

  useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  // Load admins once for assignment dropdown
  useEffect(() => {
    usersApi
      .list({ limit: 50, role: "admin" })
      .then((res) => setAdmins(res.items || []))
      .catch(() => {});
  }, []);

  const openEnquiryDetails = async (id: string) => {
    setDetailLoading(true);
    setActionSuccess(null);
    setError(null);
    try {
      const inq = await enquiriesApi.get(id);
      setSelectedEnquiry(inq);
      setEditStatus(inq.status);
      setEditAdminId(inq.assigned_admin_id || "");
      setEditNotes(inq.internal_notes || "");
    } catch (err: any) {
      setError(err.message || "Could not retrieve enquiry details.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnquiry) return;
    setSubmitting(true);
    setError(null);
    setActionSuccess(null);

    try {
      const updated = await enquiriesApi.update(selectedEnquiry.id, {
        status: editStatus,
        assigned_admin_id: editAdminId || undefined,
        internal_notes: editNotes,
      });
      setSelectedEnquiry(updated);
      setActionSuccess(`Inquiry ${updated.reference_id} updated successfully.`);
      fetchEnquiries();
    } catch (err: any) {
      setError(err.message || "Failed to update inquiry.");
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics
  const pendingCount = enquiries.filter((e) => e.status === "Pending").length;
  const reviewingCount = enquiries.filter((e) => e.status === "Reviewing").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
              Module W09
            </span>
            <span className="text-xs text-muted-foreground">Enquiry Workflow Engine</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Commercial Inquiries Desk
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage institutional requests, batch allocations, tenders, and clinical formulation inquiries.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchEnquiries()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-xs hover:bg-muted focus:outline-hidden"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && <FormError error={error} onDismiss={() => setError(null)} />}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Total Inquiries</p>
            <Mail className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{total}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Pending Action</p>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">In Review</p>
            <UserCheck className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-sky-600">{reviewingCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Closed / Resolved</p>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {enquiries.filter((e) => ["Resolved", "Closed"].includes(e.status)).length}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by reference, contact name, email, org..."
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-4 text-sm text-foreground focus:border-emerald-600 focus:outline-hidden"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald-600 focus:outline-hidden"
          >
            <option value="">All Statuses</option>
            {ENQUIRY_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        {loading ? (
          <LoadingState message="Retrieving inquiries from database..." />
        ) : enquiries.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No commercial inquiries found"
            description="No inquiries matching your criteria were found in the database."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm text-foreground">
              <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground font-semibold">
                <tr>
                  <th className="px-4 py-3">Reference / Contact</th>
                  <th className="px-4 py-3">Subject / Type</th>
                  <th className="px-4 py-3">Destination</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Assigned Desk</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {enquiries.map((inq) => (
                  <tr key={inq.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs font-bold text-emerald-700">
                        {inq.reference_id}
                      </div>
                      <div className="font-medium text-foreground">{inq.full_name}</div>
                      <div className="text-xs text-muted-foreground">{inq.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground max-w-xs truncate">
                        {inq.subject}
                      </div>
                      <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {inq.enquiry_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1 font-medium text-foreground">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        {inq.country}
                      </div>
                      {inq.organization && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate max-w-[140px]">
                          <Building className="h-3 w-3" />
                          {inq.organization}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inq.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {inq.assigned_admin_name || (
                        <span className="italic text-amber-600">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(inq.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEnquiryDetails(inq.id)}
                        className="inline-flex items-center rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                      >
                        Inspect & Action
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={total}
          onPageChange={setPage}
        />
      </div>

      {/* Slide-over / Modal for Details & Actions */}
      {selectedEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-700">
                    {selectedEnquiry.reference_id}
                  </span>
                  <StatusBadge status={selectedEnquiry.status} />
                </div>
                <h2 className="text-lg font-bold text-foreground mt-1">
                  {selectedEnquiry.subject}
                </h2>
              </div>
              <button
                onClick={() => setSelectedEnquiry(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Inquirer Specs */}
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-4 text-xs">
              <div>
                <span className="text-muted-foreground block">Inquirer:</span>
                <strong className="text-foreground text-sm">{selectedEnquiry.full_name}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block">Business Email:</span>
                <span className="text-foreground font-mono">{selectedEnquiry.email}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Phone:</span>
                <span className="text-foreground">{selectedEnquiry.phone || "Not specified"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Country / Organization:</span>
                <span className="text-foreground">
                  {selectedEnquiry.country}{" "}
                  {selectedEnquiry.organization ? `· ${selectedEnquiry.organization}` : ""}
                </span>
              </div>
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                Enquiry Message
              </label>
              <div className="rounded-lg border border-border bg-background p-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {selectedEnquiry.message}
              </div>
            </div>

            {/* Workflow Action Form */}
            <form onSubmit={handleUpdateEnquiry} className="space-y-4 border-t border-border pt-4">
              <h3 className="text-sm font-bold text-foreground">Desk Assignment & Status Action</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Lifecycle Status" required>
                  <SelectInput
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    options={ENQUIRY_STATUSES.map((s) => ({ value: s, label: s }))}
                  />
                </FormField>

                <FormField label="Assigned Administrator">
                  <SelectInput
                    value={editAdminId}
                    onChange={(e) => setEditAdminId(e.target.value)}
                    options={[
                      { value: "", label: "Unassigned" },
                      ...admins.map((a) => ({ value: a.id, label: `${a.full_name} (${a.email})` })),
                    ]}
                  />
                </FormField>
              </div>

              <FormField label="Internal Notes / Review History" hint="Audited administrative comments">
                <TextArea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Record verification notes, batch availability check, or commercial quotation ref..."
                />
              </FormField>

              <FormActions
                submitLabel="Update Enquiry"
                cancelLabel="Close"
                onCancel={() => setSelectedEnquiry(null)}
                loading={submitting}
              />
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

