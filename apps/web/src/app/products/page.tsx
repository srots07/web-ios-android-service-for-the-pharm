import { Suspense } from "react";
import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductsCatalog from "./ProductsCatalog";

export const metadata: Metadata = {
  title: "Product Portfolio | PRIME by Activist - Certified Pharmaceutical Formulations",
  description:
    "Explore our complete pharmaceutical and dietary formulation portfolio: Tablets, Oral Suspensions, Paediatric Drops, Softgels, and Capsules manufactured under WHO-GMP standards.",
};

export default function ProductsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1" id="main-content">
        <Suspense fallback={<div className="section"><div className="loading-state">Loading product catalogue...</div></div>}>
          <ProductsCatalog />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
