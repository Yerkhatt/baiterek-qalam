type Stat = {
  value: string;
  label: string;
};

export default function StatsBand({ stats }: { stats: Stat[] }) {
  return (
    <div className="stat-grid">
      {stats.map((stat) => (
        <div className="stat-card" key={stat.label}>
          <div className="h2">{stat.value}</div>
          <div className="text-muted">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
