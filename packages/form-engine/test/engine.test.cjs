const test = require("node:test");
const assert = require("node:assert/strict");

const { SWITCH_EXTRA_OUTPUT_ID, evaluateNode, evaluateNodeWithExecutor, migrateSchema, validateSchema } = require("../dist");

test("validateSchema reports missing start node", () => {
  const result = validateSchema({
    schemaVersion: 1,
    start: "missing",
    nodes: [{ id: "start", type: "start", next: "end" }, { id: "end", type: "end" }]
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("schema.start.not_found"));
});

test("evaluateNode applies set_value rule", () => {
  const schema = {
    schemaVersion: 1,
    start: "start",
    nodes: [
      {
        id: "start",
        type: "step",
        rules: [
          {
            id: "setCompany",
            then: [{ type: "set_value", path: "company.name", value: "Qalam" }]
          }
        ],
        next: "end"
      },
      { id: "end", type: "end" }
    ]
  };
  const result = evaluateNode(schema, { values: {} }, "start");
  assert.equal(result.state.values.company.name, "Qalam");
  assert.equal(result.nextNodeId, "end");
});

test("validateSchema reports unreachable node with edges", () => {
  const result = validateSchema({
    schemaVersion: 1,
    start: "start",
    nodes: [
      { id: "start", type: "start" },
      { id: "end", type: "end" },
      { id: "orphan", type: "step" }
    ],
    edges: [{ id: "e1", from: "start", to: "end" }]
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("schema.node.unreachable:orphan")));
});

test("evaluateNode clears stale structural errors when field becomes valid", () => {
  const schema = {
    schemaVersion: 1,
    start: "step_1",
    nodes: [
      {
        id: "step_1",
        type: "step",
        fields: [{ id: "q2", type: "text", label: "Пример 2", required: true }],
        next: "end"
      },
      { id: "end", type: "end" }
    ]
  };
  const invalid = evaluateNode(schema, { values: {} }, "step_1");
  assert.equal(invalid.state.errors.q2, "validation.required");
  assert.equal(invalid.state.stepStatus.step_1, "invalid");

  const fixed = evaluateNode(schema, { ...invalid.state, values: { q2: "3463" } }, "step_1");
  assert.equal(fixed.state.errors.q2, undefined);
  assert.equal(fixed.state.stepStatus.step_1, "complete");
});

test("evaluateNode preserves rule set_error when structural validation passes", () => {
  const schema = {
    schemaVersion: 1,
    start: "step_1",
    nodes: [
      {
        id: "step_1",
        type: "step",
        fields: [{ id: "q2", type: "text", label: "Q", required: false }],
        rules: [
          {
            id: "bizRule",
            then: [{ type: "set_error", path: "q2", messageKey: "forms.biz_rule_violation" }]
          }
        ],
        next: "end"
      },
      { id: "end", type: "end" }
    ]
  };
  const result = evaluateNode(schema, { values: { q2: "ok" }, errors: { q2: "forms.biz_rule_violation" } }, "step_1");
  assert.equal(result.state.errors.q2, "forms.biz_rule_violation");
});

test("evaluateNode resolves conditional edges", () => {
  const schema = migrateSchema({
    schemaVersion: 1,
    start: "start",
    nodes: [
      { id: "start", type: "step" },
      { id: "high", type: "end" },
      { id: "low", type: "end" }
    ],
    edges: [
      { id: "s1", from: "start", to: "high", condition: { ">": [{ var: "values.amount" }, 10] } },
      { id: "s2", from: "start", to: "low" }
    ]
  });
  const result = evaluateNode(schema, { values: { amount: 4 } }, "start");
  assert.equal(result.nextNodeId, "low");
});

test("evaluateNodeWithExecutor stores integration results", async () => {
  const schema = migrateSchema({
    schemaVersion: 1,
    start: "api",
    nodes: [
      {
        id: "api",
        type: "integration_call",
        integration: {
          id: "int_1",
          adapter: "mock-eish",
          payload_map: { leadId: { var: "values.leadId" } },
          store_as: "integration.last"
        },
        next: "end"
      },
      { id: "end", type: "end" }
    ]
  });
  const result = await evaluateNodeWithExecutor(
    schema,
    { values: { leadId: "abc" } },
    "api",
    {
      execute: async () => ({ success: true, data: { externalId: "ok-1" } })
    }
  );
  assert.equal(result.state.integrationResults.int_1.success, true);
  assert.equal(result.state.values.integration.last.externalId, "ok-1");
});

test("switch rules mode routes by selected field value", () => {
  const schema = migrateSchema({
    schemaVersion: 1,
    start: "switch_1",
    nodes: [
      {
        id: "switch_1",
        type: "switch",
        switch: {
          mode: "rules",
          sourceFieldId: "transport",
          routes: [
            { id: "car", value: "car" },
            { id: "truck", value: "truck" },
            { id: "plane", value: "plane" }
          ],
          fallback: { mode: "none" }
        }
      },
      { id: "car_end", type: "end" },
      { id: "truck_end", type: "end" },
      { id: "plane_end", type: "end" }
    ],
    edges: [
      { id: "e_car", from: "switch_1", to: "car_end", fromPort: "car" },
      { id: "e_truck", from: "switch_1", to: "truck_end", fromPort: "truck" },
      { id: "e_plane", from: "switch_1", to: "plane_end", fromPort: "plane" }
    ]
  });
  const result = evaluateNode(schema, { values: { transport: "truck" } }, "switch_1");
  assert.equal(result.nextNodeId, "truck_end");
});

test("switch rules fallback extra routes unmatched values", () => {
  const schema = migrateSchema({
    schemaVersion: 1,
    start: "switch_1",
    nodes: [
      {
        id: "switch_1",
        type: "switch",
        switch: {
          mode: "rules",
          sourceFieldId: "transport",
          routes: [{ id: "car", value: "car" }],
          fallback: { mode: "extra" }
        }
      },
      { id: "car_end", type: "end" },
      { id: "fallback", type: "end" }
    ],
    edges: [
      { id: "e_car", from: "switch_1", to: "car_end", fromPort: "car" },
      { id: "e_fallback", from: "switch_1", to: "fallback", fromPort: SWITCH_EXTRA_OUTPUT_ID }
    ]
  });
  const result = evaluateNode(schema, { values: { transport: "plane" } }, "switch_1");
  assert.equal(result.nextNodeId, "fallback");
});

test("switch expression mode routes by output index", () => {
  const schema = migrateSchema({
    schemaVersion: 1,
    start: "switch_1",
    nodes: [
      {
        id: "switch_1",
        type: "switch",
        switch: {
          mode: "expression",
          expression: { var: "values.routeIndex" },
          numberOutputs: 3,
          routes: [],
          fallback: { mode: "none" }
        }
      },
      { id: "zero", type: "end" },
      { id: "one", type: "end" },
      { id: "two", type: "end" }
    ],
    edges: [
      { id: "e0", from: "switch_1", to: "zero", fromPort: "0" },
      { id: "e1", from: "switch_1", to: "one", fromPort: "1" },
      { id: "e2", from: "switch_1", to: "two", fromPort: "2" }
    ]
  });
  const result = evaluateNode(schema, { values: { routeIndex: 2 } }, "switch_1");
  assert.equal(result.nextNodeId, "two");
});
