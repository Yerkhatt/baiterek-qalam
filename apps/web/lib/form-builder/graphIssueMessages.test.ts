import type { FormSchema } from "@qalam/form-engine";
import { describe, expect, it } from "vitest";
import { validateGraphStructure, withSyncedEdges } from "./graph";
import { formatGraphIssue, graphIssueFocusNodeId } from "./graphIssueMessages";

describe("formatGraphIssue", () => {
  it("describes missing start", () => {
    const schema: FormSchema = {
      schemaVersion: 1,
      start: "missing",
      nodes: [{ id: "n1", type: "step" }]
    };
    const synced = withSyncedEdges(schema);
    const issue = validateGraphStructure(synced).find((i) => i.messageKey === "forms.graph_start_missing");
    expect(issue).toBeDefined();
    expect(formatGraphIssue(issue!, synced)).toContain("Старт");
  });

  it("includes node label and detail for settings_invalid", () => {
    const schema: FormSchema = {
      schemaVersion: 1,
      start: "start",
      nodes: [
        { id: "start", type: "start", next: "switch_1" },
        {
          id: "switch_1",
          type: "switch",
          title_key: "Router",
          switch: {
            mode: "rules",
            routes: [{ id: "route_1", value: "yes", label: "Yes" }],
            fallback: { mode: "none" }
          },
          next: "end"
        },
        { id: "end", type: "end" }
      ]
    };
    const synced = withSyncedEdges(schema);
    const issue = validateGraphStructure(synced).find(
      (i) => i.messageKey === "forms.graph_node_settings_invalid" && i.params?.nodeId === "switch_1"
    );
    expect(issue).toBeDefined();
    const text = formatGraphIssue(issue!, synced);
    expect(text).toContain("switch_1");
    expect(text).toMatch(/поле|источник/i);
    expect(graphIssueFocusNodeId(issue!)).toBe("switch_1");
  });

  it("formats broken edge", () => {
    const schema: FormSchema = {
      schemaVersion: 1,
      start: "start",
      nodes: [
        { id: "start", type: "start", next: "ghost" },
        { id: "end", type: "end" }
      ],
      edges: [{ id: "e1", from: "start", to: "ghost" }]
    };
    const synced = withSyncedEdges(schema);
    const issue = validateGraphStructure(synced).find((i) => i.messageKey === "forms.graph_broken_edge");
    expect(issue).toBeDefined();
    expect(formatGraphIssue(issue!, synced)).toContain("ghost");
    expect(graphIssueFocusNodeId(issue!)).toBe("start");
  });

  it("formats path without integration warning", () => {
    const schema: FormSchema = {
      schemaVersion: 1,
      start: "start",
      nodes: [
        { id: "start", type: "start", next: "end" },
        { id: "end", type: "end" }
      ]
    };
    const synced = withSyncedEdges(schema);
    const issue = validateGraphStructure(synced).find((i) => i.messageKey === "forms.graph_path_without_integration");
    expect(issue).toBeDefined();
    expect(formatGraphIssue(issue!, synced)).toMatch(/HTTPS/i);
  });
});
