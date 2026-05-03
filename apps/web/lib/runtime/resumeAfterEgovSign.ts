import { evaluateNode, migrateSchema, type FormSchema, type RuleEvent, type RuntimeState } from "@qalam/form-engine";
import { evaluateRuntimeNode, type RuntimeSnapshot } from "@/lib/runtimeApi";
import { advanceToInteractiveNode } from "./advance";

/**
 * After the user completes the eGov mock page, advance stored runtime through `sign` → `integration_call`
 * (nodes that were skipped when redirecting off the form).
 */
export async function finalizeRuntimeAfterEgovMock(
  schema: FormSchema,
  snapshot: RuntimeSnapshot
): Promise<Omit<RuntimeSnapshot, "appId">> {
  const migrated = migrateSchema(schema);

  const evaluateAtNode = async (targetNodeId: string, nextState: RuntimeState) => {
    let res = evaluateNode(migrated, nextState, targetNodeId);
    const targetNode = migrated.nodes.find((n) => n.id === targetNodeId);
    if (targetNode?.type === "integration_call") {
      try {
        res = await evaluateRuntimeNode(migrated, nextState, targetNodeId);
      } catch {
        /* offline / API errors: keep sync evaluation result */
      }
    }
    return res;
  };

  const stepEval = evaluateNode(migrated, snapshot.state, snapshot.nodeId);
  const startId = stepEval.nextNodeId;
  if (!startId) {
    return {
      nodeId: snapshot.nodeId,
      history: snapshot.history,
      state: stepEval.state,
      events: [...(snapshot.events ?? [])]
    };
  }

  const advanced = await advanceToInteractiveNode({
    schema: migrated,
    startNodeId: startId,
    state: stepEval.state,
    evaluateAtNode
  });

  const mergedEvents: RuleEvent[] = [...(snapshot.events ?? []), ...advanced.events];
  return {
    nodeId: advanced.nodeId,
    history: snapshot.history,
    state: advanced.state,
    events: mergedEvents
  };
}
