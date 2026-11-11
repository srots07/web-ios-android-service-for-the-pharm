"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileCheck,
  ShieldCheck,
  ArrowRight,
  Layers,
  Globe2,
  Building,
  Users,
  Package,
  ShoppingCart,
  FileText,
  Shield,
  Loader2,
} from "lucide-react";
import { dashboardApi, DashboardSummary } from "@/lib/api";

export default function AdminOverviewPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .getSummary()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <h2>Operational Overview</h2>
          <p>Live status and high-level platform summary of the PRIME by Activist pharmaceutical ecosystem.</p>
        </div>
      </div>

      {/* Hub Alliance Summary Card */}
      <div className="admin-card" style={{ padding: "32px", marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", marginBottom: "20px" }}>
          <div style={{ padding: "12px", background: "#e8f4ee", borderRadius: "10px", color: "var(--primary)" }}>
            <ShieldCheck size={26} />
          </div>
          <div>
            <h3 style={{ fontSize: 18, margin: "0 0 6px" }}>3-Nation Cross-Border Health Alliance</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0, lineHeight: 1.6 }}>
              Centralized platform coordination uniting United States R&D, Indian WHO-GMP manufacturing facilities, and East African regulatory distribution corridors.
            </p>
          </div>
        </div>

        <div className="hubs-grid" style={{ margin: "24px 0 0" }}>
          <div className="hub-card" style={{ background: "#f8faf9" }}>
            <span className="hub-location">Delaware, USA</span>
            <strong style={{ fontSize: 16 }}>Formulation Research Hub</strong>
            <p className="hub-desc">Ingredient optimization, bioavailability testing, and global patent clearance.</p>
          </div>
          <div className="hub-card" style={{ background: "#f8faf9" }}>
            <span className="hub-location">Mumbai, India</span>
            <strong style={{ fontSize: 16 }}>WHO-GMP Manufacturing</strong>
            <p className="hub-desc">Cleanroom production lines for solid orals, liquid syrups, and gelatin softgels.</p>
          </div>
          <div className="hub-card" style={{ background: "#f8faf9" }}>
            <span className="hub-location">Dar es Salaam, Tanzania</span>
            <strong style={{ fontSize: 16 }}>Regional Distribution HQ</strong>
            <p className="hub-desc">TBS product certification, clinical supply, and pharmacy network logistics.</p>
          </div>
        </div>
      </div>

      {/* Active Management Modules with Real Database Counts */}
      <div className="admin-card" style={{ padding: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 17, margin: "0 0 4px" }}>Active Management Modules</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>
              Database-backed administrative workflows operating with real PostgreSQL persistence.
            </p>
          </div>
          {loading && <Loader2 size={16} className="animate-spin text-emerald-600" />}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <Link
            href="/admin/users"
            className="rounded-xl border border-border p-4 hover:border-emerald-600 transition-colors block"
            style={{ background: "#fcfdfc" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                Identity Access
              </span>
              <Users size={16} color="var(--primary)" />
            </div>
            <strong style={{ fontSize: 24, display: "block", margin: "10px 0 4px" }}>
              {loading ? "..." : data?.users.total ?? 0}
            </strong>
            <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
              Active user accounts & roles
            </span>
          </Link>

          <Link
            href="/admin/products"
            className="rounded-xl border border-border p-4 hover:border-emerald-600 transition-colors block"
            style={{ background: "#fcfdfc" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                Formulations
              </span>
              <Package size={16} color="#176b50" />
            </div>
            <strong style={{ fontSize: 24, display: "block", margin: "10px 0 4px" }}>
              {loading ? "..." : data?.products.total ?? 0}
            </strong>
            <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
              {data?.products.published ?? 0} published to catalogue
            </span>
          </Link>

          <Link
            href="/admin/orders"
            className="rounded-xl border border-border p-4 hover:border-emerald-600 transition-colors block"
            style={{ background: "#fcfdfc" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                Procurement
              </span>
              <ShoppingCart size={16} color="#0284c7" />
            </div>
            <strong style={{ fontSize: 24, display: "block", margin: "10px 0 4px" }}>
              {loading ? "..." : data?.orders.total ?? 0}
            </strong>
            <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
              B2B institutional orders
            </span>
          </Link>

          <Link
            href="/admin/quotations"
            className="rounded-xl border border-border p-4 hover:border-emerald-600 transition-colors block"
            style={{ background: "#fcfdfc" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                Commercial Deals
              </span>
              <FileText size={16} color="#c6a66b" />
            </div>
            <strong style={{ fontSize: 24, display: "block", margin: "10px 0 4px" }}>
              {loading ? "..." : data?.quotations.total ?? 0}
            </strong>
            <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
              Formal batch price proformas
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
