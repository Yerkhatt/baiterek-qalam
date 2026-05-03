import type { FormNode, FormSchema } from "@qalam/form-engine";
import { describe, expect, it } from "vitest";
import { SWITCH_EXTRA_OUTPUT_ID } from "./nodeTypeRegistry";
import {
  applyAutoLayout,
  bezierEdgePath,
  buildEdgeList,
  buildEdgeListFromSchema,
  deriveNextFromEdges,
  deriveEdgesFromNodes,
  estimateConstructorNodeCardHeight,
  estimateConstructorNodeOuterHeight,
  fitViewportToNodes,
  normalizeNext,
  nodesBoundingBox,
  validateGraphStructure,
  withSyncedEdges
} from "./graph";

describe("normalizeNext", () => {
  it("normalizes string and arrays", () => {
    expect(normalizeNext(undefined)).toEqual([]);
    expect(normalizeNext("a")).toEqual(["a"]);
    expect(normalizeNext(["a", "b"])).toEqual(["a", "b"]);
  });
});

describe("deriveEdgesFromNodes / withSyncedEdges", () => {
  const nodes: FormNode[] = [
    { id: "a", type: "step", next: ["b", "c"] },
    { id: "b", type: "end" },
    { id: "c", type: "end" }
  ];

  it("creates one edge per next target with stable ids", () => {
    const edges = deriveEdgesFromNodes(nodes);
    expect(edges).toHaveLength(2);
    expect(edges.map((e) => e.to).sort()).toEqual(["b", "c"]);
  });

  it("buildEdgeList matches deriveEdgesFromNodes", () => {
    expect(buildEdgeList(nodes)).toEqual(deriveEdgesFromNodes(nodes));
  });

  it("withSyncedEdges attaches edges from next only", () => {
    const schema: FormSchema = { schemaVersion: 1, start: "a", nodes };
    const synced = withSyncedEdges(schema);
    expect(synced.edges?.every((e) => e.from === "a")).toBe(true);
  });

  it("keeps explicit edges and synchronizes node.next from edges", () => {
    const schema: FormSchema = {
      schemaVersion: 1,
      start: "a",
      nodes,
      edges: [
        { id: "a_true", from: "a", to: "b", fromPort: "true", toPort: "in", priority: 0 },
        { id: "a_false", from: "a", to: "c", fromPort: "false", toPort: "in", priority: 1 }
      ]
    };
    const synced = withSyncedEdges(schema);
    expect(synced.edges).toHaveLength(2);
    expect(synced.nodes.find((n) => n.id === "a")?.next).toEqual(["b", "c"]);
    expect(buildEdgeListFromSchema(synced).map((e) => e.id).sort()).toEqual(["a_false", "a_true"]);
  });

  it("deriveNextFromEdges respects edge priority", () => {
    const updated = deriveNextFromEdges(
      nodes,
      [
        { id: "second", from: "a", to: "c", priority: 10 },
        { id: "first", from: "a", to: "b", priority: 1 }
      ]
    );
    expect(updated.find((n) => n.id === "a")?.next).toEqual(["b", "c"]);
  });

  it("empty explicit edges clear node.next (constructor link delete)", () => {
    const schema: FormSchema = {
      schemaVersion: 1,
      start: "start",
      nodes: [
        { id: "start", type: "start", next: "end", position: { x: 0, y: 0 } },
        { id: "end", type: "end", position: { x: 1, y: 1 } }
      ],
      edges: []
    };
    const synced = withSyncedEdges(schema);
    expect(synced.edges).toEqual([]);
    expect(synced.nodes.find((n) => n.id === "start")?.next).toBeUndefined();
  });

  it("keeps only valid switch route edges and injects route condition", () => {
    const schema: FormSchema = {
      schemaVersion: 1,
      start: "start",
      nodes: [
        { id: "start", type: "start", next: "switch_1", position: { x: 0, y: 0 } },
        { id: "switch_1", type: "switch", position: { x: 1, y: 1 }, switch: {
          mode: "rules",
          sourceFieldId: "transport",
          routes: [{ id: "car", value: "car" }, { id: "truck", value: "truck" }],
          fallback: { mode: "none" }
        } },
        { id: "car_end", type: "end", position: { x: 2, y: 2 } },
        { id: "orphan", type: "end", position: { x: 3, y: 3 } }
      ],
      edges: [
        { id: "e_car", from: "switch_1", to: "car_end", fromPort: "car" },
        { id: "e_removed", from: "switch_1", to: "orphan", fromPort: "plane" }
      ]
    };
    const synced = withSyncedEdges(schema);
    expect(synced.edges?.map((edge) => edge.id)).toEqual(["e_car"]);
    expect(synced.edges?.[0].condition).toEqual({ "==": [{ var: "values.transport" }, "car"] });
  });

  it("allows switch fallback extra edge only when configured", () => {
    const schema: FormSchema = {
      schemaVersion: 1,
      start: "start",
      nodes: [
        { id: "start", type: "start", next: "switch_1", position: { x: 0, y: 0 } },
        { id: "switch_1", type: "switch", position: { x: 1, y: 1 }, switch: {
          mode: "expression",
          expression: { var: "values.target" },
          numberOutputs: 2,
          routes: [],
          fallback: { mode: "extra" }
        } },
        { id: "fallback", type: "end", position: { x: 2, y: 2 } }
      ],
      edges: [
        { id: "e_fallback", from: "switch_1", to: "fallback", fromPort: SWITCH_EXTRA_OUTPUT_ID }
      ]
    };
    const synced = withSyncedEdges(schema);
    expect(synced.edges).toHaveLength(1);
    expect(synced.edges?.[0].fromPort).toBe(SWITCH_EXTRA_OUTPUT_ID);
  });
});

describe("validateGraphStructure", () => {
  it("allows terminal sign as graph leaf (no dead_end warning)", () => {
    const schema: FormSchema = {
      schemaVersion: 1,
      start: "start",
      nodes: [
        { id: "start", type: "start", next: "sign_1", title_key: "Старт" },
        { id: "sign_1", type: "sign", title_key: "Подпись" }
      ]
    };
    const issues = validateGraphStructure(withSyncedEdges(schema));
    expect(issues.filter((i) => i.messageKey === "forms.graph_node_dead_end")).toHaveLength(0);
  });

  it("flags missing start and recommends end", () => {
    const schema: FormSchema = {
      schemaVersion: 1,
      start: "missing",
      nodes: [{ id: "n1", type: "step" }]
    };
    const issues = validateGraphStructure(withSyncedEdges(schema));
    expect(issues.some((i) => i.messageKey === "forms.graph_start_missing")).toBe(true);
  });

  it("flags multiple start nodes", () => {
    const schema: FormSchema = {
      schemaVersion: 1,
      start: "start_1",
      nodes: [
        { id: "start_1", type: "start", next: "end" },
        { id: "start_2", type: "start", next: "end" },
        { id: "end", type: "end" }
      ]
    };
    const issues = validateGraphStructure(withSyncedEdges(schema));
    expect(issues.some((i) => i.messageKey === "forms.graph_start_count_invalid")).toBe(true);
  });

  it("flags missing node-specific settings", () => {
    const schema: FormSchema = {
      schemaVersion: 1,
      start: "start",
      nodes: [
        { id: "start", type: "start", next: "step_1" },
        { id: "step_1", type: "step", next: "end" },
        { id: "end", type: "end" }
      ]
    };
    const issues = validateGraphStructure(withSyncedEdges(schema));
    expect(issues.some((i) => i.messageKey === "forms.graph_node_settings_invalid")).toBe(true);
  });

  it("flags switch node without source field", () => {
    const schema: FormSchema = {
      schemaVersion: 1,
      start: "start",
      nodes: [
        { id: "start", type: "start", next: "step_1" },
        { id: "step_1", type: "step", title_key: "Step A", fields: [{ id: "transport", label_key: "Transport", type: "text" }], next: "switch_1" },
        { id: "switch_1", type: "switch", title_key: "Router", switch: {
          mode: "rules",
          routes: [{ id: "route_1", value: "yes", label: "Yes" }],
          fallback: { mode: "none" }
        }, next: "end" },
        { id: "end", type: "end" }
      ]
    };
    const issues = validateGraphStructure(withSyncedEdges(schema));
    expect(
      issues.some(
        (issue) =>
          issue.messageKey === "forms.graph_node_settings_invalid" &&
          issue.params?.nodeId === "switch_1" &&
          issue.params?.key === "source"
      )
    ).toBe(true);
  });

  it("warns when a path reaches end without configured integration", () => {
    const schema: FormSchema = {
      schemaVersion: 1,
      start: "start",
      nodes: [
        { id: "start", type: "start", next: "step_1" },
        {
          id: "step_1",
          type: "step",
          title_key: "Step A",
          fields: [{ id: "a", label_key: "A", type: "text" }],
          next: "end"
        },
        { id: "end", type: "end" }
      ]
    };
    const issues = validateGraphStructure(withSyncedEdges(schema));
    expect(issues.some((i) => i.messageKey === "forms.graph_path_without_integration")).toBe(true);
  });

  it("does not warn when integration with URL precedes end", () => {
    const schema: FormSchema = {
      schemaVersion: 1,
      start: "start",
      nodes: [
        { id: "start", type: "start", next: "step_1" },
        {
          id: "step_1",
          type: "step",
          title_key: "Step A",
          fields: [{ id: "a", label_key: "A", type: "text" }],
          next: "int_1"
        },
        {
          id: "int_1",
          type: "integration_call",
          title_key: "ERP",
          integration: {
            id: "i1",
            adapter: "erp_mock",
            url: "/api/erp/mock-leasing",
            payload_map: { values: { var: "values" } }
          },
          next: "end"
        },
        { id: "end", type: "end" }
      ]
    };
    const issues = validateGraphStructure(withSyncedEdges(schema));
    expect(issues.some((i) => i.messageKey === "forms.graph_path_without_integration")).toBe(false);
  });
});

describe("bezierEdgePath", () => {
  it("returns cubic path", () => {
    const d = bezierEdgePath(0, 10, 100, 20, 1);
    expect(d).toMatch(/^M /);
    expect(d).toContain(" C ");
  });
});

describe("applyAutoLayout", () => {
  it("layers nodes left-to-right by graph depth", () => {
    const schema: FormSchema = {
      schemaVersion: 1,
      start: "start",
      nodes: [
        { id: "start", type: "start", next: "a", position: { x: 9, y: 9 } },
        { id: "a", type: "step", next: "end", position: { x: 9, y: 9 } },
        { id: "end", type: "end", position: { x: 9, y: 9 } }
      ]
    };
    const laid = applyAutoLayout(withSyncedEdges(schema));
    expect(laid.nodes.find((n) => n.id === "start")?.position?.x).toBe(0);
    expect(laid.nodes.find((n) => n.id === "a")?.position?.x).toBe(280);
    expect(laid.nodes.find((n) => n.id === "end")?.position?.x).toBe(560);
  });

  it("stacks same-layer nodes by true heights and centers the column (no overlap)", () => {
    const tallSwitch: FormNode = {
      id: "tall",
      type: "switch",
      switch: {
        mode: "rules",
        sourceFieldId: "x",
        routes: [
          { id: "r0", label: "A", value: "a" },
          { id: "r1", label: "B", value: "b" },
          { id: "r2", label: "C", value: "c" },
          { id: "r3", label: "D", value: "d" },
          { id: "r4", label: "E", value: "e" }
        ],
        fallback: { mode: "none" }
      },
      next: "end"
    };
    const schema: FormSchema = {
      schemaVersion: 1,
      start: "start",
      nodes: [
        { id: "start", type: "start", next: ["short", "tall"], position: { x: 0, y: 0 } },
        { id: "short", type: "step", next: "end", position: { x: 0, y: 0 } },
        tallSwitch,
        { id: "end", type: "end", position: { x: 0, y: 0 } }
      ]
    };
    const laid = applyAutoLayout(withSyncedEdges(schema));
    const short = laid.nodes.find((n) => n.id === "short")!;
    const tall = laid.nodes.find((n) => n.id === "tall")!;
    expect(short.position?.x).toBe(tall.position?.x);

    const hShort = estimateConstructorNodeOuterHeight(short);
    const hTall = estimateConstructorNodeOuterHeight(tall);
    const yShort = short.position!.y;
    const yTall = tall.position!.y;
    const top = Math.min(yShort, yTall);
    const bottom = Math.max(yShort + hShort, yTall + hTall);
    expect(Math.abs(top + bottom)).toBeLessThan(1e-6);

    const G = 36;
    if (yShort < yTall) {
      expect(yShort + hShort + G).toBeLessThanOrEqual(yTall + 1e-6);
    } else {
      expect(yTall + hTall + G).toBeLessThanOrEqual(yShort + 1e-6);
    }
  });
});

describe("estimateConstructorNodeCardHeight", () => {
  it("grows with switch branch outputs", () => {
    const sw: FormNode = {
      id: "sw",
      type: "switch",
      switch: {
        mode: "rules",
        sourceFieldId: "x",
        routes: [
          { id: "r0", label: "A", value: "a" },
          { id: "r1", label: "B", value: "b" },
          { id: "r2", label: "C", value: "c" },
          { id: "r3", label: "D", value: "d" },
          { id: "r4", label: "E", value: "e" }
        ],
        fallback: { mode: "none" }
      }
    };
    expect(estimateConstructorNodeCardHeight(sw)).toBeGreaterThan(100);
  });

  it("stays compact for single-output nodes", () => {
    const st: FormNode = { id: "s", type: "start" };
    expect(estimateConstructorNodeCardHeight(st)).toBe(100);
  });
});

describe("nodesBoundingBox / fitViewportToNodes", () => {
  it("fits bbox with padding inside viewport", () => {
    const positions = { a: { x: 0, y: 0 }, b: { x: 200, y: 100 } };
    const bbox = nodesBoundingBox(positions, ["a", "b"], 0);
    expect(bbox).not.toBeNull();
    const fit = fitViewportToNodes(400, 300, bbox!, 0.2, 2);
    expect(fit.zoom).toBeGreaterThanOrEqual(0.2);
    expect(fit.zoom).toBeLessThanOrEqual(2);
  });
});
