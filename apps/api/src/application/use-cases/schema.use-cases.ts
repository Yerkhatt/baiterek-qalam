import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { FormSchema } from "@qalam/form-engine";
import { SCHEMA_REPOSITORY } from "../../config/di/tokens";
import { FormVersionRecord, SchemaSummaryRecord } from "../../domain/models";
import { SchemaRepository } from "../ports/out/schema.repository";

@Injectable()
export class GetSchemaUseCase {
  constructor(@Inject(SCHEMA_REPOSITORY) private readonly schemas: SchemaRepository) {}

  execute(serviceId: string, version?: number): Promise<FormSchema | null> {
    return this.schemas.getSchema(serviceId, version);
  }
}

@Injectable()
export class SaveSchemaUseCase {
  constructor(@Inject(SCHEMA_REPOSITORY) private readonly schemas: SchemaRepository) {}

  execute(serviceId: string, schema: FormSchema): Promise<FormVersionRecord> {
    return this.schemas.saveSchema(serviceId, schema);
  }
}

@Injectable()
export class RenameSchemaUseCase {
  constructor(@Inject(SCHEMA_REPOSITORY) private readonly schemas: SchemaRepository) {}

  async execute(fromServiceId: string, targetServiceId: string): Promise<void> {
    const from = fromServiceId.trim();
    const to = targetServiceId.trim();
    if (!from || !to) {
      throw new BadRequestException("schema.rename.ids_required");
    }
    if (from === to) {
      return;
    }
    try {
      await this.schemas.renameSchema(from, to);
    } catch (error: unknown) {
      const code = error && typeof error === "object" && "code" in error ? String((error as { code?: string }).code) : "";
      if (code === "TARGET_EXISTS") {
        throw new ConflictException("schema.rename.conflict");
      }
      if (code === "SOURCE_MISSING") {
        throw new NotFoundException("schema.rename.source_missing");
      }
      throw error;
    }
  }
}

@Injectable()
export class PublishSchemaUseCase {
  constructor(@Inject(SCHEMA_REPOSITORY) private readonly schemas: SchemaRepository) {}

  execute(serviceId: string): Promise<FormVersionRecord | null> {
    return this.schemas.publishSchema(serviceId);
  }
}

@Injectable()
export class DeleteSchemaUseCase {
  constructor(@Inject(SCHEMA_REPOSITORY) private readonly schemas: SchemaRepository) {}

  execute(serviceId: string): Promise<void> {
    return this.schemas.deleteSchema(serviceId);
  }
}

@Injectable()
export class ListSchemaVersionsUseCase {
  constructor(@Inject(SCHEMA_REPOSITORY) private readonly schemas: SchemaRepository) {}

  execute(serviceId: string): Promise<FormVersionRecord[]> {
    return this.schemas.listSchemaVersions(serviceId);
  }
}

@Injectable()
export class ListSchemasUseCase {
  constructor(@Inject(SCHEMA_REPOSITORY) private readonly schemas: SchemaRepository) {}

  execute(): Promise<SchemaSummaryRecord[]> {
    return this.schemas.listSchemas();
  }
}

@Injectable()
export class ListPublishedCatalogUseCase {
  constructor(@Inject(SCHEMA_REPOSITORY) private readonly schemas: SchemaRepository) {}

  execute(): Promise<SchemaSummaryRecord[]> {
    return this.schemas.listPublishedCatalogSummaries();
  }
}
