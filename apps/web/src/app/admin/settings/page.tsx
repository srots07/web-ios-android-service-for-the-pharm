"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Key,
  Database,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Save,
  RefreshCw,
  Building2,
  Mail,
  Phone,
  DollarSign,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { authApi, settingsApi } from "@/lib/api";
import { PlatformSettingItem } from "@/lib/api/types";
import { useAuthStore } from "@/lib/store/authStore";
import { FormField, TextInput, SelectInput, FormActions, FormError } from "@/components/forms";

export default function AdminSettingsPage() {
  const router = useRouter();

  // Settings State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form values mapped from platform settings
  const [companyName, setCompanyName] = useState("PRIME by Activist");
  const [supportEmail, setSupportEmail] = useState("support@primebyactivist.com");
  const [supportPhone, setSupportPhone] = useState("+255 22 211 0000");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [quoteValidityDays, setQuoteValidityDays] = useState("30");
  const [orderNotificationEmail, setOrderNotificationEmail] = useState("orders@primebyactivist.com");
  const [maintenanceMode, setMaintenanceMode] = useState("false");

  // Revocation State
  const [revoking, setRevoking] = useState(false);
  const [revokeMsg, setRevokeMsg] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setError(null);
    try {
      const res = await settingsApi.get();
      const map: Record<string, string> = {};
      res.items.forEach((item) => {
        map[item.key] = item.value;
      });

      if (map["company_name"]) setCompanyName(map["company_name"]);
      if (map["support_email"]) setSupportEmail(map["support_email"]);
      if (map["support_phone"]) setSupportPhone(map["support_phone"]);
      if (map["default_currency"]) setDefaultCurrency(map["default_currency"]);
      if (map["quote_validity_days"]) setQuoteValidityDays(map["quote_validity_days"]);
      if (map["order_notification_email"]) setOrderNotificationEmail(map["order_notification_email"]);
      if (map["maintenance_mode"]) setMaintenanceMode(map["maintenance_mode"]);
    } catch (err: any) {
      setError(err?.message || "Failed to load platform settings from database.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await settingsApi.update({
        company_name: companyName,
        support_email: supportEmail,
        support_phone: supportPhone,
        default_currency: defaultCurrency,
        quote_validity_days: quoteValidityDays,
        order_notification_email: orderNotificationEmail,
        maintenance_mode: maintenanceMode,
      });
      setSuccessMsg("Platform settings updated and persisted successfully to database.");
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err?.message || "Failed to save platform settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoutAll() {
    setRevoking(true);
    setRevokeMsg(null);

    try {
      await authApi.logoutAll();
      useAuthStore.getState().logout();
      setRevokeMsg("All active device sessions have been revoked. Redirecting to login...");
      setTimeout(() => {
        router.replace("/login");
      }, 2000);
    } catch {
      setRevokeMsg("Failed to revoke sessions. Please try again.");
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <h2>Platform Configuration & Enterprise Settings</h2>
          <p>Database-persisted platform parameters, workflow configurations, and cryptographic security posture.</p>
        </div>
      </div>

      {successMsg && (
        <div className="commercial-notice-box" style={{ marginBottom: 20 }}>
          <CheckCircle2 size={18} color="var(--primary)" />
          <p>{successMsg}</p>
        </div>
      )}

      {error && <FormError error={error} />}

      <div style={{ display: "grid", gap: 28, maxWidth: 880 }}>
        {/* Card 1: Editable Platform Parameters */}
        <div className="admin-card" style={{ padding: 28 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 20 }}>
            <Sliders size={22} color="var(--primary)" />
            <div>
              <h3 style={{ fontSize: 17, margin: 0 }}>Business & Workflow Settings</h3>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
                These parameters govern quotation defaults, administrative alerts, and public platform metadata.
              </p>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: "30px 0", textAlign: "center", color: "var(--text-secondary)" }}>
              <RefreshCw size={22} className="animate-spin" style={{ margin: "0 auto 10px", display: "block" }} />
              Loading database settings...
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} style={{ display: "grid", gap: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <FormField label="Enterprise Platform Name" required>
                  <TextInput
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="PRIME by Activist"
                    disabled={saving}
                  />
                </FormField>

                <FormField label="Default Commercial Currency" required>
                  <SelectInput
                    value={defaultCurrency}
                    onChange={(e) => setDefaultCurrency(e.target.value)}
                    options={[
                      { value: "USD", label: "USD ($) - US Dollars" },
                      { value: "EUR", label: "EUR (€) - Euros" },
                      { value: "GBP", label: "GBP (£) - British Pounds" },
                      { value: "TZS", label: "TZS - Tanzanian Shilling" },
                      { value: "KES", label: "KES - Kenyan Shilling" },
                      { value: "INR", label: "INR (₹) - Indian Rupee" },
                    ]}
                    disabled={saving}
                  />
                </FormField>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <FormField label="Official Support Email" required>
                  <TextInput
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    placeholder="support@primebyactivist.com"
                    disabled={saving}
                  />
                </FormField>

                <FormField label="Official Support Phone" required>
                  <TextInput
                    value={supportPhone}
                    onChange={(e) => setSupportPhone(e.target.value)}
                    placeholder="+255 22 211 0000"
                    disabled={saving}
                  />
                </FormField>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <FormField label="Quotation Validity (Days)" required hint="Default expiry duration applied to new commercial quotations">
                  <TextInput
                    type="number"
                    value={quoteValidityDays}
                    onChange={(e) => setQuoteValidityDays(e.target.value)}
                    placeholder="30"
                    disabled={saving}
                  />
                </FormField>

                <FormField label="Order Notification Routing Email" required hint="Admin desk inbox notified when new orders or inquiries arrive">
                  <TextInput
                    type="email"
                    value={orderNotificationEmail}
                    onChange={(e) => setOrderNotificationEmail(e.target.value)}
                    placeholder="orders@primebyactivist.com"
                    disabled={saving}
                  />
                </FormField>
              </div>

              <FormField label="Platform Maintenance Mode" hint="When active, public catalogues show maintenance notifications">
                <SelectInput
                  value={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.value)}
                  options={[
                    { value: "false", label: "Disabled (Normal Operational Mode)" },
                    { value: "true", label: "Enabled (System Maintenance Active)" },
                  ]}
                  disabled={saving}
                />
              </FormField>

              <FormActions
                submitLabel={saving ? "Saving Changes..." : "Save Settings"}
                loading={saving}
              />
            </form>
          )}
        </div>

        {/* Card 2: Cryptographic Parameters */}
        <div className="admin-card" style={{ padding: 28 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 16 }}>
            <Key size={22} color="var(--primary)" />
            <h3 style={{ fontSize: 17, margin: 0 }}>Cryptographic & JWT Parameters</h3>
          </div>
          <div className="modal-specs-table" style={{ margin: 0 }}>
            <div className="modal-spec-row">
              <span className="modal-spec-label">Signing Algorithm</span>
              <span className="modal-spec-value">HMAC-SHA256 (HS256)</span>
            </div>
            <div className="modal-spec-row">
              <span className="modal-spec-label">Access Token Lifetime</span>
              <span className="modal-spec-value">60 Minutes</span>
            </div>
            <div className="modal-spec-row">
              <span className="modal-spec-label">Refresh Token Rotation</span>
              <span className="modal-spec-value" style={{ color: "var(--primary)" }}>
                Enabled (SHA-256 Hash Stored in Database)
              </span>
            </div>
            <div className="modal-spec-row">
              <span className="modal-spec-label">Cookie Protection</span>
              <span className="modal-spec-value">HttpOnly, SameSite=Lax</span>
            </div>
          </div>
        </div>

        {/* Card 3: Database Engine */}
        <div className="admin-card" style={{ padding: 28 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 16 }}>
            <Database size={22} color="var(--primary)" />
            <h3 style={{ fontSize: 17, margin: 0 }}>Database & Persistence Engine</h3>
          </div>
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 16px" }}>
            The FastAPI backend uses SQLAlchemy 2.0 with asynchronous connection pooling. Tables for users, rotating sessions, products, documents, commercial inquiries, orders, quotations, and audit events are active and migrated.
          </p>
          <div className="modal-specs-table" style={{ margin: 0 }}>
            <div className="modal-spec-row">
              <span className="modal-spec-label">ORM Layer</span>
              <span className="modal-spec-value">SQLAlchemy 2.0 Async</span>
            </div>
            <div className="modal-spec-row">
              <span className="modal-spec-label">Schema Migrations</span>
              <span className="modal-spec-value">Alembic (Target: 54132424bde8)</span>
            </div>
            <div className="modal-spec-row">
              <span className="modal-spec-label">Audit Logging</span>
              <span className="modal-spec-value">Active (audit_events with resource tracking)</span>
            </div>
          </div>
        </div>

        {/* Card 4: Session Revocation */}
        <div className="admin-card" style={{ padding: 28, borderColor: "#fed7d7" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 12 }}>
            <LogOut size={22} color="#c53030" />
            <h3 style={{ fontSize: 17, margin: 0, color: "#c53030" }}>Global Session Revocation</h3>
          </div>
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 16px" }}>
            Revoke all active device sessions across mobile and web interfaces. This will immediately invalidate existing refresh tokens in the database and require re-authentication.
          </p>

          {revokeMsg && (
            <div className="commercial-notice-box" style={{ marginBottom: 16 }}>
              <AlertCircle size={18} color="#c53030" />
              <p>{revokeMsg}</p>
            </div>
          )}

          <button
            type="button"
            className="destructive-button"
            onClick={handleLogoutAll}
            disabled={revoking}
          >
            {revoking ? "Revoking Sessions..." : "Sign Out of All Devices"}
          </button>
        </div>
      </div>
    </div>
  );
}
