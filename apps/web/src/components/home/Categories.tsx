import Link from "next/link";

const categories = [
  {
    name: "Tablets",
    image: "/images/products/tablets.jpg",
    description: "Nutritional and therapeutic formulations.",
  },
  {
    name: "Syrups / Susp.",
    image: "/images/products/syrups.jpg",
    description: "Liquid formulations for everyday wellness.",
  },
  {
    name: "Paediatric Drops",
    image: "/images/products/drops.jpg",
    description: "Nutrition solutions for children.",
  },
  {
    name: "Capsules",
    image: "/images/products/capsules.jpg",
    description: "High-quality nutritional capsules.",
  },
  {
    name: "Oil Filled Capsules",
    image: "/images/products/softgels.jpg",
    description: "Advanced nutrition with essential oils.",
  },
];

export default function Categories() {
  return (
    <section className="categories section">
      <div className="section-heading">
        <span className="eyebrow">OUR PRODUCT PORTFOLIO</span>
        <h2>Product Categories & Formulations</h2>
        <p>
          Explore our range of healthcare and wellness formulations.
        </p>
      </div>

      <div className="category-grid">
        {categories.map((category) => (
          <article className="category-card" key={category.name}>
            <img src={category.image} alt={category.name} />
            <div className="category-content">
              <h3>{category.name}</h3>
              <p>{category.description}</p>
              <Link href={`/products?category=${encodeURIComponent(category.name)}`}>
                Explore Products →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
