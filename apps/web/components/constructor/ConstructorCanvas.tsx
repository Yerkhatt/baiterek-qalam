"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  ControlButton,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type Node,
  type Edge,
  type Connection,
  type ReactFlowInstance,
  type OnSelectionChangeFunc
} from "@xyflow/react";

import type { FormNode, FormSchema } from "@qalam/form-engine";
import { validateGraphStructure, withSyncedEdges } from "@/lib/form-builder/graph";
import { createSwitchRouteId, deriveSwitchRoutesFromField } from "@/lib/form-builder/fieldOptions";
import { getNodeDefinition, getNodeOutputs, SWITCH_EXTRA_OUTPUT_ID } from "@/lib/form-builder/nodeTypeRegistry";
import { CONSTRUCTOR_REACT_FLOW_DEFAULTS, primarySelectedNodeId } from "./constructorFlow";
import { ConstructorNodeCard } from "./ConstructorNodeCard";
import { ConstructorEdge } from "./ConstructorEdge";
import { ContextMenu } from "./ContextMenu";
import type { NodeTypeName } from "./NodeIcon";
import { useContextMenu } from "./useContextMenu";

export type RFNode = Node<{ formNode: FormNode }>;
export type RFEdge = Edge;

/** Stable references required by React Flow — must not be defined inside component. */
const RF_NODE_TYPES = { formNode: ConstructorNodeCard };
const RF_EDGE_TYPES = { custom: ConstructorEdge };

function schemaToRFNodes(schema: FormSchema): RFNode[] {
  if (!schema?.nodes) return [];
  const issuesByNode = new Map<string, number>();
  for (const issue of validateGraphStructure(schema)) {
    const nodeId = String(issue.params?.nodeId ?? "");
    if (!nodeId) continue;
    issuesByNode.set(nodeId, (issuesByNode.get(nodeId) ?? 0) + 1);
  }
  return schema.nodes.map((node) => ({
    id: node.id,
    type: "formNode",
    position: node.position ?? { x: 80, y: 80 },
    data: { formNode: node, issueCount: issuesByNode.get(node.id) ?? 0 }
  }));
}

function schemaToRFEdges(schema: FormSchema): RFEdge[] {
  if (!schema?.edges) return [];
  const byNodeId = new Map(schema.nodes.map((node) => [node.id, node]));
  return schema.edges.map((edge) => {
    const sourceNode = byNodeId.get(edge.from);
    let label: string | undefined;
    if (sourceNode?.type === "switch") {
      // Port labels already render on ConstructorNodeCard; edge labels here sit on the same spot and read as duplicates.
      label = undefined;
    } else if (edge.label_key && edge.label_key !== "main") {
      label = edge.label_key;
    }

    return {
      id: edge.id,
      source: edge.from,
      target: edge.to,
      sourceHandle: edge.fromPort,
      targetHandle: edge.toPort,
      label,
      type: "custom"
    };
  });
}

interface Props {
  schema: FormSchema;
  onNodeSelect: (id: string | null) => void;
  onSchemaChange: (updater: (prev: FormSchema) => FormSchema) => void;
  onAutoLayout: () => void;
  onOpenInspector: () => void;
}

export function ConstructorCanvas({ schema, onNodeSelect, onSchemaChange, onAutoLayout, onOpenInspector }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode>(schemaToRFNodes(schema));
  const [edges, setEdges, onEdgesChange] = useEdgesState<RFEdge>(schemaToRFEdges(schema));
  const rfRef = useRef<ReactFlowInstance | null>(null);
  const { menu, openMenu, closeMenu } = useContextMenu();

  useEffect(() => {
    setNodes((prev) => {
      const nextFromSchema = schemaToRFNodes(schema);
      const selectedIds = new Set(prev.filter((n) => n.selected).map((n) => n.id));
      return nextFromSchema.map((n) => ({
        ...n,
        selected: selectedIds.has(n.id)
      }));
    });
    setEdges(schemaToRFEdges(schema));
  }, [schema, setNodes, setEdges]);

  const onConnect = useCallback(
    (conn: Connection) => {
      if (!conn.source || !conn.target) return;
      const source = schema.nodes.find((node) => node.id === conn.source);
      const target = schema.nodes.find((node) => node.id === conn.target);
      if (!source || !target) return;

      const sourceDefinition = getNodeDefinition(source.type);
      const targetDefinition = getNodeDefinition(target.type);
      const sourceOutputs = getNodeOutputs(source);
      const sourcePort = conn.sourceHandle ?? sourceOutputs[0]?.id;
      const targetPort = conn.targetHandle ?? targetDefinition.inputs[0]?.id;
      if (!sourcePort || !targetPort) return;

      if (!sourceOutputs.some((port) => port.id === sourcePort)) return;
      if (!targetDefinition.inputs.some((port) => port.id === targetPort)) return;

      const edgeId = `${conn.source}__${sourcePort}__${conn.target}__${targetPort}`;
      const switchCondition =
        source.type === "switch" &&
        source.switch?.mode === "rules" &&
        source.switch.sourceFieldId?.trim() &&
        sourcePort !== SWITCH_EXTRA_OUTPUT_ID
          ? source.switch.routes.find((route) => route.id === sourcePort)
          : undefined;
      setEdges((eds) =>
        addEdge(
          {
            ...conn,
            id: edgeId,
            sourceHandle: sourcePort,
            targetHandle: targetPort,
            type: "custom"
          },
          eds
        )
      );
      onSchemaChange((prev) => {
        return withSyncedEdges({
          ...prev,
          edges: [
            ...(prev.edges ?? []).filter((edge) => edge.id !== edgeId),
            {
              id: edgeId,
              from: conn.source,
              to: conn.target,
              fromPort: sourcePort,
              toPort: targetPort,
              ...(switchCondition
                ? {
                    condition: {
                      "==": [{ var: `values.${source.switch!.sourceFieldId!.trim()}` }, switchCondition.value]
                    }
                  }
                : {})
            }
          ]
        });
      });
    },
    [schema.nodes, setEdges, onSchemaChange]
  );

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: RFNode) => {
      onSchemaChange((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === node.id ? { ...n, position: node.position } : n))
      }));
    },
    [onSchemaChange]
  );

  const onSelectionChange = useCallback<OnSelectionChangeFunc<RFNode, RFEdge>>(
    ({ nodes: selectedNodes }) => {
      onNodeSelect(primarySelectedNodeId(selectedNodes));
    },
    [onNodeSelect]
  );

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: RFNode) => {
      onNodeSelect(node.id);
      onOpenInspector();
    },
    [onNodeSelect, onOpenInspector]
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
    closeMenu();
  }, [onNodeSelect, closeMenu]);

  const onPaneContextMenu = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      e.preventDefault();
      const me = e as React.MouseEvent;
      const pos = rfRef.current?.screenToFlowPosition({ x: me.clientX, y: me.clientY }) ?? { x: 200, y: 200 };
      openMenu(me.clientX, me.clientY, pos.x, pos.y);
    },
    [openMenu]
  );

  /** Called by React Flow when edges are deleted (Delete key, or custom button via deleteElements). */
  const onEdgesDelete = useCallback(
    (deleted: RFEdge[]) => {
      onSchemaChange((prev) =>
        withSyncedEdges({
          ...prev,
          edges: (prev.edges ?? []).filter((edge) => !deleted.some((item) => item.id === edge.id))
        })
      );
    },
    [onSchemaChange]
  );

  const onNodesDelete = useCallback(
    (deleted: RFNode[]) => {
      const ids = new Set(deleted.map((n) => n.id));
      onSchemaChange((prev) =>
        withSyncedEdges({
          ...prev,
          nodes: prev.nodes.filter((n) => !ids.has(n.id)),
          edges: (prev.edges ?? []).filter((edge) => !ids.has(edge.from) && !ids.has(edge.to)),
          start: ids.has(prev.start)
            ? (prev.nodes.find((n) => !ids.has(n.id))?.id ?? prev.start)
            : prev.start
        })
      );
    },
    [onSchemaChange]
  );

  const handleAutoLayoutClick = useCallback(() => {
    onAutoLayout();
    requestAnimationFrame(() => {
      rfRef.current?.fitView({ maxZoom: 0.72, padding: 0.22 });
    });
  }, [onAutoLayout]);

  function addNodeAtPosition(type: NodeTypeName) {
    if (!menu) return;
    const definition = getNodeDefinition(type);
    if (definition.maxCount) {
      const count = schema.nodes.filter((node) => node.type === type).length;
      if (count >= definition.maxCount) {
        closeMenu();
        return;
      }
    }
    const selectedFormNode = nodes.find((item) => item.selected)?.data.formNode;
    const id = `${type}_${Date.now()}`;
    const pos = { x: menu.canvasX, y: menu.canvasY };
    const sourceFieldId =
      selectedFormNode?.type === "step"
        ? selectedFormNode.fields?.find((field) => Boolean(field.id.trim()))?.id
        : undefined;
    const selectedSourceField =
      selectedFormNode?.type === "step" && sourceFieldId
        ? selectedFormNode.fields?.find((field) => field.id === sourceFieldId)
        : undefined;
    const seededRoutes =
      selectedFormNode?.type === "step" && selectedSourceField
        ? deriveSwitchRoutesFromField(selectedSourceField, schema, [])
        : [];
    const defaultSwitch =
      type === "switch"
        ? {
            switch: {
              mode: "rules" as const,
              sourceFieldId,
              routes: seededRoutes.length > 0 ? seededRoutes : [{ id: createSwitchRouteId(0), label: "Ветка 1", value: "value_0" }],
              fallback: { mode: "none" as const },
              allMatchingOutputs: false
            }
          }
        : {};
    const newFormNode: FormNode = {
      id,
      type,
      position: pos,
      ...defaultSwitch
    };
    setNodes((nds) => [
      ...nds.map((n) => ({ ...n, selected: false })),
      {
        id,
        type: "formNode",
        position: pos,
        data: { formNode: newFormNode },
        selected: true
      }
    ]);
    onSchemaChange((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newFormNode]
    }));
    onNodeSelect(id);
    closeMenu();
  }

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <ReactFlow
        {...CONSTRUCTOR_REACT_FLOW_DEFAULTS}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onInit={(inst) => {
          rfRef.current = inst as unknown as ReactFlowInstance;
        }}
        nodeTypes={RF_NODE_TYPES}
        edgeTypes={RF_EDGE_TYPES}
        defaultEdgeOptions={{ type: "custom" }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="#b0b8c8" />
        <Controls>
          <ControlButton
            onClick={handleAutoLayoutClick}
            title="Упорядочить узлы"
            aria-label="Упорядочить узлы"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M2 4h8M2 8h8M2 12h7"
                stroke="currentColor"
                strokeWidth="1.35"
                strokeLinecap="round"
              />
              <path d="M12 3.5v9" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
            </svg>
          </ControlButton>
        </Controls>
        <MiniMap
          nodeColor={() => "#e2e8f0"}
          maskColor="rgba(240,242,245,0.7)"
          style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10 }}
        />

        {/* Canvas hint */}
        <div className="ccanvas-hint">
          Клик — выделить · двойной клик — настройки · перетаскивание — перемещение · ПКМ — узел · Delete / Backspace —
          удалить узел или связь
        </div>
      </ReactFlow>

      {menu && (
        <ContextMenu
          x={menu.screenX}
          y={menu.screenY}
          onAddNode={addNodeAtPosition}
          onClose={closeMenu}
        />
      )}
    </div>
  );
}
