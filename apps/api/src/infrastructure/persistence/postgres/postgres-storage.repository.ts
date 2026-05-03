import { Injectable } from "@nestjs/common";
import type { FormSchema, RuleEvent, RuntimeState } from "@qalam/form-engine";
import { randomUUID } from "crypto";
import { ApplicationRepository } from "../../../application/ports/out/application.repository";
import { SchemaRepository } from "../../../application/ports/out/schema.repository";
import {
  ApplicationRecord,
  EventStats,
  FormVersionRecord,
  RuntimeSnapshot,
  ServiceMetadataRecord,
  SchemaSummaryRecord
} from "../../../domain/models";
import { DbService } from "../../../db.service";

@Injectable()
export class PostgresStorageRepository implements SchemaRepository, ApplicationRepository {
  constructor(private readonly db: DbService) {}

  async getSchema(serviceId: string, version?: number): Promise<FormSchema | null> {
    if (typeof version === "number") {
      const versionResult = await this.db.query<{ schema: FormSchema }>(
        "SELECT schema FROM schema_versions WHERE service_id = $1 AND version = $2 LIMIT 1",
        [serviceId, version]
      );
      return versionResult.rows[0]?.schema ?? null;
    }
    const result = await this.db.query<{ schema: FormSchema }>(
      "SELECT schema FROM schema_versions WHERE service_id = $1 AND status = 'published' ORDER BY version DESC LIMIT 1",
      [serviceId]
    );
    if (result.rows[0]?.schema) {
      return result.rows[0].schema;
    }
    const fallback = await this.db.query<{ schema: FormSchema }>(
      "SELECT schema FROM schemas WHERE service_id = $1",
      [serviceId]
    );
    return fallback.rows[0]?.schema ?? null;
  }

  async renameSchema(fromServiceId: string, toServiceId: string): Promise<void> {
    if (fromServiceId === toServiceId) {
      return;
    }
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const target = await client.query("SELECT 1 FROM schemas WHERE service_id = $1 LIMIT 1", [toServiceId]);
      if (target.rows.length > 0) {
        throw Object.assign(new Error("schema.rename.target_exists"), { code: "TARGET_EXISTS" });
      }
      const source = await client.query("SELECT 1 FROM schemas WHERE service_id = $1 LIMIT 1", [fromServiceId]);
      if (source.rows.length === 0) {
        throw Object.assign(new Error("schema.rename.source_missing"), { code: "SOURCE_MISSING" });
      }
      await client.query("UPDATE schemas SET service_id = $2, updated_at = now() WHERE service_id = $1", [
        fromServiceId,
        toServiceId
      ]);
      await client.query("UPDATE schema_versions SET service_id = $2, updated_at = now() WHERE service_id = $1", [
        fromServiceId,
        toServiceId
      ]);
      await client.query("UPDATE applications SET service_id = $2, updated_at = now() WHERE service_id = $1", [
        fromServiceId,
        toServiceId
      ]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => null);
      throw error;
    } finally {
      client.release();
    }
  }

  async saveSchema(serviceId: string, schema: FormSchema): Promise<FormVersionRecord> {
    const nextSchema = schema;
    const versionResult = await this.db.query<{ version: number }>(
      "SELECT COALESCE(MAX(version), 0) as version FROM schema_versions WHERE service_id = $1",
      [serviceId]
    );
    const nextVersion = (versionResult.rows[0]?.version ?? 0) + 1;
    const id = randomUUID();
    await this.db.query(
      `INSERT INTO schemas (service_id, schema)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (service_id)
       DO UPDATE SET schema = EXCLUDED.schema, updated_at = now()`,
      [serviceId, JSON.stringify(nextSchema)]
    );
    await this.db.query(
      `INSERT INTO schema_versions (id, service_id, version, status, schema)
       VALUES ($1, $2, $3, 'draft', $4::jsonb)`,
      [id, serviceId, nextVersion, JSON.stringify(nextSchema)]
    );
    return {
      id,
      serviceId,
      version: nextVersion,
      status: "draft",
      schema: nextSchema,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  async publishSchema(serviceId: string): Promise<FormVersionRecord | null> {
    const draft = await this.db.query<FormVersionRecord & { schema: FormSchema }>(
      `SELECT id, service_id as "serviceId", version, status, schema, created_at as "createdAt", updated_at as "updatedAt"
       FROM schema_versions
       WHERE service_id = $1 AND status = 'draft'
       ORDER BY version DESC
       LIMIT 1`,
      [serviceId]
    );
    const record = draft.rows[0];
    if (!record) {
      return null;
    }
    await this.db.query(
      "UPDATE schema_versions SET status = 'archived', updated_at = now() WHERE service_id = $1 AND status = 'published'",
      [serviceId]
    );
    await this.db.query(
      "UPDATE schema_versions SET status = 'published', updated_at = now() WHERE id = $1",
      [record.id]
    );
    return { ...record, status: "published" };
  }

  async deleteSchema(serviceId: string): Promise<void> {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM schema_versions WHERE service_id = $1", [serviceId]);
      await client.query("DELETE FROM schemas WHERE service_id = $1", [serviceId]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listSchemaVersions(serviceId: string): Promise<FormVersionRecord[]> {
    const result = await this.db.query<FormVersionRecord>(
      `SELECT id, service_id as "serviceId", version, status, schema,
              created_at as "createdAt", updated_at as "updatedAt"
       FROM schema_versions
       WHERE service_id = $1
       ORDER BY version DESC`,
      [serviceId]
    );
    return result.rows;
  }

  async listSchemas(): Promise<SchemaSummaryRecord[]> {
    const result = await this.db.query<
      SchemaSummaryRecord & { schema?: FormSchema; metadata?: ServiceMetadataRecord }
    >(
      `SELECT service_id as "serviceId",
              version as "latestVersion",
              status,
              updated_at as "updatedAt",
              schema
       FROM (
         SELECT DISTINCT ON (service_id)
           service_id,
           version,
           status,
            updated_at,
            schema
         FROM schema_versions
         ORDER BY service_id, version DESC
       ) latest
       ORDER BY updated_at DESC`
    );
    return result.rows.map((row) => ({
      serviceId: row.serviceId,
      latestVersion: row.latestVersion,
      status: row.status,
      updatedAt: row.updatedAt,
      metadata: row.schema?.metadata as ServiceMetadataRecord | undefined
    }));
  }

  async listPublishedCatalogSummaries(): Promise<SchemaSummaryRecord[]> {
    const result = await this.db.query<
      SchemaSummaryRecord & { schema?: FormSchema; metadata?: ServiceMetadataRecord }
    >(
      `SELECT service_id as "serviceId",
              version as "latestVersion",
              status,
              updated_at as "updatedAt",
              schema
       FROM (
         SELECT DISTINCT ON (service_id)
           service_id,
           version,
           status,
           updated_at,
           schema
         FROM schema_versions
         WHERE status = 'published'
         ORDER BY service_id, version DESC
       ) pub
       ORDER BY updated_at DESC`
    );
    return result.rows.map((row) => ({
      serviceId: row.serviceId,
      latestVersion: row.latestVersion,
      status: row.status,
      updatedAt: row.updatedAt,
      metadata: row.schema?.metadata as ServiceMetadataRecord | undefined
    }));
  }

  async upsertApplication(appId: string, serviceId: string): Promise<ApplicationRecord> {
    const id = appId.trim() || randomUUID();
    type Row = {
      id: string;
      serviceId: string;
      schemaVersion: number;
      status: string;
      stage: string;
      createdAt: Date | string;
      updatedAt: Date | string;
    };
    const result = await this.db.query<Row>(
      `INSERT INTO applications (id, service_id, schema_version, status, stage, created_at, updated_at)
       VALUES ($1, $2, $3, 'draft', 'stage1', now(), now())
       ON CONFLICT (id) DO UPDATE SET updated_at = now()
       RETURNING id, service_id AS "serviceId", schema_version AS "schemaVersion",
                 status, stage, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [id, serviceId, 1]
    );
    const row = result.rows[0];
    if (!row) {
      throw new Error("applications.upsert_failed");
    }
    const iso = (v: Date | string) => (typeof v === "string" ? v : new Date(v).toISOString());
    return {
      id: row.id,
      serviceId: row.serviceId,
      schemaVersion: row.schemaVersion,
      status: row.status,
      stage: row.stage,
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt)
    };
  }

  async getApplication(appId: string): Promise<ApplicationRecord | null> {
    const result = await this.db.query<ApplicationRecord>(
      "SELECT id, service_id as \"serviceId\", schema_version as \"schemaVersion\", status, stage, created_at as \"createdAt\", updated_at as \"updatedAt\" FROM applications WHERE id = $1",
      [appId]
    );
    return result.rows[0] ?? null;
  }

  async bindSchemaVersion(appId: string, schemaVersion: number): Promise<void> {
    await this.db.query(
      "UPDATE applications SET schema_version = $2, updated_at = now() WHERE id = $1",
      [appId, schemaVersion]
    );
  }

  async saveRuntime(
    appId: string,
    snapshot: {
      nodeId: string;
      history: string[];
      state: RuntimeState;
      events: RuleEvent[];
    }
  ): Promise<RuntimeSnapshot> {
    const updatedAt = new Date().toISOString();
    await this.db.query(
      `INSERT INTO runtimes (app_id, node_id, history, state, events, updated_at)
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6)
       ON CONFLICT (app_id)
       DO UPDATE SET node_id = EXCLUDED.node_id,
         history = EXCLUDED.history,
         state = EXCLUDED.state,
         events = EXCLUDED.events,
         updated_at = EXCLUDED.updated_at`,
      [
        appId,
        snapshot.nodeId,
        JSON.stringify(snapshot.history ?? []),
        JSON.stringify(snapshot.state),
        JSON.stringify(snapshot.events ?? []),
        updatedAt
      ]
    );
    return { ...snapshot, appId, updatedAt };
  }

  async getRuntime(appId: string): Promise<RuntimeSnapshot | null> {
    const result = await this.db.query<RuntimeSnapshot>(
      "SELECT app_id as \"appId\", node_id as \"nodeId\", history, state, events, updated_at as \"updatedAt\" FROM runtimes WHERE app_id = $1",
      [appId]
    );
    return result.rows[0] ?? null;
  }

  async getEventStats(): Promise<EventStats> {
    const result = await this.db.query<{ events: RuleEvent[] }>("SELECT events FROM runtimes");
    const counts: Record<string, number> = {};
    let total = 0;

    for (const row of result.rows) {
      const events = row.events ?? [];
      for (const event of events) {
        counts[event.name] = (counts[event.name] ?? 0) + 1;
        total += 1;
      }
    }

    return { total, counts };
  }

  async submitApplication(
    appId: string,
    snapshot?: {
      nodeId: string;
      history: string[];
      state: RuntimeState;
      events: RuleEvent[];
    }
  ): Promise<ApplicationRecord | null> {
    if (snapshot) {
      await this.saveRuntime(appId, snapshot);
    }
    const result = await this.db.query<ApplicationRecord>(
      `UPDATE applications
       SET status = 'submitted', stage = 'completed', updated_at = now()
       WHERE id = $1
       RETURNING id, service_id as "serviceId", schema_version as "schemaVersion", status, stage,
         created_at as "createdAt", updated_at as "updatedAt"`,
      [appId]
    );
    return result.rows[0] ?? null;
  }
}
