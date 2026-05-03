import ru from "@/locales/ru-KZ.json";

export const LOCALE = "ru-KZ" as const;
export type Locale = typeof LOCALE;

export const messages: Record<Locale, Record<string, unknown>> = {
  "ru-KZ": ru
};

const PARAM_REGEX = /\{(\w+)\}/g;

export function t(
  key: string,
  params: Record<string, string | number> = {},
  locale: Locale = LOCALE
): string {
  const messageTree = messages[locale];
  const path = key.split(".");
  let value: unknown = messageTree;

  for (const segment of path) {
    if (value && typeof value === "object" && segment in (value as Record<string, unknown>)) {
      value = (value as Record<string, unknown>)[segment];
    } else {
      return key;
    }
  }

  if (typeof value !== "string") {
    return key;
  }

  return value.replace(PARAM_REGEX, (_, token) => {
    const replacement = params[token];
    return replacement === undefined ? `{${token}}` : String(replacement);
  });
}
