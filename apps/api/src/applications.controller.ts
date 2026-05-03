import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Put
} from "@nestjs/common";
import { RuleEvent, RuntimeState } from "@qalam/form-engine";
import {
  BindSchemaVersionUseCase,
  GetApplicationUseCase,
  GetRuntimeUseCase,
  SaveRuntimeUseCase,
  SubmitApplicationUseCase,
  UpsertApplicationUseCase
} from "./application/use-cases/application.use-cases";

@Controller("applications")
export class ApplicationsController {
  constructor(
    private readonly upsertApplicationUseCase: UpsertApplicationUseCase,
    private readonly getApplicationUseCase: GetApplicationUseCase,
    private readonly getRuntimeUseCase: GetRuntimeUseCase,
    private readonly saveRuntimeUseCase: SaveRuntimeUseCase,
    private readonly bindSchemaVersionUseCase: BindSchemaVersionUseCase,
    private readonly submitApplicationUseCase: SubmitApplicationUseCase
  ) {}

  @Put(":appId")
  async upsertApplication(
    @Param("appId") appId: string,
    @Body() body: { serviceId?: string; schemaVersion?: number }
  ) {
    if (!body?.serviceId) {
      throw new BadRequestException("application.serviceId.required");
    }
    const app = await this.upsertApplicationUseCase.execute(appId, body.serviceId);
    if (typeof body.schemaVersion === "number") {
      await this.bindSchemaVersionUseCase.execute(app.id, body.schemaVersion);
    }
    return app;
  }

  @Get(":appId")
  async getApplication(@Param("appId") appId: string) {
    const record = await this.getApplicationUseCase.execute(appId);
    if (!record) {
      throw new NotFoundException("application.not_found");
    }
    return record;
  }

  @Get(":appId/runtime")
  async getRuntime(@Param("appId") appId: string) {
    const runtime = await this.getRuntimeUseCase.execute(appId);
    if (!runtime) {
      throw new NotFoundException("runtime.not_found");
    }
    return runtime;
  }

  @Put(":appId/runtime")
  async saveRuntime(
    @Param("appId") appId: string,
    @Body()
    body: {
      nodeId?: string;
      history?: string[];
      state?: RuntimeState;
      events?: RuleEvent[];
    }
  ) {
    if (!body?.nodeId || !body?.state) {
      throw new BadRequestException("runtime.required");
    }
    const snapshot = {
      appId,
      nodeId: body.nodeId,
      history: body.history ?? [],
      state: body.state,
      events: body.events ?? []
    };
    return this.saveRuntimeUseCase.execute(appId, snapshot);
  }

  @Post(":appId/submit")
  async submitApplication(
    @Param("appId") appId: string,
    @Body()
    body?: {
      nodeId?: string;
      history?: string[];
      state?: RuntimeState;
      events?: RuleEvent[];
    }
  ) {
    const snapshot = body?.state && body?.nodeId
      ? {
          nodeId: body.nodeId,
          history: body.history ?? [],
          state: body.state,
          events: body.events ?? []
        }
      : undefined;
    const updated = await this.submitApplicationUseCase.execute(appId, snapshot);
    if (!updated) {
      throw new NotFoundException("application.not_found");
    }
    return updated;
  }
}
