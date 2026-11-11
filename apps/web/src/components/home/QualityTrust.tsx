import Link from "next/link";
import { ShieldCheck, Award, FileCheck2, FlaskConical, CheckCircle2, ArrowRight } from "lucide-react";

export default function QualityTrust() {
  const qualityPillars = [
    {
      icon: Award,
      title: "WHO-GMP Certified Facilities",
      desc: "Manufactured in validated cleanroom environments compliant with World Health Organization Good Manufacturing Practices.",
    },
    {
      icon: FileCheck2,
      title: "TBS Tanzania Registered",
      desc: "Full product authorization and rigorous compliance clearance under the Tanzania Bureau of Standards guidelines.",
    },
    {
      icon: FlaskConical,
      title: "3-Stage Analytical Testing",
      desc: "HPLC assay, dissolution profiling, microbial screening, and accelerated stability testing for every commercial batch.",
    },
    {
      icon: ShieldCheck,
      title: "End-to-End Batch Traceability",
      desc: "Complete documentation audit trails from active raw ingredient procurement to final regional pharmacy delivery.",
    },
  ];

  return (
    <section className="section quality-trust-section">
      <div className="section-heading">
        <span className="eyebrow">
          <ShieldCheck size={16} /> UNCOMPROMISING RIGOR
        </span>
        <h2>Quality & Regulatory Standards</h2>
        <p>
          Our manufacturing and quality assurance frameworks meet stringent international benchmarks to guarantee formulation safety, purity, and therapeutic consistency.
        </p>
      </div>

      <div className="quality-trust-grid">
        {qualityPillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <article className="quality-feature-card" key={pillar.title}>
              <div className="quality-feature-icon-box">
                <Icon size={26} aria-hidden="true" />
              </div>
              <h3 className="quality-feature-title">{pillar.title}</h3>
              <p className="quality-feature-desc">{pillar.desc}</p>
            </article>
          );
        })}
      </div>

      <div className="quality-trust-banner">
        <div className="quality-trust-banner-content">
          <div className="quality-trust-banner-badge">
            <CheckCircle2 size={16} />
            <span>CLINICAL EXCELLENCE GUARANTEED</span>
          </div>
          <h3>Dedicated to Patient Wellness and Prescriber Confidence</h3>
          <p>
            Review our comprehensive certificates of analysis (CoA), regulatory filings, and global manufacturing certifications.
          </p>
        </div>
        <div className="quality-trust-banner-cta">
          <Link href="/quality" className="primary-button">
            <span>Explore Quality Framework</span>
            <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </section>
  );
}

