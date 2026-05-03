import { describe, expect, it } from "vitest";
import type { FormSchema } from "@qalam/form-engine";
import { getUpstreamFieldRefs, getUpstreamFields } from "./graphTraversal";

const baseSchema = (): FormSchema => ({
  schemaVersion: 1,
  start: "start",
  nodes: [
    { id: "start", type: "start", next: "a", position: { x: 0, y: 0 } },
    {
      id: "a",
      type: "step",
      next: "b",
      position: { x: 0, y: 0 },
      fields: [{ id: "fa", label_key: "A", type: "text" }]
    },
    {
      id: "b",
      type: "step",
      next: "sw",
      position: { x: 0, y: 0 },
      fields: [{ id: "fb", label_key: "B", type: "text" }]
    },
    { id: "sw", type: "switch", position: { x: 0, y: 0 } }
  ],
  edges: [
    { id: "e1", from: "start", to: "a", fromPort: "main", toPort: "in" },
    { id: "e2", from: "a", to: "b", fromPort: "main", toPort: "in" },
    { id: "e3", from: "b", to: "sw", fromPort: "main", toPort: "in" }
  ]
});

describe("getUpstreamFields", () => {
  it("collects fields from upstream steps in order of traversal", () => {
    const schema = baseSchema();
    const ids = getUpstreamFields("sw", schema).map((f) => f.id);
    expect(ids).toContain("fa");
    expect(ids).toContain("fb");
  });

  it("dedupes duplicate field ids", () => {
    const schema = baseSchema();
    schema.nodes[1] = {
      ...schema.nodes[1],
      fields: [
        { id: "dup", type: "text" },
        { id: "x", type: "text" }
      ]
    };
    schema.nodes[2] = {
      ...schema.nodes[2],
      fields: [{ id: "dup", type: "number" }]
    };
    const fields = getUpstreamFields("sw", schema);
    expect(fields.filter((f) => f.id === "dup")).toHaveLength(1);
  });

  it("does not infinite-loop on a cycle", () => {
    const schema = baseSchema();
    schema.edges = [...(schema.edges ?? []), { id: "cyc", from: "sw", to: "b", fromPort: "r0", toPort: "in" }];
    expect(() => getUpstreamFields("sw", schema)).not.toThrow();
    expect(getUpstreamFields("sw", schema).length).toBeGreaterThan(0);
  });
});

describe("getUpstreamFieldRefs", () => {
  it("includes source node for labels", () => {
    const schema = baseSchema();
    const refs = getUpstreamFieldRefs("sw", schema);
    const stepIds = new Set(refs.map((r) => r.sourceNode.id));
    expect(stepIds.has("a")).toBe(true);
    expect(stepIds.has("b")).toBe(true);
  });
});
