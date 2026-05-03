const test = require("node:test");
const assert = require("node:assert/strict");

const { SchemasController } = require("../dist/schemas.controller.js");
const { DeleteSchemaUseCase } = require("../dist/application/use-cases/schema.use-cases.js");
const { PostgresStorageRepository } = require("../dist/infrastructure/persistence/postgres/postgres-storage.repository.js");

test("saveSchema accepts invalid draft payloads", async () => {
  const savedCalls = [];
  const controller = new SchemasController(
    { execute: async () => null },
    {
      execute: async (serviceId, schema) => {
        savedCalls.push({ serviceId, schema });
        return { version: 7, status: "draft" };
      }
    },
    { execute: async () => {} },
    { execute: async () => null },
    { execute: async () => {} },
    { execute: async () => [] },
    { execute: async () => [] },
    { execute: async () => [] }
  );

  const invalidSchema = {
    schemaVersion: 1,
    start: "start",
    nodes: [{ id: "start", type: "start" }]
  };

  const result = await controller.saveSchema("draft-any", { schema: invalidSchema });
  assert.deepEqual(result, { ok: true, version: 7, status: "draft" });
  assert.equal(savedCalls.length, 1);
  assert.equal(savedCalls[0].serviceId, "draft-any");
  assert.deepEqual(savedCalls[0].schema, invalidSchema);
});

test("deleteSchema endpoint delegates to use case", async () => {
  let deletedServiceId = null;
  const controller = new SchemasController(
    { execute: async () => null },
    { execute: async () => ({ version: 1, status: "draft" }) },
    { execute: async () => {} },
    { execute: async () => null },
    {
      execute: async (serviceId) => {
        deletedServiceId = serviceId;
      }
    },
    { execute: async () => [] },
    { execute: async () => [] },
    { execute: async () => [] }
  );

  const result = await controller.deleteSchema("leasing");
  assert.deepEqual(result, { ok: true });
  assert.equal(deletedServiceId, "leasing");
});

test("DeleteSchemaUseCase delegates to repository", async () => {
  let calledWith = null;
  const useCase = new DeleteSchemaUseCase({
    deleteSchema: async (serviceId) => {
      calledWith = serviceId;
    }
  });
  await useCase.execute("svc-delete");
  assert.equal(calledWith, "svc-delete");
});

test("PostgresStorageRepository.deleteSchema removes schemas and versions", async () => {
  const queries = [];
  let released = false;
  const client = {
    query: async (sql, params) => {
      queries.push({ sql, params });
      return { rows: [] };
    },
    release: () => {
      released = true;
    }
  };
  const db = {
    connect: async () => client,
    query: async () => ({ rows: [] })
  };
  const repo = new PostgresStorageRepository(db);

  await repo.deleteSchema("leasing");

  assert.equal(queries.length, 4);
  assert.match(queries[0].sql, /BEGIN/);
  assert.match(queries[1].sql, /DELETE FROM schema_versions/);
  assert.deepEqual(queries[1].params, ["leasing"]);
  assert.match(queries[2].sql, /DELETE FROM schemas/);
  assert.deepEqual(queries[2].params, ["leasing"]);
  assert.match(queries[3].sql, /COMMIT/);
  assert.equal(released, true);
});
