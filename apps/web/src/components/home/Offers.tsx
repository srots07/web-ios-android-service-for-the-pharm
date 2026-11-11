import Link from "next/link";
import { ArrowRight, Tag } from "lucide-react";

const offers = [
  {
    tag: "SPECIAL BUNDLE",
    title: "Immunity & Essential Vitamins",
    description: "Comprehensive multivitamin packs designed for clinic and pharmacy bulk distribution.",
    discount: "Up to 25% Off on Bulk Orders",
    link: "/offers",
  },
  {
    tag: "NEW LAUNCH",
    title: "Paediatric Wellness Drops",
    description: "Specialized gentle nutritional formulations meeting strict international safety benchmarks.",
    discount: "Introductory Partner Margins",
    link: "/offers",
  },
  {
    tag: "COMMERCIAL PARTNER",
    title: "Contract Manufacturing Tier",
    description: "Custom branding and certified WHO-GMP packaging for registered distribution networks.",
    discount: "Volume Guaranteed Pricing",
    link: "/contact",
  },
];

export default function Offers() {
  return (
    <section className="offers-section">
      <div className="section-heading">
        <span className="eyebrow">
          <Tag size={16} /> EXCLUSIVE OPPORTUNITIES
        </span>
        <h2>Current Partner & Distribution Offers</h2>
        <p>Explore volume incentives and new formulation releases.</p>
      </div>

      <div className="offers-grid">
        {offers.map((offer) => (
          <article className="offer-card" key={offer.title}>
            <div>
              <span className="offer-tag">{offer.tag}</span>
              <h3 style={{ fontSize: "20px", margin: "10px 0" }}>{offer.title}</h3>
              <p style={{ color: "var(--muted)", fontSize: "14px", lineHeight: "1.7" }}>
                {offer.description}
              </p>
            </div>
            <div style={{ marginTop: "24px" }}>
              <div style={{ fontWeight: 800, color: "var(--primary)", marginBottom: "14px" }}>
                {offer.discount}
              </div>
              <Link
                href={offer.link}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "var(--primary)",
                }}
              >
                Learn More <ArrowRight size={15} />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

