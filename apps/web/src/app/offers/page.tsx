import type { Metadata } from "next";
import Link from "next/link";
import {
  Tag,
  ShieldCheck,
  CheckCircle2,
  Building2,
  ArrowRight,
  Handshake,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PageHero from "@/components/ui/PageHero";
import { commercialOffers } from "@/lib/offers";

export const metadata: Metadata = {
  title: "Commercial Offers & Distribution Tiers | PRIME by Activist",
  description:
    "Explore approved commercial supply frameworks, regional distribution tiers, and institutional healthcare procurement opportunities with PRIME by Activist.",
};

export default function OffersPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main className="flex-1" id="main-content">
        <PageHero
          eyebrow="COMMERCIAL PARTNERSHIPS"
          eyebrowIcon={Tag}
          title="Distribution Programs & Institutional Tiers"
          description="Verified supply agreements, volume allocation programs, and contract manufacturing opportunities for accredited healthcare organizations and regional pharmacy networks."
        />

        {/* Commercial Disclaimer Notice */}
        <section className="section" style={{ paddingBottom: 0 }}>
          <div className="commercial-notice-box">
            <div className="commercial-notice-icon">
              <ShieldCheck size={20} color="var(--primary)" />
            </div>
            <div>
              <strong>Regulated Commercial Framework</strong>
              <p>
                All distribution agreements, volume pricing tiers, and institutional allocations are subject to regulatory clearance, valid pharmaceutical trading licenses, and Tanzania Bureau of Standards (TBS) compliance validation.
              </p>
            </div>
          </div>
        </section>

        {/* Active Commercial Offers Grid */}
        <section className="section">
          <div className="section-heading" style={{ textAlign: "left", marginBottom: "36px" }}>
            <span className="eyebrow">APPROVED COMMERCIAL FRAMEWORKS</span>
            <h2>Active Commercial Programs</h2>
            <p>Select a partnership framework aligned with your organization&apos;s healthcare supply requirements.</p>
          </div>

          <div className="commercial-offers-grid">
            {commercialOffers.map((offer) => (
              <article key={offer.id} className="commercial-offer-card">
                <div className="offer-card-top">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <span className="offer-tag-pill">{offer.tag}</span>
                    <span className="offer-status-badge">
                      <span className="offer-status-dot" aria-hidden="true"></span>
                      {offer.status}
                    </span>
                  </div>

                  <h3 className="offer-title">{offer.title}</h3>
                  <p className="offer-desc">{offer.description}</p>
                </div>

                <div className="offer-details-section">
                  <div className="offer-detail-item">
                    <span className="offer-detail-label">Eligibility Criteria</span>
                    <span className="offer-detail-val">{offer.eligibility}</span>
                  </div>

                  <div className="offer-detail-item">
                    <span className="offer-detail-label">Commercial Incentive</span>
                    <span className="offer-detail-val" style={{ color: "var(--primary)", fontWeight: 700 }}>
                      {offer.incentive}
                    </span>
                  </div>

                  <div className="offer-detail-item">
                    <span className="offer-detail-label">Regulatory & Order Terms</span>
                    <span className="offer-detail-val">{offer.terms}</span>
                  </div>
                </div>

                <div className="offer-card-action">
                  <Link
                    href={`/contact?type=distributor&offer=${encodeURIComponent(offer.id)}&subject=${encodeURIComponent(offer.title)}`}
                    className="primary-button"
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    <span>Initiate Commercial Enquiry</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Procurement Process Steps */}
        <section className="section" style={{ background: "#f8fbf9", borderTop: "1px solid var(--border-subtle)" }}>
          <div className="section-heading">
            <span className="eyebrow">PROCUREMENT PROCESS</span>
            <h2>How Commercial Onboarding Works</h2>
            <p>Our structured onboarding ensures compliance, rapid verification, and seamless supply fulfillment.</p>
          </div>

          <div className="procurement-steps-grid">
            <div className="procurement-step-card">
              <span className="procurement-step-num">01</span>
              <h3>Commercial Inquiry</h3>
              <p>Submit your institutional requirements, target formulations, and estimated monthly/quarterly volume.</p>
            </div>

            <div className="procurement-step-card">
              <span className="procurement-step-num">02</span>
              <h3>Credential Verification</h3>
              <p>Our legal and regulatory desk reviews trade licensure, regional importation permits, and tax compliance.</p>
            </div>

            <div className="procurement-step-card">
              <span className="procurement-step-num">03</span>
              <h3>Supply Agreement</h3>
              <p>Execute structured procurement contracts with agreed batch delivery schedules and batch CoA releases.</p>
            </div>

            <div className="procurement-step-card">
              <span className="procurement-step-num">04</span>
              <h3>Priority Dispatch</h3>
              <p>Shipments depart our temperature-controlled distribution depots with continuous batch tracking.</p>
            </div>
          </div>
        </section>

        {/* Partnership CTA */}
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="partnership-cta">
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.15)", padding: "6px 14px", borderRadius: "20px", marginBottom: "16px", fontSize: "12px", letterSpacing: "1.2px", fontWeight: 700 }}>
              <Handshake size={16} /> CUSTOM COMMERCIAL TIERS
            </div>
            <h2>Need a Tailored Commercial Contract?</h2>
            <p>
              Our corporate trade desk works directly with regional ministries, hospital networks, and pharmaceutical purchasing organizations.
            </p>
            <Link href="/contact?type=institutional" className="cta-button">
              <span>Contact Commercial Team</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
