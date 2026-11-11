import Link from "next/link";
import { CheckCircle2, Award, Globe, Shield } from "lucide-react";

export default function About() {
  const highlights = [
    "State-of-the-art WHO-GMP certified manufacturing infrastructure",
    "Tanzania Bureau of Standards (TBS) registered supplements",
    "Rigorous multi-stage QA/QC chemical and microbiological testing",
    "Integrated cross-border supply chain between USA, India, and East Africa",
  ];

  return (
    <section className="about-section">
      <div className="about-content">
        <span className="eyebrow">ABOUT PRIME BY ACTIVIST</span>
        <h2 style={{ fontSize: "clamp(30px, 3.5vw, 44px)", margin: "16px 0", lineHeight: 1.15 }}>
          Pioneering Quality Nutrition and Healthcare Integrity
        </h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.8, fontSize: "16px" }}>
          PRIME by Activist combines decades of pharmaceutical excellence and dietary science to deliver high-efficacy formulations across global markets. Our mission is to democratize preventive health through certified excellence.
        </p>

        <ul style={{ listStyle: "none", padding: 0, margin: "24px 0", display: "grid", gap: "14px" }}>
          {highlights.map((item) => (
            <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "15px" }}>
              <CheckCircle2 size={18} color="var(--primary)" style={{ flexShrink: 0, marginTop: "2px" }} />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div style={{ marginTop: "30px" }}>
          <Link href="/about" className="primary-button">
            Read Our Full Story
          </Link>
        </div>
      </div>

      <div style={{ position: "relative" }}>
        <div
          style={{
            background: "linear-gradient(135deg, #176b5015, #c6a66b20)",
            padding: "40px",
            borderRadius: "20px",
            border: "1px solid #dce8e0",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div style={{ background: "white", padding: "24px", borderRadius: "12px" }}>
              <Award size={32} color="var(--primary)" />
              <h3 style={{ fontSize: "18px", margin: "12px 0 6px" }}>WHO-GMP</h3>
              <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>Highest standard pharmaceutical manufacturing</p>
            </div>
            <div style={{ background: "white", padding: "24px", borderRadius: "12px" }}>
              <Shield size={32} color="var(--primary)" />
              <h3 style={{ fontSize: "18px", margin: "12px 0 6px" }}>TBS Certified</h3>
              <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>Full compliance with regulatory authorities</p>
            </div>
            <div style={{ background: "white", padding: "24px", borderRadius: "12px" }}>
              <Globe size={32} color="var(--primary)" />
              <h3 style={{ fontSize: "18px", margin: "12px 0 6px" }}>Global Reach</h3>
              <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>Active trade footprint across 3 continents</p>
            </div>
            <div style={{ background: "white", padding: "24px", borderRadius: "12px" }}>
              <CheckCircle2 size={32} color="var(--primary)" />
              <h3 style={{ fontSize: "18px", margin: "12px 0 6px" }}>28+ Products</h3>
              <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>Diverse formulations spanning tablets to liquids</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

