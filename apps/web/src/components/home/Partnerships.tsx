import { Building2, Globe2, Landmark } from "lucide-react";

export default function Partnerships() {
  const hubs = [
    {
      region: "United States",
      role: "Strategic R&D & Formulation Technology",
      icon: Globe2,
    },
    {
      region: "India",
      role: "WHO-GMP Certified Advanced Manufacturing Facilities",
      icon: Building2,
    },
    {
      region: "Tanzania & East Africa",
      role: "Import Distribution, TBS Registry & Commercial Network",
      icon: Landmark,
    },
  ];

  return (
    <section className="partnerships-section">
      <div className="section-heading" style={{ marginBottom: "30px" }}>
        <span className="eyebrow">GLOBAL PRESENCE</span>
        <h2>International Health Alliance</h2>
        <p>
          Leveraging clinical expertise and trusted supply channels across three nations.
        </p>
      </div>

      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "24px",
        }}
      >
        {hubs.map((hub) => {
          const IconComponent = hub.icon;
          return (
            <div
              key={hub.region}
              style={{
                background: "white",
                padding: "30px",
                borderRadius: "14px",
                border: "1px solid #dce8e0",
                display: "flex",
                gap: "16px",
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  background: "#e8f4ee",
                  padding: "12px",
                  borderRadius: "10px",
                  color: "var(--primary)",
                  flexShrink: 0,
                }}
              >
                <IconComponent size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: "18px", margin: "0 0 6px 0" }}>{hub.region}</h3>
                <p style={{ margin: 0, fontSize: "14px", color: "var(--muted)", lineHeight: 1.6 }}>
                  {hub.role}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

