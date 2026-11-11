"use client";

import { useState, useEffect, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Send, CheckCircle2, AlertCircle, Loader2, Copy, Check, ShieldCheck } from "lucide-react";
import { enquiriesApi, extractErrorMessage } from "@/lib/api";
import { PartnerInquiry } from "@/types";

const ENQUIRY_TYPES = [
  "Product Enquiry",
  "Distributor Enquiry",
  "Institutional Supply",
  "Quality & Regulatory",
  "General Enquiry",
] as const;

export default function ContactForm() {
  const searchParams = useSearchParams();

  // Query parameter detection
  const typeParam = searchParams.get("type");
  const productParam = searchParams.get("product");
  const nameParam = searchParams.get("name");
  const subjectParam = searchParams.get("subject");
  const offerParam = searchParams.get("offer");

  // Determine initial enquiry type
  let initialType: (typeof ENQUIRY_TYPES)[number] = "General Enquiry";
  if (typeParam === "distributor") initialType = "Distributor Enquiry";
  else if (typeParam === "institutional") initialType = "Institutional Supply";
  else if (typeParam === "quality") initialType = "Quality & Regulatory";
  else if (typeParam === "product" || productParam) initialType = "Product Enquiry";

  // Determine initial subject
  let initialSubject = "";
  if (subjectParam) {
    initialSubject = subjectParam;
  } else if (productParam && nameParam) {
    initialSubject = `Commercial Supply: ${nameParam} (${productParam})`;
  } else if (productParam) {
    initialSubject = `Product Inquiry: SKU ${productParam}`;
  } else if (offerParam) {
    initialSubject = `Inquiry regarding Commercial Framework ${offerParam}`;
  }

  // Determine initial message
  let initialMessage = "";
  if (productParam && nameParam) {
    initialMessage = `We are interested in procuring batch allocations of ${nameParam} (SKU: ${productParam}). Please provide technical dossiers, minimum order quantities (MOQs), and commercial supply terms.`;
  }

  const [formData, setFormData] = useState<PartnerInquiry>({
    fullName: "",
    email: "",
    phone: "",
    country: "",
    organization: "",
    enquiryType: initialType,
    subject: initialSubject,
    message: initialMessage,
    consent: false,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    referenceId: string;
    timestamp: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync if query params change
  useEffect(() => {
    if (typeParam === "distributor") {
      setFormData((prev) => ({ ...prev, enquiryType: "Distributor Enquiry" }));
    } else if (typeParam === "quality") {
      setFormData((prev) => ({ ...prev, enquiryType: "Quality & Regulatory" }));
    } else if (typeParam === "institutional") {
      setFormData((prev) => ({ ...prev, enquiryType: "Institutional Supply" }));
    } else if (productParam) {
      setFormData((prev) => ({
        ...prev,
        enquiryType: "Product Enquiry",
        subject: prev.subject || (nameParam ? `Commercial Supply: ${nameParam} (${productParam})` : `SKU ${productParam}`),
      }));
    }
  }, [typeParam, productParam, nameParam]);

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      errors.fullName = "Please enter your full name (minimum 2 characters).";
    }

    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = "Please enter a valid business email address.";
    }

    if (!formData.country.trim()) {
      errors.country = "Please specify your country or territory.";
    }

    if (!formData.subject.trim() || formData.subject.trim().length < 3) {
      errors.subject = "Please provide an inquiry subject (minimum 3 characters).";
    }

    if (!formData.message.trim() || formData.message.trim().length < 10) {
      errors.message = "Please provide details about your inquiry (minimum 10 characters).";
    }

    if (!formData.consent) {
      errors.consent = "You must acknowledge data privacy and consent terms.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmissionError(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const data = await enquiriesApi.submitEnquiry(formData);
      setSubmissionSuccess({
        referenceId: data.referenceId,
        timestamp: data.timestamp,
      });
    } catch (err: any) {
      setSubmissionError(extractErrorMessage(err, "Failed to submit commercial inquiry. Please verify your connection or try again later."));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCopyReference() {
    if (!submissionSuccess) return;
    navigator.clipboard.writeText(submissionSuccess.referenceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleResetForm() {
    setFormData({
      fullName: "",
      email: "",
      phone: "",
      country: "",
      organization: "",
      enquiryType: "General Enquiry",
      subject: "",
      message: "",
      consent: false,
    });
    setFieldErrors({});
    setSubmissionSuccess(null);
    setSubmissionError(null);
  }

  if (submissionSuccess) {
    return (
      <div className="contact-success-card" role="alert" aria-live="polite">
        <div className="contact-success-icon">
          <CheckCircle2 size={40} color="var(--primary)" />
        </div>

        <h3>Inquiry Registered Successfully</h3>
        <p className="contact-success-desc">
          Thank you for reaching out to PRIME by Activist. Your commercial inquiry has been logged with our international healthcare partnerships desk.
        </p>

        <div className="contact-ref-box">
          <span className="contact-ref-label">Official Reference Code:</span>
          <div className="contact-ref-row">
            <strong className="contact-ref-code">{submissionSuccess.referenceId}</strong>
            <button
              type="button"
              className="contact-copy-btn"
              onClick={handleCopyReference}
              aria-label="Copy reference code"
            >
              {copied ? <Check size={16} color="var(--primary)" /> : <Copy size={16} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>

        <div className="contact-next-steps">
          <h4>Next Steps:</h4>
          <ul>
            <li>Our regulatory and trade desk will review your inquiry within 1–2 business days.</li>
            <li>A commercial representative will contact you via email at <strong>{formData.email}</strong>.</li>
            <li>Keep your reference code handy for subsequent correspondence.</li>
          </ul>
        </div>

        <button
          type="button"
          onClick={handleResetForm}
          className="secondary-button"
          style={{ marginTop: "24px" }}
        >
          Submit Another Inquiry
        </button>
      </div>
    );
  }

  return (
    <form className="contact-form-container" onSubmit={handleSubmit} noValidate>
      <div className="form-heading">
        <h3>Initiate Corporate Inquiry</h3>
        <p>Please complete the fields below to connect with our partnerships team.</p>
      </div>

      {submissionError && (
        <div className="form-alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{submissionError}</span>
        </div>
      )}

      {/* Full Name & Organization */}
      <div className="form-grid-2">
        <div className="form-group">
          <label htmlFor="fullName" className="form-label">
            Full Name <span className="req">*</span>
          </label>
          <input
            id="fullName"
            type="text"
            className={`form-input ${fieldErrors.fullName ? "error" : ""}`}
            placeholder="Dr. / Mr. / Ms. Full Name"
            value={formData.fullName}
            onChange={(e) => {
              setFormData({ ...formData, fullName: e.target.value });
              if (fieldErrors.fullName) setFieldErrors({ ...fieldErrors, fullName: "" });
            }}
            aria-required="true"
            aria-invalid={!!fieldErrors.fullName}
          />
          {fieldErrors.fullName && <span className="form-error-msg">{fieldErrors.fullName}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="organization" className="form-label">
            Organization / Hospital / Pharmacy
          </label>
          <input
            id="organization"
            type="text"
            className="form-input"
            placeholder="Company or Medical Group name"
            value={formData.organization}
            onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
          />
        </div>
      </div>

      {/* Email & Phone */}
      <div className="form-grid-2">
        <div className="form-group">
          <label htmlFor="email" className="form-label">
            Business Email <span className="req">*</span>
          </label>
          <input
            id="email"
            type="email"
            className={`form-input ${fieldErrors.email ? "error" : ""}`}
            placeholder="name@healthcare-network.com"
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: "" });
            }}
            aria-required="true"
            aria-invalid={!!fieldErrors.email}
          />
          {fieldErrors.email && <span className="form-error-msg">{fieldErrors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="phone" className="form-label">
            Telephone / Mobile Number
          </label>
          <input
            id="phone"
            type="tel"
            className="form-input"
            placeholder="+255 ... / +91 ..."
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
      </div>

      {/* Country & Enquiry Type */}
      <div className="form-grid-2">
        <div className="form-group">
          <label htmlFor="country" className="form-label">
            Country / Operating Region <span className="req">*</span>
          </label>
          <input
            id="country"
            type="text"
            className={`form-input ${fieldErrors.country ? "error" : ""}`}
            placeholder="e.g. Tanzania, Kenya, India, USA..."
            value={formData.country}
            onChange={(e) => {
              setFormData({ ...formData, country: e.target.value });
              if (fieldErrors.country) setFieldErrors({ ...fieldErrors, country: "" });
            }}
            aria-required="true"
            aria-invalid={!!fieldErrors.country}
          />
          {fieldErrors.country && <span className="form-error-msg">{fieldErrors.country}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="enquiryType" className="form-label">
            Enquiry Category <span className="req">*</span>
          </label>
          <select
            id="enquiryType"
            className="form-select"
            value={formData.enquiryType}
            onChange={(e) =>
              setFormData({ ...formData, enquiryType: e.target.value as any })
            }
          >
            {ENQUIRY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Subject */}
      <div className="form-group">
        <label htmlFor="subject" className="form-label">
          Inquiry Subject <span className="req">*</span>
        </label>
        <input
          id="subject"
          type="text"
          className={`form-input ${fieldErrors.subject ? "error" : ""}`}
          placeholder="e.g. Regional distribution inquiry for solid orals..."
          value={formData.subject}
          onChange={(e) => {
            setFormData({ ...formData, subject: e.target.value });
            if (fieldErrors.subject) setFieldErrors({ ...fieldErrors, subject: "" });
          }}
          aria-required="true"
          aria-invalid={!!fieldErrors.subject}
        />
        {fieldErrors.subject && <span className="form-error-msg">{fieldErrors.subject}</span>}
      </div>

      {/* Message */}
      <div className="form-group">
        <label htmlFor="message" className="form-label">
          Detailed Requirements / Message <span className="req">*</span>
        </label>
        <textarea
          id="message"
          rows={5}
          className={`form-textarea ${fieldErrors.message ? "error" : ""}`}
          placeholder="Please specify target formulations, estimated batch volumes, delivery timeline, or required regulatory documentation..."
          value={formData.message}
          onChange={(e) => {
            setFormData({ ...formData, message: e.target.value });
            if (fieldErrors.message) setFieldErrors({ ...fieldErrors, message: "" });
          }}
          aria-required="true"
          aria-invalid={!!fieldErrors.message}
        />
        {fieldErrors.message && <span className="form-error-msg">{fieldErrors.message}</span>}
      </div>

      {/* Consent Checkbox */}
      <div className="form-group-checkbox">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.consent}
            onChange={(e) => {
              setFormData({ ...formData, consent: e.target.checked });
              if (fieldErrors.consent) setFieldErrors({ ...fieldErrors, consent: "" });
            }}
            aria-required="true"
            aria-invalid={!!fieldErrors.consent}
          />
          <span className="checkbox-text">
            I confirm that I am an authorized representative of my organization and consent to PRIME by Activist processing this business information for commercial evaluation.
          </span>
        </label>
        {fieldErrors.consent && <span className="form-error-msg">{fieldErrors.consent}</span>}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="primary-button form-submit-btn"
      >
        {isSubmitting ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Submitting Inquiry...</span>
          </>
        ) : (
          <>
            <span>Submit Corporate Inquiry</span>
            <Send size={16} />
          </>
        )}
      </button>
    </form>
  );
}

