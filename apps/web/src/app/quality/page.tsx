import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Award,
  FlaskConical,
  FileCheck2,
  CheckCircle2,
  Microscope,
  FileText,
  Boxes,
  ArrowRight,
  Shield,
  Layers,
  ThermometerSnowflake,
  ClipboardList,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PageHero from "@/components/ui/PageHero";

export const metadata: Metadata = {
  title: "Quality & Regulatory Compliance | PRIME by Activist",
  description:
    "Explore our evidence-based quality assurance framework: WHO-GMP validated manufacturing, TBS regulatory compliance, 3-stage analytical testing, and batch release protocols.",
};

export default function QualityPage() {
  const qualityPillars = [
    {
      icon: FlaskConical,
      number: "01",
      title: "Raw Material Assay & Qualification",
      description:
        "Every active pharmaceutical ingredient (API) and excipient undergoes comprehensive vendor qualification, spectroscopic identification, and HPLC assay verification before entering the production floor.",
      checks: [
        "Identity verification via IR / HPLC spectroscopy",
        "Assay and potency quantification",
        "Heavy metal and residual solvent screening",
        "Microbial burden quantification",
      ],
    },
    {
      icon: Layers,
      number: "02",
      title: "In-Process Quality Controls (IPQC)",
      description:
        "Continuous monitoring during blending, compression, liquid compounding, and encapsulation to ensure intra-batch uniformity and strict mechanical integrity.",
      checks: [
        "Tablet weight variation and thickness monitoring",
        "Hardness and friability mechanical stress testing",
        "Disintegration rate profiling in aqueous media",
        "Viscosity and pH stability in liquid formulations",
      ],
    },
    {
      icon: Microscope,
      number: "03",
      title: "Finished Product Analytical Testing",
      description:
        "Each production batch is quarantined until independent laboratory analysis validates chemical purity, active ingredient bioavailability, and sterility parameters.",
      checks: [
        "In-vitro dissolution profiling against pharmacopeial standards",
        "Total viable aerobic microbial count (TAMC)",
        "Absence of specific pathogens (E. coli, Salmonella, S. aureus)",
        "Accelerated real-time stability verification (ICH Q1A guidelines)",
      ],
    },
    {
      icon: ThermometerSnowflake,
      number: "04",
      title: "Packaging Integrity & Serialization",
      description:
        "Primary packaging in aluminum/PVDC moisture-barrier blisters and high-density bottles with tamper-evident induction seals and trackable batch barcodes.",
      checks: [
        "Leak and vacuum seal chamber integrity testing",
        "Unique batch serialization and manufacturing date stamping",
        "Light and moisture protection validation",
        "Temperature-monitored warehouse storage before dispatch",
      ],
    },
  ];

  const certifications = [
    {
      title: "WHO-GMP Certification",
      scope: "World Health Organization Good Manufacturing Practices for Oral Solid and Liquid Formulations.",
      authority: "State Drug Regulatory Authority & National GMP Inspectorate",
      status: "Validated & Active",
    },
    {
      title: "Tanzania Bureau of Standards (TBS)",
      scope: "Full product regulatory clearance, safety assessment, and import authorization across East Africa.",
      authority: "TBS Regulatory Council (Dar es Salaam)",
      status: "Registered & Compliant",
    },
    {
      title: "ISO 9001:2015 Quality Management",
      scope: "Quality management systems covering formulation manufacturing, supply chain tracking, and vendor audits.",
      authority: "International Quality Accreditation Body",
      status: "Audited & Certified",
    },
  ];

  const documentationRequests = [
    {
      title: "Batch Certificate of Analysis (CoA)",
      description: "Batch-specific laboratory analytical results including chemical assay, dissolution rates, and microbial clearance.",
      access: "Available per commercial shipment batch",
    },
    {
      title: "Stability Testing Dossier",
      description: "Accelerated (40°C / 75% RH) and real-time (30°C / 65% RH Zone IVb) stability profiles validating labeled shelf-life.",
      access: "Available to institutional partners upon request",
    },
    {
      title: "Common Technical Document (CTD)",
      description: "Modules 1 through 5 regulatory documentation compiled for national drug regulatory authority filings.",
      access: "Subject to non-disclosure and marketing authorization agreement",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main className="flex-1" id="main-content">
        <PageHero
          eyebrow="QUALITY & REGULATORY FRAMEWORK"
          eyebrowIcon={ShieldCheck}
          title="Uncompromising Standards. Validated Integrity."
          description="Every formulation under PRIME by Activist is engineered, manufactured, and released under strict international pharmacopeial standards and verified regulatory compliance."
        />

        {/* Quality Philosophy */}
        <section className="section" style={{ paddingBottom: "40px" }}>
          <div className="quality-philosophy-card">
            <div className="quality-philosophy-header">
              <span className="eyebrow">OUR COMMITMENT</span>
              <h2>Evidence-Based Pharmaceutical Quality</h2>
              <p>
                At PRIME by Activist, quality is an immutable design parameter. From active ingredient synthesis to clinical shelf-life stability, our manufacturing protocols are structured to ensure every dose meets patient and prescriber expectations with absolute reliability.
              </p>
            </div>

            <div className="quality-stats-strip">
              <div className="quality-stat-item">
                <strong>WHO-GMP</strong>
                <span>Certified Facilities</span>
              </div>
              <div className="quality-stat-item">
                <strong>TBS</strong>
                <span>Tanzania Compliant</span>
              </div>
              <div className="quality-stat-item">
                <strong>100%</strong>
                <span>Batch Release Assay</span>
              </div>
              <div className="quality-stat-item">
                <strong>Zone IVb</strong>
                <span>Climatic Stability Tested</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4 Quality Assurance Pillars */}
        <section className="section" style={{ background: "#f8fbf9" }}>
          <div className="section-heading">
            <span className="eyebrow">PHARMACOPEIAL INTEGRITY</span>
            <h2>Our Four-Stage Quality Assurance Protocol</h2>
            <p>A closed-loop quality system encompassing physical, chemical, and biological verification.</p>
          </div>

          <div className="quality-pillars-grid">
            {qualityPillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <article key={pillar.number} className="quality-pillar-card">
                  <div className="pillar-header">
                    <span className="pillar-number">{pillar.number}</span>
                    <div className="pillar-icon-box">
                      <Icon size={24} />
                    </div>
                  </div>

                  <h3 className="pillar-title">{pillar.title}</h3>
                  <p className="pillar-desc">{pillar.description}</p>

                  <ul className="pillar-checks-list">
                    {pillar.checks.map((check) => (
                      <li key={check}>
                        <CheckCircle2 size={15} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>{check}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>

        {/* Regulatory Certifications */}
        <section className="section">
          <div className="section-heading">
            <span className="eyebrow">VALIDATED AUDITS</span>
            <h2>Regulatory Certifications & Approvals</h2>
            <p>Transparent regulatory standing across our manufacturing and distribution hubs.</p>
          </div>

          <div className="certifications-table-card">
            {certifications.map((cert) => (
              <div key={cert.title} className="certification-row">
                <div className="cert-main">
                  <div className="cert-title-row">
                    <Award size={20} color="var(--primary)" />
                    <h3>{cert.title}</h3>
                    <span className="cert-status-badge">{cert.status}</span>
                  </div>
                  <p className="cert-scope">{cert.scope}</p>
                </div>
                <div className="cert-authority">
                  <span className="cert-auth-label">Accreditation Body</span>
                  <span className="cert-auth-name">{cert.authority}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Documentation Request Protocols */}
        <section className="section" style={{ background: "#fcfdfd", borderTop: "1px solid var(--border-subtle)" }}>
          <div className="section-heading">
            <span className="eyebrow">TRANSPARENT DOCUMENTATION</span>
            <h2>Technical & Regulatory Dossiers</h2>
            <p>How healthcare institutions and regulatory authorities can request formal documentation.</p>
          </div>

          <div className="docs-protocol-grid">
            {documentationRequests.map((doc) => (
              <div key={doc.title} className="doc-protocol-card">
                <div className="doc-protocol-header">
                  <FileText size={22} color="var(--primary)" />
                  <h3>{doc.title}</h3>
                </div>
                <p className="doc-protocol-desc">{doc.description}</p>
                <div className="doc-protocol-access">
                  <ClipboardList size={14} color="var(--text-muted)" />
                  <span>{doc.access}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: "40px" }}>
            <Link
              href="/contact?type=quality&subject=Quality%20Documentation%20Request"
              className="primary-button"
              style={{ display: "inline-flex" }}
            >
              <span>Submit Quality Documentation Request</span>
              <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
