"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  X,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  ShieldCheck,
  FileText,
  Boxes,
  ArrowRight,
  ExternalLink,
  Info,
} from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import { productsApi } from "@/lib/api";
import { Product } from "@/types";

const CATEGORIES = [
  "All",
  "Tablets",
  "Syrups / Susp.",
  "Paediatric Drops",
  "Capsules",
  "Oil Filled Capsules",
] as const;

export default function ProductsCatalog() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialSearch = searchParams.get("search") || "";
  const initialCategory = searchParams.get("category") || "All";

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    CATEGORIES.includes(initialCategory as any) ? initialCategory : "All"
  );
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "sku-asc">("name-asc");
  const [activeModalProduct, setActiveModalProduct] = useState<Product | null>(null);
  const [catalogList, setCatalogList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch live published catalogue strictly from FastAPI PostgreSQL backend
  const loadLiveProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productsApi.listPublic();
      const mapped: Product[] = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        category: p.category as any,
        sku: p.sku,
        description: p.description || "",
        image: p.image_url || "/images/products/placeholder.jpg",
        packSize: p.pack_size || "Standard Packaging",
        indications: p.composition ? [p.composition] : ["Pharmaceutical Specification Verified"],
        certifications: ["WHO-GMP", "ISO 9001:2015", "GLP Certified"],
        shelfLife: p.shelf_life || "24 Months",
        storageConditions: p.storage_conditions || "Store below 25°C",
        dosageForm: p.dosage_form || "Standard Dose",
      }));
      setCatalogList(mapped);
    } catch (err: any) {
      setError(err.message || "Unable to retrieve verified formulations from catalogue service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLiveProducts();
  }, []);

  // Sync state if URL query params change externally
  useEffect(() => {
    const urlSearch = searchParams.get("search");
    const urlCategory = searchParams.get("category");
    if (urlSearch !== null && urlSearch !== searchTerm) {
      setSearchTerm(urlSearch);
    }
    if (urlCategory && CATEGORIES.includes(urlCategory as any) && urlCategory !== selectedCategory) {
      setSelectedCategory(urlCategory);
    }
  }, [searchParams]);

  // Update URL parameters when search or category changes
  const updateUrlParams = (search: string, category: string) => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (category && category !== "All") params.set("category", category);

    const newQuery = params.toString();
    const newUrl = newQuery ? `/products?${newQuery}` : `/products`;
    router.replace(newUrl, { scroll: false });
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    updateUrlParams(searchTerm, category);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    updateUrlParams(value, selectedCategory);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("All");
    router.replace("/products", { scroll: false });
  };

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    return catalogList
      .filter((product) => {
        const matchesCategory =
          selectedCategory === "All" || product.category === selectedCategory;

        const term = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !term ||
          product.name.toLowerCase().includes(term) ||
          product.sku.toLowerCase().includes(term) ||
          product.category.toLowerCase().includes(term) ||
          product.description.toLowerCase().includes(term);

        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === "name-asc") return a.name.localeCompare(b.name);
        if (sortBy === "name-desc") return b.name.localeCompare(a.name);
        if (sortBy === "sku-asc") return a.sku.localeCompare(b.sku);
        return 0;
      });
  }, [catalogList, searchTerm, selectedCategory, sortBy]);

  // Modal ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeModalProduct) {
        setActiveModalProduct(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeModalProduct]);

  return (
    <>
      <PageHero
        eyebrow="PRODUCT CATALOGUE"
        eyebrowIcon={Boxes}
        title="Certified Healthcare Formulations"
        description="Comprehensive portfolio of pharmaceutical and dietary formulations manufactured under WHO-GMP certification and registered with the Tanzania Bureau of Standards (TBS)."
      />

      <section className="section" style={{ paddingTop: "40px" }}>
        {/* Controls Bar: Search, Category Pills, Sort */}
        <div className="catalog-controls-container">
          {/* Search Box */}
          <div className="catalog-search-wrap">
            <Search size={18} className="catalog-search-icon" aria-hidden="true" />
            <input
              type="search"
              className="catalog-search-input"
              placeholder="Search by formulation name, SKU, or active category..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              aria-label="Search product catalogue"
            />
            {searchTerm && (
              <button
                type="button"
                className="catalog-search-clear"
                onClick={() => handleSearchChange("")}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="catalog-sort-wrap">
            <ArrowUpDown size={16} className="text-muted" aria-hidden="true" />
            <label htmlFor="catalog-sort" className="sr-only">
              Sort products
            </label>
            <select
              id="catalog-sort"
              className="catalog-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
              <option value="sku-asc">SKU: Sequential</option>
            </select>
          </div>
        </div>

        {/* Category Pills Navigation */}
        <div className="catalog-category-bar" role="tablist" aria-label="Product categories">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            const count =
              cat === "All"
                ? catalogList.length
                : catalogList.filter((p) => p.category === cat).length;

            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`catalog-category-pill ${isSelected ? "active" : ""}`}
                onClick={() => handleCategorySelect(cat)}
              >
                <span>{cat}</span>
                <span className="catalog-pill-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Results Counter & Active Filters Bar */}
        <div className="catalog-results-header">
          <p className="catalog-count-text">
            Showing <strong>{filteredProducts.length}</strong> of{" "}
            <strong>{catalogList.length}</strong> verified formulations
            {selectedCategory !== "All" && ` in ${selectedCategory}`}
            {searchTerm && ` matching "${searchTerm}"`}
          </p>

          {(searchTerm || selectedCategory !== "All") && (
            <button
              type="button"
              className="catalog-reset-btn"
              onClick={handleClearFilters}
            >
              <X size={14} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Product Grid, Loading, Error or Empty State */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent align-[-0.125em]" />
            <p className="mt-3 text-sm text-muted-foreground">Loading verified pharmaceutical catalogue...</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
            <p className="font-semibold text-sm">Catalogue Service Unavailable</p>
            <p className="mt-1 text-xs text-rose-700">{error}</p>
            <button
              onClick={loadLiveProducts}
              className="mt-4 rounded-lg bg-rose-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-800"
            >
              Retry Connection
            </button>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="catalog-products-grid">
            {filteredProducts.map((product) => (
              <article key={product.id} className="product-card">
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
                    {product.dosageForm && (
                      <div className="product-pack-size">
                        <strong>Dosage Form:</strong> {product.dosageForm}
                      </div>
                    )}
                    <div className="product-cert-list">
                      {product.certifications.map((cert) => (
                        <span key={cert} className="product-cert-tag">
                          <CheckCircle2 size={12} color="var(--primary)" />
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="product-card-actions" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <button
                      type="button"
                      className="product-card-btn"
                      onClick={() => setActiveModalProduct(product)}
                      aria-label={`View dossier for ${product.name}`}
                    >
                      <FileText size={14} />
                      <span>Dossier</span>
                    </button>

                    <Link
                      href={`/contact?type=product&product=${encodeURIComponent(product.sku)}&name=${encodeURIComponent(product.name)}`}
                      className="primary-button"
                      style={{ padding: "8px 12px", fontSize: "13px", justifyContent: "center" }}
                    >
                      <span>Inquire</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="catalog-empty-state">
            <div className="catalog-empty-icon">
              <Boxes size={36} color="var(--text-muted)" />
            </div>
            <h3>No Formulations Match Your Search</h3>
            <p>
              We couldn&apos;t find any formulations matching your active search and category filters.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={handleClearFilters}
              style={{ marginTop: "16px" }}
            >
              Clear All Filters
            </button>
          </div>
        )}
      </section>

      {/* Technical Product Dossier Modal */}
      {activeModalProduct && (
        <div
          className="modal-backdrop"
          onClick={() => setActiveModalProduct(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-product-title"
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="modal-sku">{activeModalProduct.sku}</span>
                <h3 id="modal-product-title" className="modal-title">
                  {activeModalProduct.name}
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveModalProduct(null)}
                aria-label="Close product dossier modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-image-row">
                <div className="modal-image-box">
                  <img
                    src={activeModalProduct.image}
                    alt={activeModalProduct.name}
                    className="modal-image"
                  />
                </div>
                <div>
                  <span className="product-category-pill" style={{ display: "inline-block", marginBottom: 8 }}>
                    {activeModalProduct.category}
                  </span>
                  <p className="modal-desc">{activeModalProduct.description}</p>
                </div>
              </div>

              <div className="modal-specs-table">
                <div className="modal-spec-row">
                  <span className="modal-spec-label">Dosage Form</span>
                  <span className="modal-spec-value">{activeModalProduct.dosageForm || "Not Specified"}</span>
                </div>
                <div className="modal-spec-row">
                  <span className="modal-spec-label">Standard Pack Size</span>
                  <span className="modal-spec-value">{activeModalProduct.packSize}</span>
                </div>
                <div className="modal-spec-row">
                  <span className="modal-spec-label">Shelf Life</span>
                  <span className="modal-spec-value">{activeModalProduct.shelfLife || "24 Months"}</span>
                </div>
                <div className="modal-spec-row">
                  <span className="modal-spec-label">Storage Conditions</span>
                  <span className="modal-spec-value">{activeModalProduct.storageConditions || "Controlled room temperature"}</span>
                </div>
                <div className="modal-spec-row">
                  <span className="modal-spec-label">Compliance & Registrations</span>
                  <span className="modal-spec-value">
                    {activeModalProduct.certifications.join(" · ")}
                  </span>
                </div>
              </div>

              <div className="modal-notice">
                <Info size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  Technical Dossier in Common Technical Document (CTD) format, Stability Data, and Batch Certificates of Analysis (CoA) are available upon registered institutional request.
                </span>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setActiveModalProduct(null)}
              >
                Close
              </button>
              <Link
                href={`/contact?type=product&product=${encodeURIComponent(activeModalProduct.sku)}&name=${encodeURIComponent(activeModalProduct.name)}`}
                className="primary-button"
              >
                <span>Request Commercial Supply</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

