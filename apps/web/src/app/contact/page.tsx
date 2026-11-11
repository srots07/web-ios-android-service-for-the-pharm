import { Suspense } from "react";
import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PageHero from "@/components/ui/PageHero";
import ContactForm from "./ContactForm";
import { Mail, Phone, MapPin, Clock, Globe2, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us & Business Inquiries | PRIME by Activist",
  description:
    "Connect with our pharmaceutical partnerships team for distribution agreements, hospital supply tenders, quality documentation, or corporate inquiries.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main className="flex-1" id="main-content">
        <PageHero
          eyebrow="COMMERCIAL & CORPORATE INQUIRIES"
          eyebrowIcon={Mail}
          title="Connect with Our Global Healthcare Desk"
          description="Whether you are seeking regional distribution rights, institutional hospital procurement, product dossiers, or manufacturing collaboration, our team is ready to support you."
        />

        <section className="section" style={{ paddingTop: "40px" }}>
          <div className="contact-layout-grid">
            {/* Form Column (Interactive Client Component) */}
            <div className="contact-form-column">
              <Suspense fallback={<div className="loading-state">Loading inquiry form...</div>}>
                <ContactForm />
              </Suspense>
            </div>

            {/* Hubs & Office Details Column */}
            <aside className="contact-info-column">
              <div className="contact-info-card">
                <span className="eyebrow" style={{ marginBottom: "12px", display: "inline-block" }}>
                  INTERNATIONAL HUBS
                </span>
                <h3>Global Operational Presence</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.65", marginBottom: "24px" }}>
                  Our international alliance coordinates technical research, WHO-GMP manufacturing, and direct commercial delivery across three key jurisdictions.
                </p>

                <div className="contact-hubs-list">
                  <div className="contact-hub-item">
                    <div className="contact-hub-icon">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <h4>Tanzania Distribution Hub (Regional HQ)</h4>
                      <p>Plot 42, Commercial & Logistics Corridor</p>
                      <p>Dar es Salaam, United Republic of Tanzania</p>
                      <span className="contact-hub-detail">TBS Registration & Commercial Network</span>
                    </div>
                  </div>

                  <div className="contact-hub-item">
                    <div className="contact-hub-icon">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <h4>India Manufacturing & QC Hub</h4>
                      <p>Mumbai & Gujarat Pharmaceutical Industrial Belt</p>
                      <p>Maharashtra / Gujarat, Republic of India</p>
                      <span className="contact-hub-detail">WHO-GMP Validated Facilities & Analytical Testing</span>
                    </div>
                  </div>

                  <div className="contact-hub-item">
                    <div className="contact-hub-icon">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <h4>United States Technology & R&D Hub</h4>
                      <p>Corporate Formulation & Trade Alliance Office</p>
                      <p>Delaware, United States of America</p>
                      <span className="contact-hub-detail">Formulation Science & Strategic Alliances</span>
                    </div>
                  </div>
                </div>

                <div className="contact-direct-channels">
                  <div className="direct-channel-row">
                    <Mail size={16} color="var(--primary)" />
                    <div>
                      <strong>General Inquiries:</strong>{" "}
                      <a href="mailto:info@primebyactivist.com" className="contact-link">
                        info@primebyactivist.com
                      </a>
                    </div>
                  </div>

                  <div className="direct-channel-row">
                    <Mail size={16} color="var(--primary)" />
                    <div>
                      <strong>Commercial Partnerships:</strong>{" "}
                      <a href="mailto:partnerships@primebyactivist.com" className="contact-link">
                        partnerships@primebyactivist.com
                      </a>
                    </div>
                  </div>

                  <div className="direct-channel-row">
                    <Clock size={16} color="var(--primary)" />
                    <div>
                      <strong>Business Response SLA:</strong>{" "}
                      <span>1–2 business days for registered institutional requests</span>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
