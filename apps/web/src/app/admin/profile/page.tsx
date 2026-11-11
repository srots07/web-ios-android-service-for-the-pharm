"use client";

import { useEffect } from "react";
import { User, Mail, ShieldCheck, Calendar, Clock } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";

export default function AdminProfilePage() {
  const user = useAuthStore((s) => s.user);
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <h2>Administrator Profile</h2>
          <p>Verified identity and permissions for the active administrative session.</p>
        </div>
      </div>

      <div className="admin-card" style={{ padding: "36px", maxWidth: 720 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28, paddingBottom: 24, borderBottom: "1px solid var(--border-subtle)" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #104b39, #176b50)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              fontWeight: 800,
            }}
          >
            {(user?.full_name || "A").charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 style={{ fontSize: 20, margin: "0 0 4px" }}>{user?.full_name}</h3>
            <span className="table-category-tag" style={{ background: "#e8f4ee", color: "var(--primary)" }}>
              {user?.role.toUpperCase()} · {user?.account_type}
            </span>
          </div>
        </div>

        <div className="modal-specs-table" style={{ margin: 0 }}>
          <div className="modal-spec-row">
            <span className="modal-spec-label">User Identifier (UUID)</span>
            <span className="modal-spec-value font-mono">{user?.id}</span>
          </div>
          <div className="modal-spec-row">
            <span className="modal-spec-label">Official Email</span>
            <span className="modal-spec-value">{user?.email}</span>
          </div>
          <div className="modal-spec-row">
            <span className="modal-spec-label">Account Status</span>
            <span className="modal-spec-value" style={{ color: "var(--primary)" }}>
              Active & Verified
            </span>
          </div>
          <div className="modal-spec-row">
            <span className="modal-spec-label">Member Since</span>
            <span className="modal-spec-value">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Active"}
            </span>
          </div>
          <div className="modal-spec-row">
            <span className="modal-spec-label">Last Authentication</span>
            <span className="modal-spec-value">
              {user?.last_login_at ? new Date(user.last_login_at).toLocaleString() : "Current session"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

