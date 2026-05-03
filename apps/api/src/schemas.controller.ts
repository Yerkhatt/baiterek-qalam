import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query
} from "@nestjs/common";
import { FormSchema, migrateSchema, validateSchema } from "@qalam/form-engine";
import {
  GetSchemaUseCase,
  ListPublishedCatalogUseCase,
  ListSchemasUseCase,
  ListSchemaVersionsUseCase,
  DeleteSchemaUseCase,
  PublishSchemaUseCase,
  RenameSchemaUseCase,
  SaveSchemaUseCase
} from "./application/use-cases/schema.use-cases";

function publishMetadataErrors(schema: FormSchema): string[] {
  const m = schema.metadata as { visitorBriefing?: string } | undefined;
  const errors: string[] = [];
  if (!(m?.visitorBriefing ?? "").trim()) {
    errors.push("schema.metadata.visitorBriefing.required");
  }
  return errors;
}

@Controller("schemas")
export class SchemasController {
  constructor(
    private readonly getSchemaUseCase: GetSchemaUseCase,
    private readonly saveSchemaUseCase: SaveSchemaUseCase,
    private readonly renameSchemaUseCase: RenameSchemaUseCase,
    private readonly publishSchemaUseCase: PublishSchemaUseCase,
    private readonly deleteSchemaUseCase: DeleteSchemaUseCase,
    private readonly listSchemasUseCase: ListSchemasUseCase,
    private readonly listPublishedCatalogUseCase: ListPublishedCatalogUseCase,
    private readonly listSchemaVersionsUseCase: ListSchemaVersionsUseCase
  ) {}

  /** Public catalog: stable path (query params can be stripped by some proxies/CDNs). */
  @Get("catalog/published")
  async listPublishedCatalog() {
    return this.listPublishedCatalogUseCase.execute();
  }

  @Get()
  async listSchemas() {
    return this.listSchemasUseCase.execute();
  }

  @Get(":serviceId/versions")
  async listVersions(@Param("serviceId") serviceId: string) {
    return this.listSchemaVersionsUseCase.execute(serviceId);
  }

  @Get(":serviceId")
  async getSchema(
    @Param("serviceId") serviceId: string,
    @Query("version") version?: string
  ): Promise<FormSchema> {
    const schema = await this.getSchemaUseCase.execute(
      serviceId,
      version ? Number(version) : undefined
    );
    if (!schema) {
      throw new NotFoundException("schema.not_found");
    }
    return schema;
  }

  @Patch(":serviceId/rename")
  async renameSchema(
    @Param("serviceId") serviceId: string,
    @Body() body: { targetServiceId?: string }
  ): Promise<{ ok: boolean }> {
    const targetServiceId = body?.targetServiceId?.trim();
    if (!targetServiceId) {
      throw new BadRequestException("schema.rename.target_required");
    }
    await this.renameSchemaUseCase.execute(serviceId, targetServiceId);
    return { ok: true };
  }

  @Put(":serviceId")
  async saveSchema(
    @Param("serviceId") serviceId: string,
    @Body() body: { schema?: FormSchema }
  ): Promise<{ ok: boolean; version: number; status: string }> {
    if (!body?.schema) {
      throw new BadRequestException("schema.required");
    }
    /* Draft persistence is intentionally permissive: validateSchema runs only on publish. */
    const record = await this.saveSchemaUseCase.execute(serviceId, body.schema);
    return { ok: true, version: record.version, status: record.status };
  }

  @Post(":serviceId/publish")
  async publishSchema(@Param("serviceId") serviceId: string): Promise<{ ok: boolean; version: number }> {
    const versions = await this.listSchemaVersionsUseCase.execute(serviceId);
    const latestDraft = versions.find((item) => item.status === "draft");
    if (latestDraft?.schema && typeof latestDraft.schema === "object") {
      /** Same normalization as runtime (`migrateSchema` on the public form page). */
      const schema = migrateSchema(latestDraft.schema as FormSchema);
      const validation = validateSchema(schema);
      if (!validation.valid) {
        throw new BadRequestException({
          message: "schema.invalid",
          errors: validation.errors
        });
      }
      const metaErrors = publishMetadataErrors(schema);
      if (metaErrors.length > 0) {
        throw new BadRequestException({
          message: "schema.metadata.incomplete",
          errors: metaErrors
        });
      }
    }
    const record = await this.publishSchemaUseCase.execute(serviceId);
    if (!record) {
      throw new NotFoundException("schema.draft_not_found");
    }
    return { ok: true, version: record.version };
  }

  @Delete(":serviceId")
  async deleteSchema(@Param("serviceId") serviceId: string): Promise<{ ok: true }> {
    await this.deleteSchemaUseCase.execute(serviceId);
    return { ok: true };
  }
}
