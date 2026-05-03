import { Inject, Injectable } from "@nestjs/common";
import { APPLICATION_REPOSITORY } from "../../config/di/tokens";
import { EventStats } from "../../domain/models";
import { ApplicationRepository } from "../ports/out/application.repository";

@Injectable()
export class GetEventStatsUseCase {
  constructor(
    @Inject(APPLICATION_REPOSITORY) private readonly applications: ApplicationRepository
  ) {}

  execute(): Promise<EventStats> {
    return this.applications.getEventStats();
  }
}
