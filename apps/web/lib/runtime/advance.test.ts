import { evaluateNode, type FormSchema, type RuntimeState } from "@qalam/form-engine";
import { describe, expect, it } from "vitest";
import { advanceToInteractiveNode } from "./advance";

const EMPTY_STATE: RuntimeState = {
  values: {},
  files: {},
  errors: {},
  visibility: {},
  required: {},
  stepStatus: {}
};

describe("advanceToInteractiveNode", () => {
  it("skips switch node and lands on routed form", async () => {
    const schema: FormSchema = {
      schemaVersion: 1,
      start: "step_a",
      nodes: [
        {
          id: "step_a",
          type: "step",
          fields: [{ id: "transport", type: "text", label_key: "Transport" }],
          next: "switch_1"
        },
        {
          id: "switch_1",
          type: "switch",
          switch: {
            mode: "rules",
            sourceFieldId: "transport",
            routes: [{ id: "route_yes", value: "yes", label: "Yes" }],
            fallback: { mode: "none" }
          }
        },
        { id: "step_yes", type: "step", fields: [{ id: "target", type: "text", label_key: "Target" }], next: "end" },
        { id: "end", type: "end" }
      ],
      edges: [
        { id: "a_to_switch", from: "step_a", to: "switch_1" },
        { id: "switch_yes", from: "switch_1", to: "step_yes", fromPort: "route_yes" }
      ]
    };
    const nextState: RuntimeState = {
      ...EMPTY_STATE,
      values: { transport: "yes" }
    };

    const result = await advanceToInteractiveNode({
      schema,
      startNodeId: "switch_1",
      state: nextState,
      evaluateAtNode: async (nodeId, state) => evaluateNode(schema, state, nodeId)
    });

    expect(result.nodeId).toBe("step_yes");
    expect(result.stalled).toBe(false);
  });

  it("skips sign node and lands on next interactive or stalls after integrations", async () => {
    const schema: FormSchema = {
      schemaVersion: 1,
      start: "step_last",
      nodes: [
        {
          id: "step_last",
          type: "step",
          fields: [{ id: "q1", type: "radio", label_key: "q1", options: [{ value: "a", label_key: "a" }] }],
          next: "sign_n"
        },
        { id: "sign_n", type: "sign", title_key: "Подпись", next: "int_n" },
        {
          id: "int_n",
          type: "integration_call",
          integration: {
            id: "api_int",
            adapter: "erp_mock_acceptance",
            url: "/api/erp/mock-leasing",
            payload_map: { values: { var: "values" } }
          }
        }
      ]
    };
    const result = await advanceToInteractiveNode({
      schema,
      startNodeId: "sign_n",
      state: { ...EMPTY_STATE, stepStatus: { step_last: "complete" } },
      evaluateAtNode: async (nodeId, state) => evaluateNode(schema, state, nodeId)
    });
    expect(result.stalled).toBe(true);
    expect(result.nodeId).toBe("int_n");
    expect(result.state.stepStatus?.sign_n).toBe("complete");
  });

  it("returns last auto-evaluated node id when stalled after terminal integrations", async () => {
    const schema: FormSchema = {
      schemaVersion: 1,
      start: "step_a",
      nodes: [
        {
          id: "step_a",
          type: "step",
          fields: [{ id: "x", type: "text", label_key: "X" }],
          next: "int_sign"
        },
        {
          id: "int_sign",
          type: "integration_call",
          integration: {
            id: "sign_int",
            adapter: "mock_sign",
            url: "/api/erp/mock-sign",
            payload_map: {}
          },
          next: "int_api"
        },
        {
          id: "int_api",
          type: "integration_call",
          integration: {
            id: "api_int",
            adapter: "erp_mock_acceptance",
            url: "/api/erp/mock-leasing",
            payload_map: { values: { var: "values" } }
          }
        }
      ]
    };
    const result = await advanceToInteractiveNode({
      schema,
      startNodeId: "int_sign",
      state: EMPTY_STATE,
      evaluateAtNode: async (nodeId, state) => evaluateNode(schema, state, nodeId)
    });
    expect(result.stalled).toBe(true);
    expect(result.nodeId).toBe("int_api");
    expect(result.state.stepStatus?.int_api).toBe("complete");
  });
});
