import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Award,
  Globe2,
  Building2,
  Landmark,
  CheckCircle2,
  ArrowRight,
  Target,
  Eye,
  Microscope,
  Boxes,
  Truck,
  HeartHandshake,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PageHero from "@/components/ui/PageHero";

export const metadata: Metadata = {
  title: "About Us | PRIME by Activist - Healthcare Integrity & Global Alliance",
  description:
    "Learn about PRIME by Activist: our mission, 3-nation pharmaceutical alliance across the USA, India, and Tanzania, certified WHO-GMP manufacturing, and TBS compliance.",
};

export default function AboutPage() {
  const capabilities = [
    {
      icon: Boxes,
      title: "Diverse Formulation Capabilities",
      description:
        "Comprehensive solid dosage forms, liquids, paediatric suspensions, and advanced oil-filled softgel encapsulation.",
    },
    {
      icon: Microscope,
      title: "R&D & Formulation Science",
      description:
        "Formulation technology and bio-equivalence research focused on high bioavailability, patient tolerance, and shelf-life stability.",
    },
    {
      icon: Award,
      title: "WHO-GMP Validated Quality",
      description:
        "Operating within cleanroom Grade C/D environments with continuous particulate monitoring, validated HVAC systems, and water-for-injection (WFI) loops.",
    },
    {
      icon: Truck,
      title: "Compliant Supply Chain & Cold-Chain",
      description:
        "GDP-compliant temperature-controlled logistics connecting Indian manufacturing hubs to East African seaport and regional depots.",
    },
  ];

  const operatingHubs = [
    {
      region: "United States",
      location: "Delaware, USA",
      role: "Strategic R&D & Formulation Technology",
      description:
        "Strategic formulation architecture, ingredient verification, and international regulatory alignment.",
      icon: Globe2,
    },
    {
      region: "India",
      location: "Mumbai & Gujarat Pharma Corridor",
      role: "WHO-GMP Certified Advanced Manufacturing",
      description:
        "State-of-the-art manufacturing plants producing solid orals, oral suspensions, paediatric droppers, and gelatin softgels.",
      icon: Building2,
    },
    {
      region: "Tanzania & East Africa",
      location: "Dar es Salaam, Tanzania",
      role: "Import Distribution & Commercial Network",
      description:
        "Central distribution headquarters, TBS registration stewardship, and distribution across hospitals, clinics, and pharmacies.",
      icon: Landmark,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main className="flex-1" id="main-content">
        {/* Page Hero */}
        <PageHero
          eyebrow="CORPORATE PROFILE"
          eyebrowIcon={ShieldCheck}
          title="Pioneering Quality Healthcare Formulations"
          description="PRIME by Activist combines decades of pharmaceutical engineering and dietary science to deliver high-efficacy, certified formulations across global healthcare networks."
        />

        {/* Section A: Company Overview */}
        <section className="section" style={{ paddingBottom: "40px" }}>
          <div className="about-overview-grid">
            <div className="about-overview-text">
              <span className="eyebrow">OUR HERITAGE & PURPOSE</span>
              <h2>Bridging Quality Science with Accessible Healthcare</h2>
              <p>
                PRIME by Activist was established to resolve a persistent challenge in developing and emerging healthcare markets: ensuring affordable access to pharmaceutical and dietary formulations that rigorously adhere to international pharmacopeial standards.
              </p>
              <p>
                Through a coordinated cross-border partnership connecting formulation research in the United States, large-scale WHO-GMP certified manufacturing in India, and authorized importation distribution in Tanzania, we provide healthcare systems with reliable therapeutic solutions.
              </p>

              <div className="about-pill-row">
                <span className="about-trust-pill">
                  <CheckCircle2 size={16} color="var(--primary)" />
                  WHO-GMP Certified
                </span>
                <span className="about-trust-pill">
                  <CheckCircle2 size={16} color="var(--primary)" />
                  TBS Registered
                </span>
                <span className="about-trust-pill">
                  <CheckCircle2 size={16} color="var(--primary)" />
                  3-Continent Alliance
                </span>
              </div>
            </div>

            <div className="about-overview-card">
              <div className="about-stat-box">
                <span className="about-stat-number">28+</span>
                <span className="about-stat-label">Active Formulations in Portfolio</span>
              </div>
              <div className="about-stat-box">
                <span className="about-stat-number">100%</span>
                <span className="about-stat-label">Batch Analytical Testing Before Release</span>
              </div>
              <div className="about-stat-box">
                <span className="about-stat-number">3</span>
                <span className="about-stat-label">Nations in Connected Supply Alliance</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section B: Mission and Vision */}
        <section className="section" style={{ background: "#f8fbf9", paddingTop: "60px", paddingBottom: "60px" }}>
          <div className="section-heading">
            <span className="eyebrow">GUIDING PRINCIPLES</span>
            <h2>Our Mission & Vision</h2>
            <p>Directing our technical standards and commercial commitments across every market we serve.</p>
          </div>

          <div className="mission-vision-grid">
            <div className="mission-card">
              <div className="mission-icon-wrap">
                <Target size={28} />
              </div>
              <h3>Our Mission</h3>
              <p>
                To safeguard public health by developing, manufacturing, and distributing pharmaceutical-grade nutritional supplements and formulations that meet validated international standards of purity, bio-potency, and patient safety, backed by total regulatory transparency.
              </p>
            </div>

            <div className="vision-card">
              <div className="mission-icon-wrap" style={{ background: "#fcf6e8", color: "#a88132" }}>
                <Eye size={28} />
              </div>
              <h3>Our Vision</h3>
              <p>
                To become the most dependable and trusted healthcare brand in Africa and expanding emerging markets, recognized by clinicians, pharmacists, and families for uncompromised pharmaceutical integrity.
              </p>
            </div>
          </div>
        </section>

        {/* Section C & D: Business Capabilities */}
        <section className="section">
          <div className="section-heading">
            <span className="eyebrow">TECHNICAL CAPABILITIES</span>
            <h2>Integrated Pharmaceutical Operations</h2>
            <p>From scientific research to final regulatory batch release, our framework ensures consistency at every stage.</p>
          </div>

          <div className="capabilities-grid">
            {capabilities.map((cap) => {
              const Icon = cap.icon;
              return (
                <div key={cap.title} className="capability-card">
                  <div className="capability-icon">
                    <Icon size={24} />
                  </div>
                  <h3>{cap.title}</h3>
                  <p>{cap.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section E: Corporate Hubs / Operating Regions */}
        <section className="section" style={{ background: "#fcfdfd", borderTop: "1px solid var(--border-subtle)" }}>
          <div className="section-heading">
            <span className="eyebrow">GLOBAL NETWORK</span>
            <h2>Our International Footprint</h2>
            <p>A synergistic supply alliance ensuring regulatory compliance and supply stability.</p>
          </div>

          <div className="hubs-grid">
            {operatingHubs.map((hub) => {
              const Icon = hub.icon;
              return (
                <div key={hub.region} className="hub-card">
                  <div className="hub-header">
                    <div className="hub-icon-wrap">
                      <Icon size={24} />
                    </div>
                    <div>
                      <span className="hub-location">{hub.location}</span>
                      <h3 className="hub-title">{hub.region}</h3>
                    </div>
                  </div>
                  <strong className="hub-role">{hub.role}</strong>
                  <p className="hub-desc">{hub.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section F: Partnership Call to Action */}
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="partnership-cta">
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.15)", padding: "6px 14px", borderRadius: "20px", marginBottom: "16px", fontSize: "12px", letterSpacing: "1.2px", fontWeight: 700 }}>
              <HeartHandshake size={16} /> COLLABORATE WITH PRIME
            </div>
            <h2>Explore Distribution & Institutional Supply</h2>
            <p>
              Partner with PRIME by Activist for pharmacy network distribution, institutional healthcare procurement, or contract manufacturing.
            </p>
            <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap", marginTop: "24px" }}>
              <Link href="/contact?type=distributor" className="cta-button">
                <span>Partner Inquiry</span>
                <ArrowRight size={17} />
              </Link>
              <Link
                href="/products"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "14px 28px",
                  borderRadius: "var(--radius-md)",
                  background: "transparent",
                  border: "1.5px solid rgba(255,255,255,0.6)",
                  color: "white",
                  fontSize: "14.5px",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                <span>View Product Catalog</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
