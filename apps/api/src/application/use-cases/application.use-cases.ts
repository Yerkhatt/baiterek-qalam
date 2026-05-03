import { Inject, Injectable } from "@nestjs/common";
import { RuleEvent, RuntimeState } from "@qalam/form-engine";
import { APPLICATION_REPOSITORY } from "../../config/di/tokens";
import { ApplicationRecord, RuntimeSnapshot } from "../../domain/models";
import { ApplicationRepository } from "../ports/out/application.repository";

@Injectable()
export class UpsertApplicationUseCase {
  constructor(
    @Inject(APPLICATION_REPOSITORY) private readonly applications: ApplicationRepository
  ) {}

  execute(appId: string, serviceId: string): Promise<ApplicationRecord> {
    return this.applications.upsertApplication(appId, serviceId);
  }
}

@Injectable()
export class GetApplicationUseCase {
  constructor(
    @Inject(APPLICATION_REPOSITORY) private readonly applications: ApplicationRepository
  ) {}

  execute(appId: string): Promise<ApplicationRecord | null> {
    return this.applications.getApplication(appId);
  }
}

@Injectable()
export class GetRuntimeUseCase {
  constructor(
    @Inject(APPLICATION_REPOSITORY) private readonly applications: ApplicationRepository
  ) {}

  execute(appId: string): Promise<RuntimeSnapshot | null> {
    return this.applications.getRuntime(appId);
  }
}

@Injectable()
export class SaveRuntimeUseCase {
  constructor(
    @Inject(APPLICATION_REPOSITORY) private readonly applications: ApplicationRepository
  ) {}

  execute(
    appId: string,
    snapshot: {
      nodeId: string;
      history: string[];
      state: RuntimeState;
      events: RuleEvent[];
    }
  ): Promise<RuntimeSnapshot> {
    return this.applications.saveRuntime(appId, snapshot);
  }
}

@Injectable()
export class BindSchemaVersionUseCase {
  constructor(
    @Inject(APPLICATION_REPOSITORY) private readonly applications: ApplicationRepository
  ) {}

  execute(appId: string, schemaVersion: number): Promise<void> {
    return this.applications.bindSchemaVersion(appId, schemaVersion);
  }
}

@Injectable()
export class SubmitApplicationUseCase {
  constructor(
    @Inject(APPLICATION_REPOSITORY) private readonly applications: ApplicationRepository
  ) {}

  execute(
    appId: string,
    snapshot?: {
      nodeId: string;
      history: string[];
      state: RuntimeState;
      events: RuleEvent[];
    }
  ): Promise<ApplicationRecord | null> {
    return this.applications.submitApplication(appId, snapshot);
  }
}
