import Link from "next/link";

const VARIANTS = [
  { id: "v1", name: "Warm editorial", note: "Paper tones, serif headline, restrained borders." },
  { id: "v2", name: "Midnight command", note: "Dark sidebar, monospace KPIs, GitHub-adjacent clarity." },
  { id: "v3", name: "Aurora glass", note: "Mesh gradients, frosted cards, luminous accents." },
  { id: "v4", name: "Neo-brutalist", note: "Hard black strokes, yellow rail, offset shadows." },
  { id: "v5", name: "Soft SaaS", note: "Pastel wash, pill controls, friendly depth." }
] as const;

export default function AdminDesignPreviewIndexPage() {
  return (
    <div className="stack" style={{ maxWidth: 720, padding: "48px 32px", margin: "0 auto" }}>
      <h1 className="h2">Admin dashboard — design previews</h1>
      <p className="text-muted">
        Same content and structure as <code>/admin</code>; only visual treatment changes. Open a variant to compare
        full layouts.
      </p>
      <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {VARIANTS.map((v) => (
          <li key={v.id}>
            <Link
              className="card card--outline"
              href={`/admin/design-preview/${v.id}`}
              style={{ display: "block", textDecoration: "none", color: "inherit" }}
            >
              <div className="h3" style={{ marginBottom: 8 }}>
                {v.name}{" "}
                <span className="text-muted" style={{ fontWeight: 500 }}>
                  ({v.id})
                </span>
              </div>
              <div className="text-muted">{v.note}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
