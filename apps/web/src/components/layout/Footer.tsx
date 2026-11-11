import Link from "next/link";
import { productCategories } from "@/lib/navigation";
import { Mail, MapPin, ShieldCheck, ArrowUpRight } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="footer-inner">
        {/* Brand & Corporate Mission Column */}
        <div className="footer-brand">
          <Link
            href="/"
            className="prime-brand"
            aria-label="PRIME by Activist - Home"
            style={{ display: "inline-flex", alignItems: "center", gap: "14px" }}
          >
            <div className="prime-logo" style={{ width: "42px", height: "46px" }}>
              <img
                src="/images/logo/prime-logo.png"
                alt="PRIME Healthcare"
                style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
              />
            </div>
            <div className="activist-logo" style={{ width: "90px", height: "44px" }}>
              <img
                src="/images/logo/activist-logo.png"
                alt="Activist Quality Healthcare"
                style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
              />
            </div>
          </Link>

          <p>
            PRIME by Activist delivers pharmaceutical and dietary formulations across global healthcare networks. Committed to certified WHO-GMP manufacturing, TBS registration, and international clinical integrity.
          </p>

          <div className="footer-alliance-tag">
            <ShieldCheck size={16} color="var(--primary-light)" />
            <span>USA · India · Tanzania Healthcare Alliance</span>
          </div>
        </div>

        {/* Quick Links Column */}
        <div className="footer-column">
          <h4>EXPLORE</h4>
          <ul>
            <li><Link href="/">Home Overview</Link></li>
            <li><Link href="/products">Product Portfolio</Link></li>
            <li><Link href="/about">About Us & Heritage</Link></li>
            <li><Link href="/offers">Commercial Offers</Link></li>
            <li><Link href="/quality">Quality Standards</Link></li>
            <li><Link href="/contact">Partner With Us</Link></li>
          </ul>
        </div>

        {/* Formulations & Categories Column */}
        <div className="footer-column">
          <h4>FORMULATIONS</h4>
          <ul>
            {productCategories.map((cat) => (
              <li key={cat.name}>
                <Link href={cat.href}>
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Global Hubs & Support Column */}
        <div className="footer-column">
          <h4>GLOBAL CONTACT</h4>
          <ul className="footer-contact-list">
            <li>
              <MapPin size={15} className="footer-contact-icon" aria-hidden="true" />
              <span>Dar es Salaam, Tanzania</span>
            </li>
            <li>
              <MapPin size={15} className="footer-contact-icon" aria-hidden="true" />
              <span>Mumbai, India</span>
            </li>
            <li>
              <MapPin size={15} className="footer-contact-icon" aria-hidden="true" />
              <span>Delaware, United States</span>
            </li>
            <li style={{ marginTop: 8 }}>
              <Mail size={15} className="footer-contact-icon" aria-hidden="true" />
              <a href="mailto:info@primebyactivist.com" className="footer-email-link">
                info@primebyactivist.com
              </a>
            </li>
          </ul>

          <div style={{ marginTop: 20 }}>
            <Link href="/contact" className="footer-partner-btn">
              <span>Partner Inquiry</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Footer Bottom Bar */}
      <div className="footer-bottom">
        <p>&copy; {currentYear} PRIME by Activist. All rights reserved.</p>
        <div className="footer-bottom-links">
          <Link href="/quality">Compliance</Link>
          <span aria-hidden="true">·</span>
          <Link href="/about">Regulatory Information</Link>
          <span aria-hidden="true">·</span>
          <Link href="/contact">Support</Link>
        </div>
      </div>
    </footer>
  );
}
