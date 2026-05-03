export default function SectionHeading({
  eyebrow,
  title,
  subtitle
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="stack section-heading">
      {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
      <div className="h2">{title}</div>
      {subtitle ? <div className="text-muted">{subtitle}</div> : null}
    </div>
  );
}
