"use client";

import { useEffect, useState } from "react";
import { Activity, CheckCircle2, ShieldCheck, RefreshCw } from "lucide-react";
import { dashboardApi } from "@/lib/api";

export default function AdminActivityPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadActivity() {
    setLoading(true);
    try {
      const data = await dashboardApi.getSummary();
      setEvents(data.recent_activity || []);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActivity();
  }, []);

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <h2>Security & Operational Activity</h2>
          <p>Chronological audit log tracking administrative sessions, registrations, and inquiries.</p>
        </div>
        <button
          type="button"
          onClick={loadActivity}
          className="secondary-button"
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="admin-card" style={{ padding: "28px" }}>
        <div className="admin-activity-list">
          {events.length > 0 ? (
            events.map((ev) => (
              <div key={ev.id} className="admin-activity-item" style={{ padding: "14px 0" }}>
                <div className="activity-icon-bubble">
                  <CheckCircle2 size={16} color="var(--primary)" />
                </div>
                <div className="activity-content">
                  <span className="activity-event-type">{ev.event_type}</span>
                  <p className="activity-desc" style={{ fontSize: 14.5 }}>{ev.description}</p>
                  <small className="activity-time">
                    {new Date(ev.timestamp).toLocaleString()}
                  </small>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
              No audit records currently available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

