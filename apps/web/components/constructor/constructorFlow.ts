import type { ComponentProps } from "react";
import { ConnectionLineType, ReactFlow, type Node } from "@xyflow/react";

type FlowProps = ComponentProps<typeof ReactFlow>;

export function primarySelectedNodeId(nodes: Node[]): string | null {
  return nodes[0]?.id ?? null;
}

export const CONSTRUCTOR_REACT_FLOW_DEFAULTS = {
  selectNodesOnDrag: false,
  connectionRadius: 44,
  elevateEdgesOnSelect: true,
  deleteKeyCode: ["Backspace", "Delete"] as const,
  multiSelectionKeyCode: "Shift",
  minZoom: 0.15,
  maxZoom: 3,
  nodeDragThreshold: 2,
  connectionLineType: ConnectionLineType.Bezier,
  fitView: true,
  fitViewOptions: { padding: 0.28, maxZoom: 0.72, minZoom: 0.12 },
  proOptions: { hideAttribution: true },
  /** Default is Space; that blocks the spacebar in any focused input on the page. */
  panActivationKeyCode: null,
} satisfies Pick<
  FlowProps,
  | "selectNodesOnDrag"
  | "connectionRadius"
  | "elevateEdgesOnSelect"
  | "deleteKeyCode"
  | "multiSelectionKeyCode"
  | "minZoom"
  | "maxZoom"
  | "nodeDragThreshold"
  | "connectionLineType"
  | "fitView"
  | "fitViewOptions"
  | "proOptions"
  | "panActivationKeyCode"
>;
