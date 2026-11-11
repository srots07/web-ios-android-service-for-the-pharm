import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-content">
        <span className="eyebrow">
          <ShieldCheck size={16} />
          TRUSTED HEALTHCARE SOLUTIONS
        </span>

        <h1>
          Elevating Wellness.
          <br />
          <span>Inspiring Trust.</span>
          <br />
          Enriching Lives.
        </h1>

        <p>
          Committed to quality healthcare, trusted partnerships,
          and a healthier tomorrow.
        </p>

        <div className="hero-actions">
          <Link href="/products" className="primary-button">
            Explore Our Products <ArrowRight size={17} />
          </Link>

          <Link href="/contact" className="secondary-button">
            Partner With Us
          </Link>
        </div>

        <div className="hero-trust">
          WHO-GMP Manufacturing · TBS Registered · ISO Standards
        </div>
      </div>

      <div className="hero-image">
        <img
          src="/images/hero/healthcare-hero.jpg"
          alt="PRIME healthcare product collection"
        />
        <div className="hero-image-label">
          <strong>Better Nutrition.</strong>
          <span>Brighter Lives.</span>
        </div>
      </div>
    </section>
  );
}
