import { Controller, Get } from "@nestjs/common";
import { GetEventStatsUseCase } from "./application/use-cases/analytics.use-case";

@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly getEventStatsUseCase: GetEventStatsUseCase) {}

  @Get("events")
  async getEventStats() {
    return this.getEventStatsUseCase.execute();
  }
}
