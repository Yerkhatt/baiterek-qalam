import type { EvaluationResult, FormNode, FormSchema, RuleEvent, RuntimeState } from "@qalam/form-engine";

type EvaluateAtNode = (nodeId: string, state: RuntimeState) => Promise<EvaluationResult>;

/** Nodes that render as their own screen. `sign` runs inline after the last form (button «Подписать»); `integration_call` is evaluated silently. */
export const INTERACTIVE_NODE_TYPES = new Set<FormNode["type"]>([
  "step",
  "document_request",
  "approval",
  "end"
]);

type AdvanceOptions = {
  schema: FormSchema;
  startNodeId: string;
  state: RuntimeState;
  evaluateAtNode: EvaluateAtNode;
  maxHops?: number;
};

type AdvanceResult = {
  nodeId: string;
  state: RuntimeState;
  events: RuleEvent[];
  stalled: boolean;
};

export async function advanceToInteractiveNode({
  schema,
  startNodeId,
  state,
  evaluateAtNode,
  maxHops = 32
}: AdvanceOptions): Promise<AdvanceResult> {
  const byId = new Map(schema.nodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  const events: RuleEvent[] = [];
  let nextNodeId: string | undefined = startNodeId;
  let nextState = state;
  let hops = 0;
  let lastAutoEvaluatedNodeId: string | undefined;

  while (nextNodeId) {
    const node = byId.get(nextNodeId);
    if (!node) {
      return { nodeId: startNodeId, state: nextState, events, stalled: true };
    }
    if (INTERACTIVE_NODE_TYPES.has(node.type)) {
      return { nodeId: nextNodeId, state: nextState, events, stalled: false };
    }
    if (visited.has(nextNodeId)) {
      throw new Error("runtime.auto_advance_cycle");
    }
    visited.add(nextNodeId);
    hops += 1;
    if (hops > maxHops) {
      throw new Error("runtime.auto_advance_hops_exceeded");
    }
    lastAutoEvaluatedNodeId = nextNodeId;
    const evaluation = await evaluateAtNode(nextNodeId, nextState);
    nextState = evaluation.state;
    events.push(...evaluation.events);
    nextNodeId = evaluation.nextNodeId;
  }

  return {
    nodeId: lastAutoEvaluatedNodeId ?? startNodeId,
    state: nextState,
    events,
    stalled: true
  };
}
