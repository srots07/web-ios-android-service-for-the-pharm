"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, FileText, CheckCircle2, ArrowRight } from "lucide-react";
import { dashboardApi } from "@/lib/api";

export default function AdminNotificationsPage() {
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .getSummary()
      .then((data) => {
        setInquiries(data.recent_inquiries || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <h2>System Notifications & Alerts</h2>
          <p>Real-time notifications generated from pending commercial inquiries and compliance alerts.</p>
        </div>
      </div>

      <div className="admin-card" style={{ padding: "28px" }}>
        {inquiries.length > 0 ? (
          <div style={{ display: "grid", gap: "16px" }}>
            {inquiries.map((inq) => (
              <div
                key={inq.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  padding: "16px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  background: inq.status === "Pending" ? "#fbfdfc" : "var(--bg-surface)",
                }}
              >
                <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "#e8f4ee",
                      color: "var(--primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <FileText size={18} />
                  </div>
                  <div>
                    <strong style={{ fontSize: 14.5, display: "block" }}>
                      New Inquiry: {inq.reference_id} ({inq.enquiry_type})
                    </strong>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0" }}>
                      From {inq.full_name} {inq.organization ? `(${inq.organization})` : ""}: {inq.subject}
                    </p>
                    <small style={{ color: "var(--text-muted)", fontSize: 11.5 }}>
                      Logged on {new Date(inq.created_at).toLocaleString()}
                    </small>
                  </div>
                </div>

                <span className={`table-status-pill ${inq.status.toLowerCase()}`}>
                  {inq.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <Bell size={36} color="var(--text-muted)" style={{ margin: "0 auto 12px" }} />
            <h3 style={{ fontSize: 17, margin: "0 0 6px" }}>No Unread Notifications</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: 13.5, margin: 0 }}>
              All commercial inquiries and regulatory events are currently up to date.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

