import type { Node, Edge } from 'reactflow';
import { MarkerType } from 'reactflow';
import type {
  ParsedConfig,
  NodeColor,
  InternetNodeData,
  VhNodeData,
  RouteNodeData,
  TargetNodeData,
} from '../types';
import { flattenRoutes } from './apacheParser';

const NODE_WIDTH = 220;
const NODE_GAP_X = 60;
const NODE_GAP_Y = 100;

const ROUTE_COLORS: Record<string, NodeColor> = {
  proxy:    { bg: '#1a4a2e', border: '#22c55e', text: '#86efac', badge: '#166534' },
  redirect: { bg: '#431407', border: '#f97316', text: '#fdba74', badge: '#9a3412' },
  rewrite:  { bg: '#2e1065', border: '#a855f7', text: '#d8b4fe', badge: '#581c87' },
  alias:    { bg: '#0c4a6e', border: '#38bdf8', text: '#7dd3fc', badge: '#075985' },
  location: { bg: '#0c4a6e', border: '#38bdf8', text: '#7dd3fc', badge: '#075985' },
};

let nodeId = 0;
const nextId = () => `node-${++nodeId}`;

export interface GraphResult {
  nodes: Node[];
  edges: Edge[];
}

export function buildGraph(parsed: ParsedConfig): GraphResult {
  nodeId = 0;
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const internetId = nextId();
  nodes.push({
    id: internetId,
    type: 'internetNode',
    position: { x: 0, y: 0 },
    data: { label: 'Internet' } satisfies InternetNodeData,
  });

  parsed.virtualHosts.forEach((vh) => {
    const vhId = nextId();
    const label = vh.serverName ?? vh.addr;

    nodes.push({
      id: vhId,
      type: 'vhNode',
      position: { x: 0, y: 0 },
      data: {
        addr: vh.addr,
        serverName: vh.serverName,
        serverAlias: vh.serverAlias,
        documentRoot: vh.documentRoot,
        label,
      } satisfies VhNodeData,
    });

    edges.push({
      id: `e-internet-${vhId}`,
      source: internetId,
      target: vhId,
      label: vh.addr,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#64748b' },
      labelStyle: { fill: '#94a3b8', fontSize: 11 },
      labelBgStyle: { fill: '#0f172a' },
    });

    const routeItems = flattenRoutes(vh);

    // DocumentRoot fallback
    if (vh.documentRoot && routeItems.length === 0) {
      routeItems.push({ type: 'alias', path: '/', target: vh.documentRoot });
    }

    routeItems.forEach((route) => {
      const routeId = nextId();
      const targetId = nextId();
      const color = ROUTE_COLORS[route.type] ?? ROUTE_COLORS.alias;

      nodes.push({
        id: routeId,
        type: 'routeNode',
        position: { x: 0, y: 0 },
        data: { route, color } satisfies RouteNodeData,
      });

      edges.push({
        id: `e-${vhId}-${routeId}`,
        source: vhId,
        target: routeId,
        type: 'smoothstep',
        style: { stroke: color.border },
        markerEnd: { type: MarkerType.ArrowClosed, color: color.border },
      });

      if (route.target && route.target !== '-' && route.target !== '!') {
        nodes.push({
          id: targetId,
          type: 'targetNode',
          position: { x: 0, y: 0 },
          data: { target: route.target, type: route.type, color } satisfies TargetNodeData,
        });

        edges.push({
          id: `e-${routeId}-${targetId}`,
          source: routeId,
          target: targetId,
          type: 'smoothstep',
          animated: route.type === 'proxy',
          style: {
            stroke: color.border,
            strokeDasharray: route.type === 'redirect' ? '5 3' : undefined,
          },
          markerEnd: { type: MarkerType.ArrowClosed, color: color.border },
        });
      }
    });
  });

  layoutNodes(nodes, edges, internetId);
  return { nodes, edges };
}

function layoutNodes(nodes: Node[], edges: Edge[], internetId: string): void {
  const layers = new Map<number, string[]>();
  const queue: Array<{ id: string; layer: number }> = [{ id: internetId, layer: 0 }];
  const visited = new Set<string>([internetId]);

  const adjList = new Map<string, string[]>();
  edges.forEach(e => {
    if (!adjList.has(e.source)) adjList.set(e.source, []);
    adjList.get(e.source)!.push(e.target);
  });

  while (queue.length > 0) {
    const item = queue.shift()!;
    const { id, layer } = item;
    if (!layers.has(layer)) layers.set(layer, []);
    layers.get(layer)!.push(id);

    const children = adjList.get(id) ?? [];
    for (const childId of children) {
      if (!visited.has(childId)) {
        visited.add(childId);
        queue.push({ id: childId, layer: layer + 1 });
      }
    }
  }

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  layers.forEach((ids, layer) => {
    const totalWidth = ids.length * (NODE_WIDTH + NODE_GAP_X) - NODE_GAP_X;
    ids.forEach((id, idx) => {
      const node = nodeMap.get(id);
      if (node) {
        node.position = {
          x: idx * (NODE_WIDTH + NODE_GAP_X) - totalWidth / 2 + NODE_WIDTH / 2,
          y: layer * (120 + NODE_GAP_Y),
        };
      }
    });
  });
}
