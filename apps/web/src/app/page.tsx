import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/home/Hero";
import About from "@/components/home/About";
import Stats from "@/components/home/Stats";
import Categories from "@/components/home/Categories";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import QualityTrust from "@/components/home/QualityTrust";
import WhyUs from "@/components/home/WhyUs";
import Offers from "@/components/home/Offers";
import Partnerships from "@/components/home/Partnerships";
import PartnershipCTA from "@/components/home/PartnershipCTA";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1" id="main-content">
        {/* Section 01: Hero */}
        <Hero />

        {/* Section 02: Company Introduction */}
        <About />

        {/* Section 03: Key Highlights */}
        <Stats />

        {/* Section 04: Product Categories */}
        <Categories />

        {/* Section 05: Featured Products */}
        <FeaturedProducts />

        {/* Section 06: Quality and Trust */}
        <QualityTrust />

        {/* Section 07: Why PRIME by Activist */}
        <WhyUs />

        {/* Section 08: Commercial Opportunities & Offers */}
        <Offers />

        {/* Section 09: Global Presence & Partnerships */}
        <Partnerships />

        {/* Section 10: Closing Call to Action */}
        <PartnershipCTA />
      </main>
      <Footer />
    </div>
  );
}
