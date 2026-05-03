const test = require("node:test");
const assert = require("node:assert/strict");
const { migrateSchema, validateSchema } = require("../dist/schema.js");

test("validateSchema rejects rules switch without sourceFieldId", () => {
  const schema = {
    schemaVersion: 1,
    start: "start",
    nodes: [
      { id: "start", type: "start", next: "step_a" },
      {
        id: "step_a",
        type: "step",
        fields: [{ id: "answer", type: "text", label_key: "Answer" }],
        next: "switch_1"
      },
      {
        id: "switch_1",
        type: "switch",
        switch: {
          mode: "rules",
          routes: [{ id: "route_1", value: "yes" }],
          fallback: { mode: "none" }
        }
      },
      { id: "end", type: "end" }
    ],
    edges: [
      { id: "e1", from: "start", to: "step_a" },
      { id: "e2", from: "step_a", to: "switch_1" },
      { id: "e3", from: "switch_1", to: "end", fromPort: "route_1" }
    ]
  };

  const result = validateSchema(schema);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => item.startsWith("schema.switch.source_field.required:switch_1")));
});

test("validateSchema allows bare integration_call as terminal leaf (demo placeholder)", () => {
  const schema = {
    schemaVersion: 1,
    start: "start",
    metadata: { title: "Demo" },
    nodes: [
      { id: "start", type: "start", next: "api" },
      { id: "api", type: "integration_call", title_key: "Пример" }
    ]
  };
  const result = validateSchema(schema);
  assert.equal(result.valid, true);
});

test("validateSchema allows terminal sign leaf without outgoing (demo)", () => {
  const schema = {
    schemaVersion: 1,
    start: "start",
    metadata: { title: "Demo" },
    nodes: [
      { id: "start", type: "start", next: "sign_1" },
      { id: "sign_1", type: "sign", title_key: "Подпись" }
    ]
  };
  assert.equal(validateSchema(schema).valid, true);
});

test("validateSchema infers sign from id when type is missing (lenient)", () => {
  const schema = {
    schemaVersion: 1,
    start: "start",
    metadata: { title: "Demo" },
    nodes: [
      { id: "start", type: "start", next: "sign_1777836962262" },
      { id: "sign_1777836962262", title_key: "Подпись" }
    ]
  };
  const result = validateSchema(schema);
  assert.equal(result.valid, true);
});

test("validateSchema accepts sign then terminal integration_call (leasing-style)", () => {
  const schema = {
    schemaVersion: 1,
    start: "start",
    metadata: { title: "Leasing" },
    nodes: [
      { id: "start", type: "start", next: "sign_1" },
      { id: "sign_1", type: "sign", title_key: "Подпись", next: "api" },
      {
        id: "api",
        type: "integration_call",
        title_key: "HTTPS",
        integration: {
          id: "i1",
          adapter: "erp_mock_acceptance",
          url: "/api/erp/mock-leasing",
          payload_map: {}
        }
      }
    ],
    edges: [
      { id: "e1", from: "start", to: "sign_1", fromPort: "main", toPort: "in" },
      { id: "e2", from: "sign_1", to: "api", fromPort: "main", toPort: "in" }
    ]
  };
  assert.equal(validateSchema(schema).valid, true);
});

test("migrateSchema + validateSchema accepts draft with empty edges when node.next defines the graph", () => {
  const raw = {
    schemaVersion: 1,
    start: "start",
    metadata: { title: "Leasing" },
    nodes: [
      { id: "start", type: "start", next: "sign_1" },
      { id: "sign_1", type: "sign", title_key: "Подпись", next: "api" },
      {
        id: "api",
        type: "integration_call",
        title_key: "HTTPS",
        integration: { id: "i1", adapter: "erp_mock_acceptance", payload_map: {} }
      }
    ],
    edges: []
  };
  assert.equal(validateSchema(raw).valid, true);
  assert.equal(validateSchema(migrateSchema(raw)).valid, true);
});

test("validateSchema allows configured integration_call as terminal leaf without end", () => {
  const schema = {
    schemaVersion: 1,
    start: "start",
    metadata: { title: "Demo" },
    nodes: [
      { id: "start", type: "start", next: "api" },
      {
        id: "api",
        type: "integration_call",
        integration: {
          id: "i1",
          adapter: "erp_mock_acceptance",
          url: "/api/erp/mock-leasing",
          payload_map: {}
        }
      }
    ]
  };
  const result = validateSchema(schema);
  assert.equal(result.valid, true);
});
