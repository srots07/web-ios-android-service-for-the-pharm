"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Package,
  FileText,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Activity,
  PlusCircle,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShoppingCart,
  DollarSign,
} from "lucide-react";
import { dashboardApi, DashboardSummary, extractErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/lib/store/authStore";

export default function AdminDashboardPage() {
  const { user, init: initAuth } = useAuthStore();
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchSummary() {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardApi.getSummary();
      setDashboardData(data);
    } catch (err: any) {
      setError(extractErrorMessage(err, "Unable to communicate with dashboard metrics service."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    initAuth();
    fetchSummary();
  }, [initAuth]);

  const todayFormatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="admin-dashboard-container">
      {/* Welcome Header */}
      <div className="admin-welcome-section">
        <div className="admin-welcome-left">
          <div className="admin-date-badge">
            <Clock size={13} />
            <span>{todayFormatted}</span>
          </div>
          <h1>
            Welcome back, <span>{user?.full_name || "Administrator"}</span>
          </h1>
          <p>
            PRIME by Activist Central Operations Hub. Monitoring formulation compliance, regulatory registrations, and commercial supply requests.
          </p>
        </div>

        <div className="admin-welcome-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={fetchSummary}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            <span>Refresh Metrics</span>
          </button>
          <Link href="/products" className="primary-button">
            <Package size={16} />
            <span>View Formulations</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="auth-alert-error" role="alert" style={{ margin: "24px 0" }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <section className="admin-kpi-grid">
        {/* KPI 1: Total Users */}
        <div className="admin-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-title">TOTAL REGISTERED USERS</span>
            <div className="kpi-icon-wrap" style={{ background: "#e8f4ee", color: "var(--primary)" }}>
              <Users size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <strong className="kpi-number">
              {loading ? "..." : dashboardData?.users.total ?? 0}
            </strong>
          </div>
          <div className="kpi-detail-text">
            <span>Active accounts: <strong>{dashboardData?.users.active ?? 0}</strong></span>
            <span className="kpi-dot">·</span>
            <span>New (30d): <strong>{dashboardData?.users.newly_registered ?? 0}</strong></span>
          </div>
        </div>

        {/* KPI 2: Formulations Catalog */}
        <div className="admin-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-title">CERTIFIED FORMULATIONS</span>
            <div className="kpi-icon-wrap" style={{ background: "#f0f7f3", color: "#176b50" }}>
              <Package size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <strong className="kpi-number">
              {loading ? "..." : dashboardData?.products.total ?? 6}
            </strong>
          </div>
          <div className="kpi-detail-text">
            <span>Published: <strong>{dashboardData?.products.published ?? 6}</strong></span>
            <span className="kpi-dot">·</span>
            <span>Drafts: <strong>{dashboardData?.products.drafts ?? 0}</strong></span>
          </div>
        </div>

        {/* KPI 3: Commercial Inquiries */}
        <div className="admin-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-title">COMMERCIAL INQUIRIES</span>
            <div className="kpi-icon-wrap" style={{ background: "#fdf8ee", color: "#c6a66b" }}>
              <FileText size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <strong className="kpi-number">
              {loading ? "..." : dashboardData?.inquiries.total ?? 0}
            </strong>
          </div>
          <div className="kpi-detail-text">
            <span>Pending review: <strong style={{ color: "#d97706" }}>{dashboardData?.inquiries.pending ?? 0}</strong></span>
            <span className="kpi-dot">·</span>
            <span>Processed: <strong>{dashboardData?.inquiries.processed ?? 0}</strong></span>
          </div>
        </div>

        {/* KPI 4: B2B Procurement Orders */}
        <div className="admin-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-title">PROCUREMENT ORDERS</span>
            <div className="kpi-icon-wrap" style={{ background: "#e0f2fe", color: "#0284c7" }}>
              <ShoppingCart size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <strong className="kpi-number">
              {loading ? "..." : dashboardData?.orders.total ?? 0}
            </strong>
          </div>
          <div className="kpi-detail-text">
            <span>In review: <strong>{dashboardData?.orders.pending ?? 0}</strong></span>
            <span className="kpi-dot">·</span>
            <span>Confirmed: <strong>{dashboardData?.orders.confirmed ?? 0}</strong></span>
          </div>
        </div>

        {/* KPI 5: Active Pipeline Quotations */}
        <div className="admin-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-title">QUOTATIONS PIPELINE</span>
            <div className="kpi-icon-wrap" style={{ background: "#fef3c7", color: "#d97706" }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <strong className="kpi-number">
              ${(dashboardData?.quotations.total_pipeline_value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </strong>
          </div>
          <div className="kpi-detail-text">
            <span>Total quotes: <strong>{dashboardData?.quotations.total ?? 0}</strong></span>
            <span className="kpi-dot">·</span>
            <span>Accepted: <strong>{dashboardData?.quotations.accepted ?? 0}</strong></span>
          </div>
        </div>

        {/* KPI 6: Compliance Status */}
        <div className="admin-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-title">REGULATORY STANDING</span>
            <div className="kpi-icon-wrap" style={{ background: "#e8f4ee", color: "var(--primary)" }}>
              <ShieldCheck size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <strong className="kpi-number" style={{ fontSize: "22px", color: "var(--primary)" }}>
              100% COMPLIANT
            </strong>
          </div>
          <div className="kpi-detail-text">
            <span>WHO-GMP Validated</span>
            <span className="kpi-dot">·</span>
            <span>TBS Registered</span>
          </div>
        </div>
      </section>

      {/* Main Content Split: Recent Inquiries & Activity Feed */}
      <div className="admin-dashboard-split">
        {/* Left Column: Recent Commercial Inquiries */}
        <section className="admin-card admin-inquiries-card">
          <div className="admin-card-header">
            <div>
              <h3>Recent Commercial Supply Inquiries</h3>
              <p>Direct B2B procurement requests received via the customer and partner portal.</p>
            </div>
            <Link href="/contact" className="admin-view-all-link">
              <span>Test Submission</span>
              <ExternalLink size={14} />
            </Link>
          </div>

          <div className="admin-table-container">
            {dashboardData?.recent_inquiries && dashboardData.recent_inquiries.length > 0 ? (
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Partner / Organization</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Received</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.recent_inquiries.map((inq) => (
                    <tr key={inq.id}>
                      <td className="font-mono text-primary font-bold">
                        {inq.reference_id}
                      </td>
                      <td>
                        <strong>{inq.full_name}</strong>
                        {inq.organization && (
                          <small className="table-subtext">{inq.organization}</small>
                        )}
                      </td>
                      <td>
                        <span className="table-category-tag">{inq.enquiry_type}</span>
                      </td>
                      <td>
                        <span className={`table-status-pill ${inq.status.toLowerCase()}`}>
                          {inq.status}
                        </span>
                      </td>
                      <td className="text-muted text-sm">
                        {new Date(inq.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="admin-table-empty">
                <FileText size={32} color="var(--text-muted)" style={{ margin: "0 auto 10px" }} />
                <p>No commercial inquiries recorded yet. Submissions made via the contact form will appear here in real time.</p>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Security & Operational Activity Feed */}
        <section className="admin-card admin-activity-card">
          <div className="admin-card-header">
            <div>
              <h3>Security & Audit Log</h3>
              <p>Chronological authentication events.</p>
            </div>
            <Activity size={18} color="var(--primary)" />
          </div>

          <div className="admin-activity-list">
            {dashboardData?.recent_activity && dashboardData.recent_activity.length > 0 ? (
              dashboardData.recent_activity.map((ev) => (
                <div key={ev.id} className="admin-activity-item">
                  <div className="activity-icon-bubble">
                    <CheckCircle2 size={14} color="var(--primary)" />
                  </div>
                  <div className="activity-content">
                    <span className="activity-event-type">{ev.event_type}</span>
                    <p className="activity-desc">{ev.description}</p>
                    <small className="activity-time">
                      {new Date(ev.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {new Date(ev.timestamp).toLocaleDateString()}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: "center", padding: "30px 20px", color: "var(--text-muted)" }}>
                No events recorded.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Quick Access Tiles */}
      <section className="admin-quick-actions-bar">
        <div className="admin-quick-tile">
          <div>
            <strong>Formulation Dossiers</strong>
            <p>Access pharmaceutical specifications and regulatory documentation.</p>
          </div>
          <Link href="/products" className="quick-tile-btn">
            <span>View 28+ Products</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="admin-quick-tile">
          <div>
            <strong>Quality & Compliance</strong>
            <p>Inspect WHO-GMP standards and TBS analytical procedures.</p>
          </div>
          <Link href="/quality" className="quick-tile-btn">
            <span>Inspect Quality</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="admin-quick-tile">
          <div>
            <strong>Commercial Programs</strong>
            <p>Review hospital procurement tiers and distributor incentives.</p>
          </div>
          <Link href="/offers" className="quick-tile-btn">
            <span>Commercial Tiers</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}

