const stats = [
  { value: "28+", label: "FORMULATIONS", detail: "Dietary supplements" },
  { value: "WHO-GMP", label: "MANUFACTURING", detail: "Certified facility" },
  { value: "TBS REG.", label: "COMPLIANCE", detail: "Tanzania standards" },
  { value: "3 COUNTRIES", label: "PARTNERSHIP", detail: "USA · India · Tanzania" },
];

export default function Stats() {
  return (
    <section className="stats-section">
      <div className="stats-grid">
        {stats.map((item) => (
          <article className="stat-card" key={item.label}>
            <h2>{item.value}</h2>
            <strong>{item.label}</strong>
            <p>{item.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
