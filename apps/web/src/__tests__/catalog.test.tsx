import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Categories from "@/components/home/Categories";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import { verifiedProducts } from "@/lib/products";

describe("Catalog and Featured Products Components", () => {
  it("contains verified product fixtures with essential regulatory metadata", () => {
    expect(verifiedProducts.length).toBeGreaterThan(0);
    verifiedProducts.forEach((p) => {
      expect(p.id).toBeDefined();
      expect(p.name).toBeTruthy();
      expect(p.category).toBeTruthy();
      expect(p.sku).toBeTruthy();
      expect(p.certifications).toContain("WHO-GMP");
    });
  });

  it("renders Categories component with expected category cards", () => {
    render(<Categories />);
    expect(screen.getByText("OUR PRODUCT PORTFOLIO")).toBeInTheDocument();
    expect(screen.getByText("Tablets")).toBeInTheDocument();
    expect(screen.getByText("Syrups / Susp.")).toBeInTheDocument();
    expect(screen.getByText("Paediatric Drops")).toBeInTheDocument();
  });

  it("renders FeaturedProducts component with WHO-GMP certification badges", () => {
    render(<FeaturedProducts />);
    expect(screen.getByText("CURATED FORMULATIONS")).toBeInTheDocument();
    expect(screen.getByText("Featured Healthcare Products")).toBeInTheDocument();

    const badges = screen.getAllByText("WHO-GMP");
    expect(badges.length).toBeGreaterThan(0);
  });
});
