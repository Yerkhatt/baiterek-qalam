import type { FormNode } from "@qalam/form-engine";
import ru from "@/locales/ru-KZ.json";
import { NODE_TYPE_LABEL, type NodeTypeName } from "@/lib/constructor/nodeTypeMeta";

/**
 * True when `title_key` looks like an i18n dot-path (e.g. `forms.constructor.new_switch`).
 * Free-form titles with spaces, Cyrillic phrases, or single segments stay literal.
 */
export function isLikelyI18nKey(key: string): boolean {
  const k = key.trim();
  if (!k.includes(".")) {
    return false;
  }
  return /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i.test(k);
}

/** Resolve `forms.foo.bar` against bundled ru-KZ strings. */
export function lookupLocaleString(dotPath: string): string | null {
  const segments = dotPath.split(".").filter(Boolean);
  let cur: unknown = ru;
  for (const seg of segments) {
    if (cur && typeof cur === "object" && seg in cur) {
      cur = (cur as Record<string, unknown>)[seg];
    } else {
      return null;
    }
  }
  return typeof cur === "string" ? cur : null;
}

/**
 * Text for the title field in the inspector: resolves `forms.*` keys to Russian;
 * returns empty string when no title is set (no fallback to type name).
 */
export function getEditorTitleValue(node: FormNode): string {
  const key = node.title_key?.trim();
  if (!key) return "";
  if (isLikelyI18nKey(key)) {
    let resolved = lookupLocaleString(key);
    if (resolved) return resolved;
    if (key.endsWith(".title")) {
      resolved = lookupLocaleString(key.slice(0, -".title".length));
      if (resolved) return resolved;
    }
  }
  return key;
}

/** Primary label for canvas + inspector: localized title or type name — not the raw node id. */
export function getConstructorNodeTitle(node: FormNode): string {
  const key = node.title_key?.trim();
  if (key) {
    if (isLikelyI18nKey(key)) {
      let resolved = lookupLocaleString(key);
      if (resolved) return resolved;
      if (key.endsWith(".title")) {
        resolved = lookupLocaleString(key.slice(0, -".title".length));
        if (resolved) return resolved;
      }
    }
    return key;
  }
  return NODE_TYPE_LABEL[node.type as NodeTypeName] ?? node.type;
}

/** Default i18n keys for newly added nodes (must exist under `forms.constructor` in ru-KZ). */
export function getDefaultTitleKeyForNodeType(type: NodeTypeName): string | undefined {
  const map: Partial<Record<NodeTypeName, string>> = {
    step: "forms.constructor.new_step",
    branch: "forms.constructor.new_branch",
    switch: "forms.constructor.new_switch",
    validation_gate: "forms.constructor.new_validation_gate",
    calculation: "forms.constructor.new_calculation",
    document_request: "forms.constructor.new_document_request",
    integration_call: "forms.constructor.new_integration_call",
    sign: "forms.constructor.new_sign",
    approval: "forms.constructor.new_approval"
  };
  return map[type];
}
