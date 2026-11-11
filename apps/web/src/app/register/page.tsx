"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Mail, Lock, Globe, Building, Phone, ArrowRight, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { authApi } from "@/lib/api";

const ACCOUNT_TYPES = [
  "Individual Customer",
  "Pharmacy / Retailer",
  "Distributor",
  "Hospital / Institution",
  "Business Partner",
] as const;

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("");
  const [accountType, setAccountType] = useState<string>("Pharmacy / Retailer");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMsg("Please complete all required fields.");
      return;
    }

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    if (!consent) {
      setErrorMsg("You must accept the terms and privacy conditions.");
      return;
    }

    setIsSubmitting(true);

    try {
      await authApi.register({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        account_type: accountType,
        country: country.trim() || undefined,
        phone: phone.trim() || undefined,
        company_name: companyName.trim() || undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || "Unable to complete registration.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 auth-page-wrapper">
        <div className="auth-card-container" style={{ maxWidth: 540 }}>
          <div className="auth-card-logos">
            <div style={{ width: 44, height: 48 }}>
              <img
                src="/images/logo/prime-logo.png"
                alt="PRIME Healthcare"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
            <div style={{ width: 92, height: 44 }}>
              <img
                src="/images/logo/activist-logo.png"
                alt="Activist Quality Healthcare"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
          </div>

          <div className="auth-card-header">
            <h2>Partner & Customer Registration</h2>
            <p>Create an account to access verified pharmaceutical pricing, dossiers, and supply allocations.</p>
          </div>

          {success ? (
            <div className="contact-success-card" style={{ padding: 24, marginTop: 16 }}>
              <CheckCircle2 size={36} color="var(--primary)" style={{ margin: "0 auto 12px" }} />
              <h3>Registration Successful!</h3>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0 }}>
                Your account has been created. Redirecting you to the portal login...
              </p>
            </div>
          ) : (
            <>
              {errorMsg && (
                <div className="auth-alert-error" role="alert">
                  <AlertCircle size={18} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleRegister} className="auth-form" noValidate>
                <div className="form-group">
                  <label className="form-label">Full Name / Authorized Contact *</label>
                  <div className="auth-input-wrap">
                    <User size={17} className="auth-input-icon" />
                    <input
                      type="text"
                      required
                      className="auth-input"
                      placeholder="Dr. / Mr. / Ms. Full Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Business / Work Email *</label>
                  <div className="auth-input-wrap">
                    <Mail size={17} className="auth-input-icon" />
                    <input
                      type="email"
                      required
                      className="auth-input"
                      placeholder="contact@pharmacy-network.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Company / Facility Name</label>
                    <div className="auth-input-wrap">
                      <Building size={17} className="auth-input-icon" />
                      <input
                        type="text"
                        className="auth-input"
                        placeholder="Apex Medical Ltd"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone / WhatsApp Number</label>
                    <div className="auth-input-wrap">
                      <Phone size={17} className="auth-input-icon" />
                      <input
                        type="tel"
                        className="auth-input"
                        placeholder="+255 700 000 000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Account Category *</label>
                    <select
                      className="form-select"
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value)}
                      disabled={isSubmitting}
                    >
                      {ACCOUNT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Country / Region</label>
                    <div className="auth-input-wrap">
                      <Globe size={17} className="auth-input-icon" />
                      <input
                        type="text"
                        className="auth-input"
                        placeholder="Tanzania / Kenya / India..."
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Password *</label>
                    <div className="auth-input-wrap">
                      <Lock size={17} className="auth-input-icon" />
                      <input
                        type="password"
                        required
                        className="auth-input"
                        placeholder="Min 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Confirm Password *</label>
                    <div className="auth-input-wrap">
                      <Lock size={17} className="auth-input-icon" />
                      <input
                        type="password"
                        required
                        className="auth-input"
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>

                <div className="auth-remember-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      disabled={isSubmitting}
                    />
                    <span style={{ fontSize: 12.5 }}>
                      I agree to the PRIME by Activist commercial terms and data privacy policy.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="primary-button auth-submit-btn"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>

                <div className="auth-footer-prompt">
                  <span>Already have a partner account?</span>{" "}
                  <Link href="/login" className="auth-register-link">
                    Sign in to portal
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

