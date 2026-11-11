"use client";

import React, { useState, useEffect, useCallback } from "react";
import { quotationsApi } from "@/lib/api";
import {
  FileText,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Building,
  Calendar,
  Send,
  Loader2,
  Trash2,
  Check,
  Edit3,
} from "lucide-react";

interface QuotationItem {
  id?: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface QuotationDetail {
  id: string;
  quotation_number: string;
  order_id?: string | null;
  recipient_name: string;
  recipient_email: string;
  organization?: string | null;
  country: string;
  status: string;
  valid_until: string;
  currency: string;
  total_amount: number;
  commercial_terms?: string | null;
  created_at: string;
  items: QuotationItem[];
}

interface QuotationListItem {
  id: string;
  quotation_number: string;
  order_id?: string | null;
  recipient_name: string;
  recipient_email: string;
  organization?: string | null;
  country: string;
  status: string;
  valid_until: string;
  currency: string;
  total_amount: number;
  created_at: string;
  items_count: number;
}

const QUOTATION_TRANSITIONS: Record<string, string[]> = {
  "Draft": ["Sent", "Declined"],
  "Sent": ["Accepted", "Declined", "Expired"],
  "Accepted": [],
  "Declined": [],
  "Expired": [],
};

const ALL_QUOTATION_STATUSES = ["Draft", "Sent", "Accepted", "Expired", "Declined"];

export default function AdminQuotationsPage() {
  const [quotations, setQuotations] = useState<QuotationListItem[]>([]);
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

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Edit Draft state
  const [editingQuotation, setEditingQuotation] = useState<QuotationDetail | null>(null);
  const [editTerms, setEditTerms] = useState("");
  const [editValidDays, setEditValidDays] = useState(30);
  const [editItems, setEditItems] = useState<
    Array<{
      product_id: string;
      product_name: string;
      sku: string;
      quantity: number;
      unit_price: number;
    }>
  >([]);
  const [updatingDraft, setUpdatingDraft] = useState(false);

  const openEditDraft = (q: QuotationDetail) => {
    setEditingQuotation(q);
    setEditTerms(q.commercial_terms || "");
    setEditValidDays(30);
    setEditItems(
      (q.items || []).map((it) => ({
        product_id: it.product_id,
        product_name: it.product_name,
        sku: it.sku,
        quantity: it.quantity,
        unit_price: it.unit_price,
      }))
    );
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuotation) return;
    setUpdatingDraft(true);
    setError(null);
    setActionSuccess(null);
    try {
      const updated = await quotationsApi.update(editingQuotation.id, {
        commercial_terms: editTerms,
        valid_days: editValidDays,
        items: editItems.map((it) => ({
          product_id: it.product_id,
          product_name: it.product_name,
          sku: it.sku,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
        })),
      });
      setActionSuccess(`Draft quotation ${updated.quotation_number} updated with authoritative recalculated totals.`);
      setEditingQuotation(null);
      setSelectedQuotation(updated as any);
      fetchQuotations();
    } catch (err: any) {
      setError(err?.message || "Failed to update draft quotation.");
    } finally {
      setUpdatingDraft(false);
    }
  };

  // Create quotation form state
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [country, setCountry] = useState("United States");
  const [currency, setCurrency] = useState("USD");
  const [validDays, setValidDays] = useState(30);
  const [commercialTerms, setCommercialTerms] = useState(
    "Payment: 50% deposit upon proforma invoice confirmation, 50% prior to dispatch. Delivery: CIF Port of Entry (Incoterms 2020)."
  );
  const [lineItems, setLineItems] = useState<
    Array<{
      product_id: string;
      product_name: string;
      sku: string;
      quantity: number;
      unit_price: number;
    }>
  >([
    {
      product_id: "tab-001",
      product_name: "Daily Multivitamin Plus",
      sku: "TAB-001",
      quantity: 5000,
      unit_price: 3.2,
    },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await quotationsApi.list({
        page,
        limit,
        search: searchTerm.trim() || undefined,
        status: statusFilter || undefined,
      });
      setQuotations((data.items as any) || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err: any) {
      setError(err.message || "Could not retrieve quotations.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, statusFilter]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const openQuotationDetails = async (quoteId: string) => {
    setDetailLoading(true);
    setActionSuccess(null);
    try {
      const data = await quotationsApi.get(quoteId);
      setSelectedQuotation(data as any);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateStatus = async (quoteId: string, targetStatus: string) => {
    setError(null);
    setActionSuccess(null);
    try {
      const updated = await quotationsApi.updateStatus(quoteId, targetStatus);
      if (selectedQuotation && selectedQuotation.id === quoteId) {
        setSelectedQuotation(updated as any);
      }
      setActionSuccess(`Quotation ${updated.quotation_number} status set to ${targetStatus}.`);
      fetchQuotations();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        product_id: "custom-item",
        product_name: "Active Calcium + D3",
        sku: "TAB-002",
        quantity: 1000,
        unit_price: 2.5,
      },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const calculatedGrandTotal = lineItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
    0
  );

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setActionSuccess(null);
    try {
      const newQuote = await quotationsApi.create({
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        organization: organization,
        country: country,
        currency: currency,
        valid_days: validDays,
        commercial_terms: commercialTerms,
        items: lineItems.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          sku: item.sku,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
        })),
      });
      setActionSuccess(`Quotation ${newQuote.quotation_number} generated successfully.`);
      setShowCreateModal(false);
      fetchQuotations();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics
  const totalVal = quotations.reduce((acc, q) => acc + (q.total_amount || 0), 0);
  const acceptedCount = quotations.filter((q) => q.status === "Accepted").length;
  const sentCount = quotations.filter((q) => q.status === "Sent").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
              Module W07
            </span>
            <span className="text-xs text-muted-foreground">PostgreSQL Persistence</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Commercial Quotations & Batch Pricing
          </h1>
          <p className="text-sm text-muted-foreground">
            Formulate formal pharmaceutical price proformas, manage validity periods and commercial acceptance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchQuotations()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-xs hover:bg-muted"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-emerald-800"
          >
            <Plus className="h-4 w-4" />
            New Commercial Quotation
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Total Quotations</p>
            <FileText className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{total}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Sent to Buyers</p>
            <Send className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{sentCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Accepted Deals</p>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{acceptedCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Active Pipeline Value</p>
            <DollarSign className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">${totalVal.toLocaleString()}</p>
        </div>
      </div>

      {/* Action / Error Alerts */}
      {actionSuccess && (
        <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-lg bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-inset ring-rose-600/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search quotation by number, recipient name, email or institution..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-600 focus:outline-hidden"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald-600 focus:outline-hidden"
            >
              <option value="">All Quotation Statuses</option>
              {ALL_QUOTATION_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Quotation Number</th>
                <th className="px-4 py-3">Recipient & Institution</th>
                <th className="px-4 py-3">Jurisdiction</th>
                <th className="px-4 py-3">Formulations</th>
                <th className="px-4 py-3">Total Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Valid Until</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
                    <p className="mt-2 text-xs">Querying database quotations...</p>
                  </td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <FileText className="mx-auto h-8 w-8 text-muted-foreground/60" />
                    <p className="mt-2 text-sm font-medium">No quotations match current criteria.</p>
                  </td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                        {q.quotation_number}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div>
                        <p className="font-medium text-foreground">{q.recipient_name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building className="h-3 w-3" /> {q.organization || "Direct Clinician"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">{q.country}</td>
                    <td className="px-4 py-3.5 text-xs font-medium text-foreground">
                      {q.items_count} Line Items
                    </td>
                    <td className="px-4 py-3.5 text-xs font-bold text-foreground">
                      {q.currency} {q.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          q.status === "Accepted"
                            ? "bg-emerald-100 text-emerald-800"
                            : q.status === "Sent"
                            ? "bg-purple-100 text-purple-800"
                            : q.status === "Draft"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {q.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {new Date(q.valid_until).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => openQuotationDetails(q.id)}
                        className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
                      >
                        View Proforma
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3 sm:px-6">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{quotations.length}</span> of{" "}
            <span className="font-medium text-foreground">{total}</span> quotations
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground disabled:opacity-50 hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground disabled:opacity-50 hover:bg-muted"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Create Commercial Quotation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="font-bold text-foreground text-lg">Generate Formal Commercial Quotation</h3>
                <p className="text-xs text-muted-foreground">
                  Calculate line item batch pricing, currency parameters, and Incoterm commercial terms.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Recipient Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g. Dr. Helena Troy"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Recipient Corporate Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="procurement@hospital.org"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Organization / Entity
                  </label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="Apollo Regional Hospital"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Destination Country *
                  </label>
                  <input
                    type="text"
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="United States"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Contract Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-emerald-600 focus:outline-hidden"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Validity Duration
                  </label>
                  <select
                    value={validDays}
                    onChange={(e) => setValidDays(Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-emerald-600 focus:outline-hidden"
                  >
                    <option value={15}>15 Days</option>
                    <option value={30}>30 Days (Standard)</option>
                    <option value={60}>60 Days</option>
                    <option value={90}>90 Days</option>
                  </select>
                </div>
              </div>

              {/* Line Items Calculator */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                    Formulation Line Items & Batch Pricing
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Formulation Item
                  </button>
                </div>

                <div className="space-y-2">
                  {lineItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-center rounded-xl border border-border bg-muted/20 p-2.5 text-xs"
                    >
                      <div className="col-span-2 sm:col-span-5">
                        <label className="text-[10px] text-muted-foreground block mb-0.5">Product Name</label>
                        <input
                          type="text"
                          required
                          value={item.product_name}
                          onChange={(e) => handleLineItemChange(idx, "product_name", e.target.value)}
                          className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs font-medium"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-2">
                        <label className="text-[10px] text-muted-foreground block mb-0.5">SKU</label>
                        <input
                          type="text"
                          required
                          value={item.sku}
                          onChange={(e) => handleLineItemChange(idx, "sku", e.target.value.toUpperCase())}
                          className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs font-mono"
                        />
                      </div>
                      <div className="col-span-1 sm:col-span-2">
                        <label className="text-[10px] text-muted-foreground block mb-0.5">Quantity</label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={item.quantity}
                          onChange={(e) => handleLineItemChange(idx, "quantity", Number(e.target.value))}
                          className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                        />
                      </div>
                      <div className="col-span-1 sm:col-span-2">
                        <label className="text-[10px] text-muted-foreground block mb-0.5">Unit Price ({currency})</label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          required
                          value={item.unit_price}
                          onChange={(e) => handleLineItemChange(idx, "unit_price", Number(e.target.value))}
                          className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1 flex justify-end sm:justify-center pt-1 sm:pt-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(idx)}
                          className="text-muted-foreground hover:text-rose-600 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-2 text-right">
                  <div className="rounded-xl border border-border bg-muted/40 px-4 py-2">
                    <span className="text-xs text-muted-foreground">Calculated Grand Total:</span>
                    <p className="text-lg font-bold text-foreground">
                      {currency} {calculatedGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Commercial Terms */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Incoterms & Commercial Payment Terms
                </label>
                <textarea
                  rows={2}
                  value={commercialTerms}
                  onChange={(e) => setCommercialTerms(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-emerald-800 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Generate Formal Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Proforma Modal */}
      {selectedQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-sm">
                    {selectedQuotation.quotation_number}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      selectedQuotation.status === "Accepted"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-purple-100 text-purple-800"
                    }`}
                  >
                    {selectedQuotation.status}
                  </span>
                </div>
                <h3 className="font-bold text-foreground text-lg mt-1">
                  Proforma: {selectedQuotation.recipient_name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selectedQuotation.organization || "Direct Institution"} • {selectedQuotation.country}
                </p>
              </div>
              <button
                onClick={() => setSelectedQuotation(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Line items table */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">Line Items Breakdown</h4>
              <div className="divide-y divide-border rounded-xl border border-border bg-muted/20">
                {selectedQuotation.items?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 text-sm">
                    <div>
                      <p className="font-semibold text-foreground">{item.product_name}</p>
                      <p className="font-mono text-xs text-muted-foreground">SKU: {item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        {selectedQuotation.currency} {item.total_price?.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity.toLocaleString()} units @ {selectedQuotation.currency} {item.unit_price}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center rounded-xl bg-muted/40 p-3">
                <span className="text-sm font-semibold text-foreground">Total Quoted Value:</span>
                <span className="text-lg font-bold text-emerald-700">
                  {selectedQuotation.currency} {selectedQuotation.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Commercial Terms */}
            {selectedQuotation.commercial_terms && (
              <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs space-y-1">
                <span className="font-semibold text-foreground">Commercial Agreement Terms:</span>
                <p className="text-muted-foreground">{selectedQuotation.commercial_terms}</p>
              </div>
            )}

            {/* Transition Status Controls */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                {selectedQuotation.status === "Draft" && (
                  <button
                    onClick={() => openEditDraft(selectedQuotation)}
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-600 bg-white px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                  >
                    <Edit3 className="h-3 w-3" /> Edit Draft
                  </button>
                )}
                {(QUOTATION_TRANSITIONS[selectedQuotation.status] || []).length > 0 ? (
                  <>
                    <span className="text-xs text-muted-foreground ml-2">Transition:</span>
                    {(QUOTATION_TRANSITIONS[selectedQuotation.status] || []).map((targetSt) => (
                      <button
                        key={targetSt}
                        onClick={() => handleUpdateStatus(selectedQuotation.id, targetSt)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium border ${
                          targetSt === "Accepted"
                            ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                            : targetSt === "Sent"
                            ? "border-purple-300 bg-purple-50 text-purple-800 hover:bg-purple-100"
                            : "border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100"
                        }`}
                      >
                        Mark {targetSt}
                      </button>
                    ))}
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground italic">
                    Quotation Finalized ({selectedQuotation.status}) & Immutable.
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedQuotation(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Draft Quotation Modal */}
      {editingQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-foreground text-lg">
                  Edit Draft Quotation: {editingQuotation.quotation_number}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Update line items and terms before official client dispatch. Backend recalculates total authoritative amount.
                </p>
              </div>
              <button
                onClick={() => setEditingQuotation(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDraft} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Validity (Days from today)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editValidDays}
                    onChange={(e) => setEditValidDays(parseInt(e.target.value) || 30)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Currency</label>
                  <input
                    type="text"
                    disabled
                    value={editingQuotation.currency}
                    className="w-full rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase text-foreground">Draft Line Items</h4>
                  <button
                    type="button"
                    onClick={() =>
                      setEditItems([
                        ...editItems,
                        {
                          product_id: "custom-item",
                          product_name: "Supplemental Formulation",
                          sku: "SUP-001",
                          quantity: 1000,
                          unit_price: 1.5,
                        },
                      ])
                    }
                    className="text-xs text-emerald-700 hover:text-emerald-900 font-medium inline-flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add Item
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {editItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-center bg-muted/20 p-2.5 rounded-lg border border-border">
                      <div className="col-span-2 sm:col-span-4">
                        <input
                          type="text"
                          required
                          placeholder="Formulation Name"
                          value={item.product_name}
                          onChange={(e) => {
                            const updated = [...editItems];
                            updated[idx].product_name = e.target.value;
                            setEditItems(updated);
                          }}
                          className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-2">
                        <input
                          type="text"
                          required
                          placeholder="SKU"
                          value={item.sku}
                          onChange={(e) => {
                            const updated = [...editItems];
                            updated[idx].sku = e.target.value;
                            setEditItems(updated);
                          }}
                          className="w-full rounded border border-border bg-background px-2 py-1 text-xs font-mono"
                        />
                      </div>
                      <div className="col-span-1 sm:col-span-2">
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => {
                            const updated = [...editItems];
                            updated[idx].quantity = parseInt(e.target.value) || 1;
                            setEditItems(updated);
                          }}
                          className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                        />
                      </div>
                      <div className="col-span-1 sm:col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          placeholder="Unit Price"
                          value={item.unit_price}
                          onChange={(e) => {
                            const updated = [...editItems];
                            updated[idx].unit_price = parseFloat(e.target.value) || 0;
                            setEditItems(updated);
                          }}
                          className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1 text-right sm:text-center">
                        {editItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setEditItems(editItems.filter((_, i) => i !== idx))}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Commercial & Incoterm Terms</label>
                <textarea
                  rows={2}
                  value={editTerms}
                  onChange={(e) => setEditTerms(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingQuotation(null)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingDraft}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {updatingDraft && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Draft Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

