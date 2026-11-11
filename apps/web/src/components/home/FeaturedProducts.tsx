import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { verifiedProducts } from "@/lib/products";

export default function FeaturedProducts() {
  return (
    <section className="section featured-products-section" style={{ background: "#fcfdfd" }}>
      <div className="section-heading">
        <span className="eyebrow">
          <Sparkles size={16} /> CURATED FORMULATIONS
        </span>
        <h2>Featured Healthcare Products</h2>
        <p>
          Scientifically formulated dietary supplements and therapeutic wellness solutions manufactured under certified WHO-GMP conditions.
        </p>
      </div>

      <div className="featured-products-grid">
        {verifiedProducts.map((product) => (
          <article className="product-card" key={product.id}>
            <div className="product-card-image-wrap">
              <img
                src={product.image}
                alt={product.name}
                loading="lazy"
                className="product-card-image"
              />
              <span className="product-card-badge">
                <ShieldCheck size={13} aria-hidden="true" />
                <span>WHO-GMP</span>
              </span>
            </div>

            <div className="product-card-body">
              <div className="product-card-meta">
                <span className="product-sku">{product.sku}</span>
                <span className="product-category-pill">{product.category}</span>
              </div>

              <h3 className="product-card-title">{product.name}</h3>

              <p className="product-card-desc">{product.description}</p>

              <div className="product-card-specs">
                <div className="product-pack-size">
                  <strong>Pack Size:</strong> {product.packSize}
                </div>
                <div className="product-cert-list">
                  {product.certifications.map((cert) => (
                    <span key={cert} className="product-cert-tag">
                      <CheckCircle2 size={12} color="var(--primary)" />
                      {cert}
                    </span>
                  ))}
                </div>
              </div>

              <div className="product-card-actions">
                <Link
                  href={`/products?search=${encodeURIComponent(product.name)}`}
                  className="product-card-btn"
                >
                  <span>Product Dossier</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: "44px" }}>
        <Link href="/products" className="primary-button" style={{ display: "inline-flex" }}>
          <span>Explore All 28+ Formulations</span>
          <ArrowRight size={17} />
        </Link>
      </div>
    </section>
  );
}

