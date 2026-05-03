export type { NodeTypeName } from "@/lib/constructor/nodeTypeMeta";
export { NODE_TYPE_ACCENT, NODE_TYPE_DESCRIPTION, NODE_TYPE_LABEL } from "@/lib/constructor/nodeTypeMeta";

export function NodeIcon({ type, size = 18 }: { type: string; size?: number }) {
  const s = size;
  switch (type) {
    case "start":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <path d="M8.5 1.5L3 9h4.5L6 14.5l7.5-8.5H9l.5-4.5z" fill="currentColor" />
        </svg>
      );
    case "step":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2.5" width="12" height="2" rx="1" fill="currentColor" />
          <rect x="2" y="7" width="12" height="2" rx="1" fill="currentColor" />
          <rect x="2" y="11.5" width="8" height="2" rx="1" fill="currentColor" />
        </svg>
      );
    case "branch":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <path
            d="M8 2v5M8 7l-4 6M8 7l4 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "switch":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <path
            d="M2 4h5m0 0-2-2m2 2-2 2M2 8h8m0 0-2-2m2 2-2 2M2 12h11m0 0-2-2m2 2-2 2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "validation_gate":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <path
            d="M8 2L3 4.5v3.5c0 2.8 2.2 5.4 5 6 2.8-.6 5-3.2 5-6V4.5L8 2z"
            fill="currentColor"
            fillOpacity="0.25"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path
            d="M5.5 8.5l2 2 3-3"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "calculation":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <path
            d="M12 3H5l4 5-4 5h7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "document_request":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <path
            d="M4 2h6l3 3v9a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z"
            fill="currentColor"
            fillOpacity="0.2"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path
            d="M10 2v3h3"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M5.5 8.5h5M5.5 11h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "integration_call":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M5 8h6M8 5v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "approval":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M5 8l2.5 2.5L11 5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "sign":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <path
            d="M3 11c2.5-4 6.5-7 10-8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M10 3l2 2.5L10 8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "end":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <rect
            x="3"
            y="3"
            width="10"
            height="10"
            rx="2.5"
            fill="currentColor"
            fillOpacity="0.25"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <rect x="6" y="6" width="4" height="4" rx="1" fill="currentColor" />
        </svg>
      );
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
  }
}
