import Link from "next/link";
import { Check, Shield, Layers, Globe, Users2, ArrowRight } from "lucide-react";

export default function WhyUs() {
  const differentiators = [
    {
      icon: Layers,
      title: "Extensive Formulation Portfolio",
      desc: "Over 28 specialized formulations spanning solid orals, liquids, paediatric dropper solutions, and soft gelatin oil matrices.",
    },
    {
      icon: Globe,
      title: "3-Nation Synergistic Alliance",
      desc: "Combines United States formulation science, Indian WHO-GMP manufacturing scale, and East African on-the-ground distribution networks.",
    },
    {
      icon: Shield,
      title: "Zero Regulatory Compromises",
      desc: "Fully registered and documented with TBS Tanzania, backed by exhaustive stability data and certified batch analysis.",
    },
    {
      icon: Users2,
      title: "Dedicated B2B Partnership Model",
      desc: "Tailored volume tiers, dependable supply chain SLAs, co-marketing support, and structured clinician education programs.",
    },
  ];

  return (
    <section className="section why-us-section" style={{ background: "#f8fbf9" }}>
      <div className="section-heading">
        <span className="eyebrow">
          <Shield size={16} /> THE PRIME ADVANTAGE
        </span>
        <h2>Why Healthcare Professionals Choose PRIME by Activist</h2>
        <p>
          We unite pharmaceutical science, validated clinical quality, and dependable cross-border distribution to empower healthcare providers and improve patient outcomes.
        </p>
      </div>

      <div className="why-us-grid">
        {differentiators.map((item) => {
          const Icon = item.icon;
          return (
            <div className="why-us-card" key={item.title}>
              <div className="why-us-card-header">
                <div className="why-us-icon-wrap">
                  <Icon size={24} aria-hidden="true" />
                </div>
                <h3>{item.title}</h3>
              </div>
              <p>{item.desc}</p>
              <div className="why-us-check-row">
                <Check size={16} color="var(--primary)" />
                <span>Verified Quality Assurance</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: "center", marginTop: "36px" }}>
        <Link href="/about" className="secondary-button" style={{ display: "inline-flex" }}>
          <span>Learn More About Our Heritage</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}

