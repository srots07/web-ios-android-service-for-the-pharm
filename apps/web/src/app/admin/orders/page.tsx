"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ordersApi } from "@/lib/api";
import {
  ShoppingCart,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowRight,
  Building,
  Globe,
  Loader2,
  Send,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  target_pack_size?: string | null;
}

interface OrderStatusHistory {
  id: string;
  previous_status: string;
  new_status: string;
  changed_by: string;
  reason?: string | null;
  created_at: string;
}

interface OrderDetail {
  id: string;
  order_number: string;
  inquiry_id?: string | null;
  customer_name: string;
  customer_email: string;
  organization?: string | null;
  country: string;
  status: string;
  assigned_admin_id?: string | null;
  assigned_admin_name?: string | null;
  total_estimated_amount?: string | null;
  delivery_terms?: string | null;
  internal_notes?: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  status_history: OrderStatusHistory[];
}

interface OrderListItem {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  organization?: string | null;
  country: string;
  status: string;
  assigned_admin_id?: string | null;
  total_estimated_amount?: string | null;
  created_at: string;
  updated_at: string;
  items_count: number;
}

const ORDER_TRANSITIONS: Record<string, string[]> = {
  "Submitted": ["In Review", "Cancelled"],
  "In Review": ["Quotation Sent", "Confirmed", "Cancelled"],
  "Quotation Sent": ["Confirmed", "Cancelled"],
  "Confirmed": ["In Production", "Cancelled"],
  "In Production": ["Shipped", "Cancelled"],
  "Shipped": ["Delivered"],
  "Delivered": [],
  "Cancelled": [],
};

const ALL_FILTER_STATUSES = [
  "Submitted",
  "In Review",
  "Quotation Sent",
  "Confirmed",
  "In Production",
  "Shipped",
  "Delivered",
  "Cancelled",
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
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

  // Order Details Modal
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Transition status form
  const [newStatus, setNewStatus] = useState("In Review");
  const [statusReason, setStatusReason] = useState("");
  const [transitioning, setTransitioning] = useState(false);

  // Create Order Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createCustName, setCreateCustName] = useState("");
  const [createCustEmail, setCreateCustEmail] = useState("");
  const [createOrg, setCreateOrg] = useState("");
  const [createCountry, setCreateCountry] = useState("Tanzania");
  const [createDeliveryTerms, setCreateDeliveryTerms] = useState("CIF Dar es Salaam");
  const [createNotes, setCreateNotes] = useState("");
  const [createItems, setCreateItems] = useState<
    Array<{ product_name: string; sku: string; quantity: number; target_pack_size: string }>
  >([
    {
      product_name: "Amoxicillin Trihydrate BP 500mg",
      sku: "AMX-500-CAP",
      quantity: 5000,
      target_pack_size: "10x10 Blister Pack",
    },
  ]);
  const [creatingOrder, setCreatingOrder] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ordersApi.list({
        page,
        limit,
        search: searchTerm.trim() || undefined,
        status: statusFilter || undefined,
      });
      setOrders((data.items as any) || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err: any) {
      setError(err.message || "Could not retrieve procurement orders.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const openOrderDetails = async (orderId: string) => {
    setDetailLoading(true);
    setActionSuccess(null);
    try {
      const data = await ordersApi.get(orderId);
      setSelectedOrder(data as any);
      const nextAllowed = ORDER_TRANSITIONS[data.status] || [];
      setNewStatus(nextAllowed[0] || data.status);
      setStatusReason("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createItems.length === 0) {
      setError("Please add at least one line item.");
      return;
    }
    setCreatingOrder(true);
    setError(null);
    setActionSuccess(null);
    try {
      const payload = {
        customer_name: createCustName.trim(),
        customer_email: createCustEmail.trim(),
        organization: createOrg.trim() || undefined,
        country: createCountry.trim(),
        delivery_terms: createDeliveryTerms.trim() || undefined,
        internal_notes: createNotes.trim() || undefined,
        items: createItems.map((item) => ({
          product_id: item.sku,
          product_name: item.product_name,
          sku: item.sku,
          quantity: Number(item.quantity) || 1,
          target_pack_size: item.target_pack_size,
        })),
      };
      const res = await ordersApi.create(payload);
      setActionSuccess(`Commercial order ${res.order_number} initialized successfully.`);
      setShowCreateModal(false);
      setCreateCustName("");
      setCreateCustEmail("");
      setCreateOrg("");
      fetchOrders();
    } catch (err: any) {
      setError(err?.message || "Failed to initialize commercial order.");
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setTransitioning(true);
    setError(null);
    setActionSuccess(null);
    try {
      const updated = await ordersApi.updateStatus(
        selectedOrder.id,
        newStatus,
        statusReason || `Status updated to ${newStatus}`
      );
      setSelectedOrder(updated as any);
      setActionSuccess(`Order ${updated.order_number} transitioned to ${newStatus}.`);
      fetchOrders();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTransitioning(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Submitted":
        return "bg-sky-100 text-sky-800";
      case "In Review":
        return "bg-amber-100 text-amber-800";
      case "Quotation Sent":
        return "bg-purple-100 text-purple-800";
      case "Confirmed":
      case "Delivered":
        return "bg-emerald-100 text-emerald-800";
      case "In Production":
      case "Shipped":
        return "bg-blue-100 text-blue-800";
      case "Cancelled":
        return "bg-rose-100 text-rose-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

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
            Commercial Orders & Procurement
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor institutional B2B orders, batch allocations, delivery terms and fulfillment workflows.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchOrders()}
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
            Initialize New Order
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Total Inquiries / Orders</p>
            <ShoppingCart className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{total}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Under Clinical Review</p>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {orders.filter((o) => o.status === "In Review").length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Quotations Sent</p>
            <FileText className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {orders.filter((o) => o.status === "Quotation Sent").length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Confirmed & Production</p>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {orders.filter((o) => ["Confirmed", "In Production", "Delivered"].includes(o.status)).length}
          </p>
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
              placeholder="Search by order number, buyer name, organization, or email..."
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
              <option value="">All Lifecycle Stages</option>
              {ALL_FILTER_STATUSES.map((st) => (
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
                <th className="px-4 py-3">Order Number</th>
                <th className="px-4 py-3">Customer & Institution</th>
                <th className="px-4 py-3">Jurisdiction</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Estimated Total</th>
                <th className="px-4 py-3">Lifecycle Status</th>
                <th className="px-4 py-3">Last Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
                    <p className="mt-2 text-xs">Loading commercial orders...</p>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground/60" />
                    <p className="mt-2 text-sm font-medium">No commercial orders match current query.</p>
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                        {o.order_number}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div>
                        <p className="font-medium text-foreground">{o.customer_name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building className="h-3 w-3" /> {o.organization || "Independent Practice"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" /> {o.country}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-medium text-foreground">
                      {o.items_count} Formulations
                    </td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-foreground">
                      {o.total_estimated_amount || "Pending Quote"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadge(
                          o.status
                        )}`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {new Date(o.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => openOrderDetails(o.id)}
                        className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
                      >
                        Inspect Workflow
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
            Showing <span className="font-medium text-foreground">{orders.length}</span> of{" "}
            <span className="font-medium text-foreground">{total}</span> orders
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

      {/* Order Detail & Workflow Drawer / Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-sm">
                    {selectedOrder.order_number}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusBadge(
                      selectedOrder.status
                    )}`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>
                <h3 className="font-bold text-foreground text-lg mt-1">
                  {selectedOrder.customer_name} — {selectedOrder.organization || "B2B Client"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selectedOrder.customer_email} • {selectedOrder.country}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Requisition Line Items */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                Requisitioned Formulations ({selectedOrder.items?.length || 0})
              </h4>
              <div className="divide-y divide-border rounded-xl border border-border bg-muted/20">
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 text-sm">
                    <div>
                      <p className="font-semibold text-foreground">{item.product_name}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        SKU: {item.sku} • Pack: {item.target_pack_size || "Standard"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">{item.quantity.toLocaleString()} Units</p>
                      <span className="text-xs text-emerald-700">Commercial Batch</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Terms & Notes */}
            {selectedOrder.delivery_terms && (
              <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs space-y-1">
                <span className="font-semibold text-foreground">Delivery & Incoterms:</span>
                <p className="text-muted-foreground">{selectedOrder.delivery_terms}</p>
              </div>
            )}

            {/* Transition Status Form */}
            {ORDER_TRANSITIONS[selectedOrder.status] && ORDER_TRANSITIONS[selectedOrder.status].length > 0 ? (
              <form onSubmit={handleUpdateStatus} className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
                <h4 className="text-xs font-semibold uppercase text-foreground">Advance Lifecycle Status</h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      New Permitted Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-emerald-600 focus:outline-hidden"
                    >
                      {ORDER_TRANSITIONS[selectedOrder.status].map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Audit Transition Reason / Notes
                    </label>
                    <input
                      type="text"
                      value={statusReason}
                      onChange={(e) => setStatusReason(e.target.value)}
                      placeholder="e.g. Approved by Medical Director"
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <Link
                    href="/admin/quotations"
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-900 font-medium"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Generate Formal Commercial Quotation
                  </Link>
                  <button
                    type="submit"
                    disabled={transitioning || !ORDER_TRANSITIONS[selectedOrder.status]?.includes(newStatus)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {transitioning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Advance State
                  </button>
                </div>
              </form>
            ) : (
              <div className="rounded-xl border border-border bg-muted/20 p-4 text-center">
                <p className="text-xs font-medium text-muted-foreground">
                  Order reached terminal lifecycle state ({selectedOrder.status}). Further status transitions are locked.
                </p>
              </div>
            )}

            {/* Status History Audit Trail */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">Lifecycle Audit Log</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {selectedOrder.status_history?.map((h) => (
                  <div key={h.id} className="rounded-lg border border-border bg-muted/20 p-2 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-foreground">
                        {h.previous_status} <ArrowRight className="inline h-3 w-3" /> {h.new_status}
                      </span>
                      <p className="text-muted-foreground">{h.reason || "Status transition recorded."}</p>
                    </div>
                    <div className="text-right text-[11px] text-muted-foreground">
                      <p className="font-medium text-foreground">{h.changed_by}</p>
                      <p>{new Date(h.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-foreground text-lg">Initialize Procurement Order</h3>
                <p className="text-xs text-muted-foreground">Register an institutional order with line items into the database</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Customer / Contact Name *</label>
                  <input
                    type="text"
                    required
                    value={createCustName}
                    onChange={(e) => setCreateCustName(e.target.value)}
                    placeholder="Dr. Juma Ally"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Customer Email *</label>
                  <input
                    type="email"
                    required
                    value={createCustEmail}
                    onChange={(e) => setCreateCustEmail(e.target.value)}
                    placeholder="juma.ally@medsafecenter.tz"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Organization / Hospital</label>
                  <input
                    type="text"
                    value={createOrg}
                    onChange={(e) => setCreateOrg(e.target.value)}
                    placeholder="Medsafecenter Hospital Network"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Country / Destination *</label>
                  <input
                    type="text"
                    required
                    value={createCountry}
                    onChange={(e) => setCreateCountry(e.target.value)}
                    placeholder="Tanzania"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Delivery Terms (Incoterms)</label>
                  <input
                    type="text"
                    value={createDeliveryTerms}
                    onChange={(e) => setCreateDeliveryTerms(e.target.value)}
                    placeholder="CIF Dar es Salaam Port"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Internal Clinical Notes</label>
                  <input
                    type="text"
                    value={createNotes}
                    onChange={(e) => setCreateNotes(e.target.value)}
                    placeholder="Urgent batch for pediatric oncology ward"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase text-foreground">Requisition Line Items</h4>
                  <button
                    type="button"
                    onClick={() =>
                      setCreateItems([
                        ...createItems,
                        { product_name: "", sku: "", quantity: 1000, target_pack_size: "Standard Pack" },
                      ])
                    }
                    className="text-xs text-emerald-700 hover:text-emerald-900 font-medium inline-flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add Item
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {createItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-center bg-muted/20 p-2.5 rounded-lg border border-border">
                      <div className="col-span-2 sm:col-span-4">
                        <input
                          type="text"
                          required
                          placeholder="Formulation Name"
                          value={item.product_name}
                          onChange={(e) => {
                            const updated = [...createItems];
                            updated[idx].product_name = e.target.value;
                            setCreateItems(updated);
                          }}
                          className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-3">
                        <input
                          type="text"
                          required
                          placeholder="SKU (e.g. CIP-500)"
                          value={item.sku}
                          onChange={(e) => {
                            const updated = [...createItems];
                            updated[idx].sku = e.target.value;
                            setCreateItems(updated);
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
                            const updated = [...createItems];
                            updated[idx].quantity = parseInt(e.target.value) || 1;
                            setCreateItems(updated);
                          }}
                          className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                        />
                      </div>
                      <div className="col-span-1 sm:col-span-2">
                        <input
                          type="text"
                          placeholder="Pack size"
                          value={item.target_pack_size}
                          onChange={(e) => {
                            const updated = [...createItems];
                            updated[idx].target_pack_size = e.target.value;
                            setCreateItems(updated);
                          }}
                          className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1 text-right sm:text-center">
                        {createItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setCreateItems(createItems.filter((_, i) => i !== idx))}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingOrder}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {creatingOrder && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

