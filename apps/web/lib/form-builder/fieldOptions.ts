/**
 * Single source of truth for choice options on FormField and Switch route derivation.
 * Switch compares {@link RuntimeState.values}[fieldId] to {@link FieldOption.value}, so values stay stable when authors edit labels only.
 */
import type { FieldOption, FormField, FormSchema, SwitchRoute } from "@qalam/form-engine";

/** Resolved row for UI: value is what Switch / runtime compares; labelText maps to FieldOption.label_key. */
export type ResolvedOptionRow = {
  value: string | number;
  labelText: string;
};

export function serializeSwitchRouteValue(value: string | number | boolean): string {
  return typeof value === "string" ? `str:${value}` : typeof value === "number" ? `num:${value}` : `bool:${value}`;
}

/** Same semantics as Switch field picker: inline options array or dictionary ref string. */
export function resolvedOptionsForField(
  field: FormField,
  schema: FormSchema
): Array<{ value: string | number; label: string }> {
  if (Array.isArray(field.options)) {
    return field.options.map((option) => ({
      value: option.value,
      label: option.label_key || String(option.value)
    }));
  }
  if (typeof field.options === "string") {
    const dictionary = schema.dictionaries?.[field.options] ?? [];
    return dictionary.map((option) => ({
      value: option.value,
      label: option.label_key || String(option.value)
    }));
  }
  return [];
}

export function resolvedOptionRows(field: FormField, schema: FormSchema): ResolvedOptionRow[] {
  return resolvedOptionsForField(field, schema).map((row) => ({
    value: row.value,
    labelText: row.label
  }));
}

/** Persists labels as typed; do not trim here — trimming on each keystroke strips trailing spaces while the user is still typing. */
export function rowsToFieldOptions(rows: ResolvedOptionRow[]): FieldOption[] {
  return rows.map((row) => ({
    value: row.value,
    label_key: row.labelText
  }));
}

/** Keep option values deterministic but hidden from the UI. */
export function syncOptionValueFromLabel(rows: ResolvedOptionRow[], rowIndex: number): ResolvedOptionRow[] {
  if (rowIndex < 0 || rowIndex >= rows.length) {
    return rows;
  }
  const existing = new Set(
    rows
      .filter((_, index) => index !== rowIndex)
      .map((row) => String(row.value))
  );
  const nextValue = suggestOptionValue(rows[rowIndex].labelText, rowIndex, existing);
  return rows.map((row, index) => (index === rowIndex ? { ...row, value: nextValue } : row));
}

/** Deterministic default routing value when the author only edits the label (Switch-compatible). */
export function suggestOptionValue(labelText: string, index: number, existingValues: Set<string>): string | number {
  const base = slugFromLabel(labelText, index);
  let candidate = base || `opt_${index}`;
  let suffix = 0;
  while (existingValues.has(String(candidate))) {
    suffix += 1;
    candidate = `${base || "opt"}_${index}_${suffix}`;
  }
  return candidate;
}

export function slugFromLabel(label: string, index: number): string {
  const trimmed = label.trim();
  if (!trimmed) return "";
  const ascii = trimmed
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  return ascii.slice(0, 48) || `opt_${index}`;
}

export function dictionaryKeys(schema: FormSchema): string[] {
  return Object.keys(schema.dictionaries ?? {});
}

export function createSwitchRouteId(index: number): string {
  return `route_${Date.now()}_${index}`;
}

/** Reuse stable Switch route ids when option values match (same graph handles after reorder). */
export function deriveSwitchRoutesFromField(
  field: FormField,
  schema: FormSchema,
  previousRoutes: SwitchRoute[]
): SwitchRoute[] {
  const options = resolvedOptionsForField(field, schema);
  const previousByValue = new Map(previousRoutes.map((route) => [serializeSwitchRouteValue(route.value), route]));
  return options.map((option, index) => ({
    id: previousByValue.get(serializeSwitchRouteValue(option.value))?.id ?? createSwitchRouteId(index),
    label: option.label,
    value: option.value
  }));
}
