import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { ErpMockAcceptanceService } from "./erp-mock.service";

@Controller("api/erp")
export class ErpMockController {
  constructor(private readonly erpMockAcceptance: ErpMockAcceptanceService) {}

  @Post("mock-acceptance")
  @HttpCode(201)
  mockAcceptance(@Body() body: unknown) {
    return this.acceptBody(body);
  }

  @Post("mock-sign")
  @HttpCode(200)
  mockSign(@Body() body: unknown) {
    const record = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
    return { signed: true, mocked: true, received: record };
  }

  /** Canonical leasing demo path; same behavior as `mock-acceptance` (legacy alias). */
  @Post("mock-leasing")
  @HttpCode(201)
  mockLeasing(@Body() body: unknown) {
    return this.acceptBody(body);
  }

  private acceptBody(body: unknown) {
    const record = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
    return this.erpMockAcceptance.accept(record);
  }
}
