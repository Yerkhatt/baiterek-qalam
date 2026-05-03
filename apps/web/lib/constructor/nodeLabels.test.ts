import type { FormNode } from "@qalam/form-engine";
import { describe, expect, it } from "vitest";
import {
  getConstructorNodeTitle,
  getEditorTitleValue,
  isLikelyI18nKey
} from "./nodeLabels";

describe("isLikelyI18nKey", () => {
  it("accepts dotted ascii paths", () => {
    expect(isLikelyI18nKey("forms.constructor.new_switch")).toBe(true);
    expect(isLikelyI18nKey("leasing.project.title")).toBe(true);
  });

  it("rejects spaces and cyrillic free text", () => {
    expect(isLikelyI18nKey("выбор лизинга")).toBe(false);
    expect(isLikelyI18nKey("  hello world  ")).toBe(false);
  });

  it("rejects single segment without dots", () => {
    expect(isLikelyI18nKey("Router")).toBe(false);
    expect(isLikelyI18nKey("")).toBe(false);
  });
});

describe("getConstructorNodeTitle", () => {
  it("returns literal cyrillic title with spaces", () => {
    const node = { id: "s1", type: "switch" as const, title_key: "выбор лизинга" };
    expect(getConstructorNodeTitle(node)).toBe("выбор лизинга");
  });

  it("resolves known i18n key from locale bundle", () => {
    const node: FormNode = {
      id: "s1",
      type: "switch",
      title_key: "forms.constructor.new_switch"
    };
    expect(getConstructorNodeTitle(node)).toBe("Switch по ответу");
  });

  it("falls back to type label when no title_key", () => {
    const node: FormNode = { id: "e1", type: "end" };
    expect(getConstructorNodeTitle(node)).toBe("Финиш");
  });
});

describe("getEditorTitleValue", () => {
  it("shows literal text for free-form titles", () => {
    const node: FormNode = { id: "s1", type: "switch", title_key: "выбор лизинга" };
    expect(getEditorTitleValue(node)).toBe("выбор лизинга");
  });

  it("resolves i18n key for editor", () => {
    const node: FormNode = {
      id: "s1",
      type: "switch",
      title_key: "forms.constructor.new_switch"
    };
    expect(getEditorTitleValue(node)).toBe("Switch по ответу");
  });
});
