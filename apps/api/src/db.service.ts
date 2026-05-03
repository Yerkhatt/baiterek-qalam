import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (connectionString) {
      this.pool = new Pool({ connectionString });
    } else {
      this.pool = new Pool({
        host: process.env.PGHOST ?? "localhost",
        port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
        database: process.env.PGDATABASE ?? "qalam",
        user: process.env.PGUSER ?? "qalam",
        password: process.env.PGPASSWORD ?? "qalam"
      });
    }
  }

  async onModuleInit(): Promise<void> {
    await this.ensureSchema();
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async query<T extends QueryResultRow>(
    text: string,
    params: unknown[] = []
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  connect(): Promise<PoolClient> {
    return this.pool.connect();
  }

  private async ensureSchema(): Promise<void> {
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS schemas (
        service_id TEXT PRIMARY KEY,
        schema JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );`
    );
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS schema_versions (
        id TEXT PRIMARY KEY,
        service_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        status TEXT NOT NULL,
        schema JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(service_id, version)
      );`
    );

    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY,
        service_id TEXT NOT NULL,
        schema_version INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL,
        stage TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );`
    );
    await this.pool.query(
      "ALTER TABLE applications ADD COLUMN IF NOT EXISTS schema_version INTEGER NOT NULL DEFAULT 1;"
    );

    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS runtimes (
        app_id TEXT PRIMARY KEY,
        node_id TEXT NOT NULL,
        history JSONB NOT NULL,
        state JSONB NOT NULL,
        events JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );`
    );
  }
}
