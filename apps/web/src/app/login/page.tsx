"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, Eye, EyeOff, ArrowRight, AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useAuthStore } from "@/lib/store/authStore";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/admin";
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg("Please provide both email address and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await login({ email, password, remember_me: rememberMe });
      // Redirect based on user role
      if (user.role === "admin" || user.role === "staff") {
        router.push(returnUrl);
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid authentication credentials.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleFillDemoAdmin() {
    setEmail("admin@primebyactivist.com");
    setPassword("PrimeAdmin@2026!");
    setErrorMsg(null);
  }

  return (
    <div className="auth-card-container">
      {/* Brand Logos */}
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
        <h2>Enterprise Portal Sign In</h2>
        <p>Access the unified administration hub, product dossiers, and commercial tracking.</p>
      </div>

      {errorMsg && (
        <div className="auth-alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <div className="form-group">
          <label htmlFor="login-email" className="form-label">
            Email Address
          </label>
          <div className="auth-input-wrap">
            <Mail size={17} className="auth-input-icon" aria-hidden="true" />
            <input
              id="login-email"
              type="email"
              required
              className="auth-input"
              placeholder="e.g. admin@primebyactivist.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="form-group">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label htmlFor="login-password" className="form-label">
              Password
            </label>
            <Link href="/forgot-password" className="auth-forgot-link">
              Forgot password?
            </Link>
          </div>
          <div className="auth-input-wrap">
            <Lock size={17} className="auth-input-icon" aria-hidden="true" />
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              required
              className="auth-input"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="auth-remember-row">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isSubmitting}
            />
            <span>Remember me for 7 days</span>
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
              <span>Verifying Credentials...</span>
            </>
          ) : (
            <>
              <span>Sign In to Portal</span>
              <ArrowRight size={17} />
            </>
          )}
        </button>

        {/* Demo Administrator Auto-Fill Button */}
        <div className="auth-demo-assist">
          <button
            type="button"
            onClick={handleFillDemoAdmin}
            className="auth-demo-btn"
          >
            <ShieldCheck size={14} />
            <span>Use Default Administrator Account</span>
          </button>
        </div>

        <div className="auth-footer-prompt">
          <span>Need a verified partner account?</span>{" "}
          <Link href="/register" className="auth-register-link">
            Register for partner access
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 auth-page-wrapper">
        <Suspense fallback={<div className="section"><div className="loading-state">Loading authentication portal...</div></div>}>
          <LoginForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
