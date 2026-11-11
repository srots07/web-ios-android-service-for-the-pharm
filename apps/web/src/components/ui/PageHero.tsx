import Link from "next/link";
import { ArrowLeft, LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface PageHeroProps {
  eyebrow?: string;
  eyebrowIcon?: LucideIcon;
  title: string;
  description: string;
  badge?: string;
  children?: ReactNode;
}

export default function PageHero({
  eyebrow,
  eyebrowIcon: EyebrowIcon,
  title,
  description,
  badge,
  children,
}: PageHeroProps) {
  return (
    <section className="page-hero-container">
      <div className="page-hero-inner">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="page-hero-breadcrumb">
          <Link href="/" className="page-hero-back-link">
            <ArrowLeft size={15} aria-hidden="true" />
            <span>Home</span>
          </Link>
          <span className="page-hero-divider" aria-hidden="true">/</span>
          <span className="page-hero-current" aria-current="page">{title}</span>
        </nav>

        {/* Eyebrow / Tag */}
        {eyebrow && (
          <div className="page-hero-eyebrow">
            {EyebrowIcon && <EyebrowIcon size={15} aria-hidden="true" />}
            <span>{eyebrow}</span>
          </div>
        )}

        {/* Title */}
        <h1 className="page-hero-title">{title}</h1>

        {/* Description */}
        <p className="page-hero-desc">{description}</p>

        {/* Optional Action / Children / Badge */}
        {badge && (
          <div className="page-hero-badge-wrap">
            <span className="page-hero-badge">{badge}</span>
          </div>
        )}

        {children && <div className="page-hero-actions">{children}</div>}
      </div>
    </section>
  );
}

