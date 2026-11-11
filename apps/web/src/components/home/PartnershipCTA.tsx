import Link from "next/link";
import { ArrowRight, Handshake } from "lucide-react";

export default function PartnershipCTA() {
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="partnership-cta">
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.15)", padding: "6px 14px", borderRadius: "20px", marginBottom: "16px", fontSize: "12px", letterSpacing: "1.2px", fontWeight: 700 }}>
          <Handshake size={16} /> COLLABORATE WITH US
        </div>
        <h2>Ready to Partner with PRIME by Activist?</h2>
        <p>
          Join our growing global network of distributors, healthcare institutions, and pharmacy chains delivering certified wellness formulations.
        </p>
        <Link href="/contact" className="cta-button">
          Initiate Partnership Inquiry <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}

