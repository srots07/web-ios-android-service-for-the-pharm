"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Building,
  Key,
  Mail,
  ShoppingCart,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  ArrowRight,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useAuthStore } from "@/lib/store/authStore";
import { authApi } from "@/lib/api";
import {
  FormField,
  TextInput,
  TextArea,
  FormActions,
  FormError,
  StatusBadge,
  LoadingState,
  EmptyState,
} from "@/components/forms";

export default function CustomerProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, init: initAuth } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"profile" | "security" | "enquiries" | "orders" | "quotations">("profile");

  // Profile form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Security form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  // Customer isolated records
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login?returnUrl=/profile");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setPhone(user.phone || "");
      setCountry(user.country || "");
      setCompanyName(user.company_name || "");
      setBusinessAddress(user.business_address || "");
    }
  }, [user]);

  // Load customer records when tab switches
  useEffect(() => {
    if (!user) return;
    if (activeTab === "enquiries") {
      setRecordsLoading(true);
      authApi.getCustomerEnquiries()
        .then(setEnquiries)
        .catch(() => {})
        .finally(() => setRecordsLoading(false));
    } else if (activeTab === "orders") {
      setRecordsLoading(true);
      authApi.getCustomerOrders()
        .then(setOrders)
        .catch(() => {})
        .finally(() => setRecordsLoading(false));
    } else if (activeTab === "quotations") {
      setRecordsLoading(true);
      authApi.getCustomerQuotations()
        .then(setQuotations)
        .catch(() => {})
        .finally(() => setRecordsLoading(false));
    }
  }, [activeTab, user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      const updated = await authApi.updateProfile({
        full_name: fullName,
        phone,
        country,
        company_name: companyName,
        business_address: businessAddress,
      });
      useAuthStore.getState().setUser(updated);
      setProfileSuccess("Personal and company information updated successfully.");
    } catch (err: any) {
      setProfileError(err.message || "Failed to update profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwSaving(true);
    setPwSuccess(null);
    setPwError(null);

    if (newPassword.length < 8) {
      setPwError("New password must be at least 8 characters long.");
      setPwSaving(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match.");
      setPwSaving(false);
      return;
    }

    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPwSuccess("Your account password has been updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwError(err.message || "Password change failed.");
    } finally {
      setPwSaving(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center p-12">
          <LoadingState message="Verifying authentication session..." />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 sm:px-6 sm:py-12">
        {/* Header Profile Summary */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-linear-to-br from-emerald-800 to-emerald-950 text-white flex items-center justify-center text-2xl font-bold shadow-md">
              {(user.full_name || "C").charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">{user.full_name}</h1>
                <StatusBadge status={user.role === "admin" ? "Admin" : "Verified Customer"} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
              {user.company_name && (
                <p className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  {user.company_name}
                </p>
              )}
            </div>
          </div>
          <div className="text-xs text-muted-foreground sm:text-right">
            <div>Member since: {new Date(user.created_at).toLocaleDateString()}</div>
            <div className="mt-0.5">Account ID: <span className="font-mono text-[11px]">{user.id.slice(0, 8)}...</span></div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border mb-6 gap-2 overflow-x-auto">
          {[
            { id: "profile", label: "Company & Profile", icon: User },
            { id: "security", label: "Account Security", icon: Key },
            { id: "enquiries", label: "My Enquiries", icon: Mail },
            { id: "orders", label: "My Orders", icon: ShoppingCart },
            { id: "quotations", label: "My Quotations", icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? "border-emerald-700 text-emerald-700 font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Profile & Company Details */}
        {activeTab === "profile" && (
          <div className="max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-bold text-foreground mb-1">Company & Personal Information</h2>
            <p className="text-xs text-muted-foreground mb-6">
              Keep your contact and institutional procurement details up to date for batch allocations.
            </p>

            {profileSuccess && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200 mb-4">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{profileSuccess}</span>
              </div>
            )}
            {profileError && <FormError error={profileError} onDismiss={() => setProfileError(null)} className="mb-4" />}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <FormField label="Official Email" hint="Managed by security authority">
                <TextInput value={user.email} disabled className="bg-muted cursor-not-allowed font-mono text-xs" />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Full Contact Name" required>
                  <TextInput
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </FormField>

                <FormField label="Direct Telephone / Mobile">
                  <TextInput
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Company / Institution Name">
                  <TextInput
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Apollo Healthcare Ltd"
                  />
                </FormField>

                <FormField label="Operating Country / Jurisdiction">
                  <TextInput
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. India"
                  />
                </FormField>
              </div>

              <FormField label="Business Delivery Address" hint="CIF/FOB dispatch destination">
                <TextArea
                  rows={3}
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  placeholder="Street, City, Postal Code, State/Province..."
                />
              </FormField>

              <FormActions
                submitLabel="Save Changes"
                loading={profileSaving}
              />
            </form>
          </div>
        )}

        {/* Tab 2: Security & Password */}
        {activeTab === "security" && (
          <div className="max-w-md rounded-2xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-bold text-foreground mb-1">Change Account Password</h2>
            <p className="text-xs text-muted-foreground mb-6">
              Ensure your password contains at least 8 characters with numbers and symbols.
            </p>

            {pwSuccess && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200 mb-4">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{pwSuccess}</span>
              </div>
            )}
            {pwError && <FormError error={pwError} onDismiss={() => setPwError(null)} className="mb-4" />}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <FormField label="Current Password" required>
                <TextInput
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </FormField>

              <FormField label="New Password (min 8 chars)" required>
                <TextInput
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </FormField>

              <FormField label="Confirm New Password" required>
                <TextInput
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </FormField>

              <FormActions
                submitLabel="Update Password"
                loading={pwSaving}
              />
            </form>
          </div>
        )}

        {/* Tab 3: Customer Enquiries */}
        {activeTab === "enquiries" && (
          <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">Submitted Product Inquiries</h3>
              <p className="text-xs text-muted-foreground">Historical enquiries associated with your account.</p>
            </div>
            {recordsLoading ? (
              <LoadingState message="Loading your enquiries..." />
            ) : enquiries.length === 0 ? (
              <EmptyState
                icon={Mail}
                title="No inquiries logged yet"
                description="When you submit an enquiry through our contact or product pages, it will appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground font-semibold">
                    <tr>
                      <th className="px-4 py-3">Reference</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {enquiries.map((inq) => (
                      <tr key={inq.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-xs font-bold text-emerald-700">
                          {inq.reference_id}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">{inq.subject}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{inq.enquiry_type}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={inq.status} />
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(inq.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Customer Orders */}
        {activeTab === "orders" && (
          <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">Procurement Orders</h3>
              <p className="text-xs text-muted-foreground">Active and delivered institutional orders.</p>
            </div>
            {recordsLoading ? (
              <LoadingState message="Loading your orders..." />
            ) : orders.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title="No procurement orders placed"
                description="Your approved commercial procurement orders will be tracked here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground font-semibold">
                    <tr>
                      <th className="px-4 py-3">Order Number</th>
                      <th className="px-4 py-3">Items</th>
                      <th className="px-4 py-3">Estimated Total</th>
                      <th className="px-4 py-3">Delivery Terms</th>
                      <th className="px-4 py-3">Lifecycle Status</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-xs font-bold text-emerald-700">
                          {o.order_number}
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground font-medium">{o.items_count} items</td>
                        <td className="px-4 py-3 text-xs font-semibold text-foreground">{o.total_estimated_amount || "N/A"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{o.delivery_terms || "CIF Port"}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={o.status} />
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(o.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Customer Quotations */}
        {activeTab === "quotations" && (
          <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">Formal Commercial Quotations</h3>
              <p className="text-xs text-muted-foreground">Proforma invoices and price commitments issued to your organization.</p>
            </div>
            {recordsLoading ? (
              <LoadingState message="Loading quotations..." />
            ) : quotations.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No quotations currently active"
                description="Quotations issued following an inquiry will be accessible here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground font-semibold">
                    <tr>
                      <th className="px-4 py-3">Quotation Number</th>
                      <th className="px-4 py-3">Items</th>
                      <th className="px-4 py-3">Total Amount</th>
                      <th className="px-4 py-3">Valid Until</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {quotations.map((q) => (
                      <tr key={q.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-xs font-bold text-emerald-700">
                          {q.quotation_number}
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground">{q.items_count} lines</td>
                        <td className="px-4 py-3 text-xs font-bold text-foreground">
                          {q.currency} {Number(q.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(q.valid_until).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={q.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

