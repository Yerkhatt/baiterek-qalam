import type { ServiceMetadata } from "@qalam/form-engine";
import type { SchemaSummary } from "@/lib/schemaApi";

export type ServiceCardView = {
  serviceId: string;
  href: string;
  title: string;
  summary: string;
  metadata?: ServiceMetadata;
};

export function getPublishedSchemas(summaries: SchemaSummary[]): SchemaSummary[] {
  return summaries.filter((item) => item.status === "published");
}

/** First non-empty line of briefing (or empty). */
export function briefingTitleLine(text: string | undefined): string {
  const raw = (text ?? "").trim();
  if (!raw) return "";
  const line = raw.split(/\r?\n/).find((l) => l.trim().length > 0);
  return (line ?? "").trim();
}

/** Remaining text after first line, truncated for card excerpt. */
export function briefingExcerptAfterFirstLine(text: string | undefined, maxLen = 200): string {
  const raw = (text ?? "").trim();
  if (!raw) return "";
  const lines = raw.split(/\r?\n/).map((l) => l.trim());
  const nonEmpty = lines.filter((l) => l.length > 0);
  if (nonEmpty.length <= 1) return "";
  const rest = nonEmpty.slice(1).join("\n").trim();
  if (rest.length <= maxLen) return rest;
  return `${rest.slice(0, maxLen)}…`;
}

/**
 * If `primary` is the demo placeholder "test" (case-insensitive) and differs from `fallback`,
 * return `fallback`. Otherwise `primary` if non-empty, else `fallback`.
 * Used for catalog cards, cabinet list, and eGov pending payload.
 */
export function resolveStaleDemoTitle(primary: string, fallback: string): string {
  const p = primary.trim();
  const f = fallback.trim();
  if (p.length > 0 && f.length > 0 && p.toLowerCase() === "test" && p.toLowerCase() !== f.toLowerCase()) {
    return f;
  }
  return p || f;
}

/** Title shown on public catalog cards; embedded in API list payload from published schema.metadata.title. */
export function catalogCardTitle(summary: SchemaSummary): string {
  return resolveStaleDemoTitle(summary.metadata?.title ?? "", summary.serviceId);
}

export function mapSummaryToCard(summary: SchemaSummary): ServiceCardView {
  const metadata = summary.metadata;
  const title = catalogCardTitle(summary);
  const briefing = (metadata?.visitorBriefing ?? "").trim();
  const excerpt = briefingExcerptAfterFirstLine(metadata?.visitorBriefing);
  const summaryText =
    excerpt.length > 0
      ? excerpt
      : briefing.length > 0
        ? briefing.length > 220
          ? `${briefing.slice(0, 220)}…`
          : briefing
        : "";

  return {
    serviceId: summary.serviceId,
    href: `/services/${encodeURIComponent(summary.serviceId)}`,
    title,
    summary: summaryText,
    metadata
  };
}
