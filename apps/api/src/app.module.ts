import { Module } from "@nestjs/common";
import { ErpMockController } from "./erp-mock.controller";
import { ErpMockAcceptanceService } from "./erp-mock.service";
import { FormEngineController } from "./form-engine.controller";
import { FormIntegrationExecutor } from "./form-integration.executor";
import { HealthController } from "./health.controller";
import { SchemasController } from "./schemas.controller";
import { ApplicationsController } from "./applications.controller";
import { AnalyticsController } from "./analytics.controller";
import { DbService } from "./db.service";
import {
  BindSchemaVersionUseCase,
  GetApplicationUseCase,
  GetRuntimeUseCase,
  SaveRuntimeUseCase,
  SubmitApplicationUseCase,
  UpsertApplicationUseCase
} from "./application/use-cases/application.use-cases";
import {
  DeleteSchemaUseCase,
  GetSchemaUseCase,
  ListPublishedCatalogUseCase,
  ListSchemaVersionsUseCase,
  ListSchemasUseCase,
  PublishSchemaUseCase,
  RenameSchemaUseCase,
  SaveSchemaUseCase
} from "./application/use-cases/schema.use-cases";
import { GetEventStatsUseCase } from "./application/use-cases/analytics.use-case";
import { PostgresStorageRepository } from "./infrastructure/persistence/postgres/postgres-storage.repository";
import { APPLICATION_REPOSITORY, SCHEMA_REPOSITORY } from "./config/di/tokens";

@Module({
  controllers: [
    HealthController,
    FormEngineController,
    ErpMockController,
    SchemasController,
    ApplicationsController,
    AnalyticsController
  ],
  providers: [
    ErpMockAcceptanceService,
    FormIntegrationExecutor,
    DbService,
    PostgresStorageRepository,
    {
      provide: SCHEMA_REPOSITORY,
      useExisting: PostgresStorageRepository
    },
    {
      provide: APPLICATION_REPOSITORY,
      useExisting: PostgresStorageRepository
    },
    GetSchemaUseCase,
    SaveSchemaUseCase,
    RenameSchemaUseCase,
    PublishSchemaUseCase,
    DeleteSchemaUseCase,
    ListSchemasUseCase,
    ListPublishedCatalogUseCase,
    ListSchemaVersionsUseCase,
    UpsertApplicationUseCase,
    GetApplicationUseCase,
    GetRuntimeUseCase,
    SaveRuntimeUseCase,
    BindSchemaVersionUseCase,
    SubmitApplicationUseCase,
    GetEventStatsUseCase
  ]
})
export class AppModule {}
