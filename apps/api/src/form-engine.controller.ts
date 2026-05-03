import { Body, Controller, Post } from "@nestjs/common";
import {
  EvaluationResult,
  FormSchema,
  RuntimeState,
  evaluateNodeWithExecutor,
  validateSchema,
} from "@qalam/form-engine";
import { FormIntegrationExecutor } from "./form-integration.executor";

interface ValidateRequest {
  schema: FormSchema;
}

interface EvaluateRequest {
  schema: FormSchema;
  state: RuntimeState;
  nodeId: string;
}

@Controller()
export class FormEngineController {
  constructor(private readonly integrationExecutor: FormIntegrationExecutor) {}

  @Post("form-versions/validate")
  validate(@Body() body: ValidateRequest): { valid: boolean; errors: string[] } {
    return validateSchema(body.schema);
  }

  @Post("form-runtime/evaluate")
  async evaluate(@Body() body: EvaluateRequest): Promise<EvaluationResult> {
    return evaluateNodeWithExecutor(body.schema, body.state, body.nodeId, this.integrationExecutor);
  }
}
