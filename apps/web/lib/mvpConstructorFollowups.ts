/**
 * Follow-ups vs MVP_plan.md (constructor/runtime gap pass).
 * Ordered roughly by impact for the leasing control case.
 */
export const MVP_CONSTRUCTOR_FOLLOWUPS = [
  "Version history / rollback UI — GET /schemas/:serviceId/versions exists but no admin UI",
  "Calculated fields & table UX for leasing line items (items[])",
  "document_request — verify upload/storage matches control-case PDFs",
  "Integration: named credentials / encrypted secrets instead of raw headers in schema JSON",
  "Explicit «duplicate workflow» action (optional now that rename-on-save fixes accidental copies)"
] as const;
