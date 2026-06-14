/**
 * Builds ReactFlow nodes and edges from parsed Apache config
 */

const NODE_WIDTH = 220;
const NODE_GAP_X = 60;
const NODE_GAP_Y = 100;

const ROUTE_COLORS = {
  proxy:    { bg: '#1a4a2e', border: '#22c55e', text: '#86efac', badge: '#166534' },
  redirect: { bg: '#431407', border: '#f97316', text: '#fdba74', badge: '#9a3412' },
  rewrite:  { bg: '#2e1065', border: '#a855f7', text: '#d8b4fe', badge: '#581c87' },
  alias:    { bg: '#0c4a6e', border: '#38bdf8', text: '#7dd3fc', badge: '#075985' },
};

let nodeId = 0;
const nextId = () => `node-${++nodeId}`;

export function buildGraph(parsed) {
  nodeId = 0;
  const nodes = [];
  const edges = [];

  // Internet entry node
  const internetId = nextId();
  nodes.push({
    id: internetId,
    type: 'internetNode',
    position: { x: 0, y: 0 },
    data: { label: 'Internet' },
  });

  const vhNodes = [];

  parsed.virtualHosts.forEach((vh) => {
    const vhId = nextId();
    const label = vh.serverName || vh.addr;
    vhNodes.push({ id: vhId, vh, label });

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
      },
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

    const routeItems = [
      ...vh.routes.map(r => ({ ...r, fromLocation: null })),
      ...vh.locations.flatMap(loc =>
        loc.routes.length > 0
          ? loc.routes.map(r => ({ ...r, path: loc.path, fromLocation: loc }))
          : [{ type: 'location', path: loc.path, target: null, directives: loc.directives, auth: loc.auth }]
      ),
    ];

    routeItems.forEach((route) => {
      const routeId = nextId();
      const targetId = nextId();
      const color = ROUTE_COLORS[route.type] || ROUTE_COLORS.alias;

      nodes.push({
        id: routeId,
        type: 'routeNode',
        position: { x: 0, y: 0 },
        data: { route, color },
      });

      edges.push({
        id: `e-${vhId}-${routeId}`,
        source: vhId,
        target: routeId,
        type: 'smoothstep',
        style: { stroke: color.border },
        markerEnd: { type: 'arrowclosed', color: color.border },
      });

      if (route.target && route.target !== '-' && route.target !== '!') {
        nodes.push({
          id: targetId,
          type: 'targetNode',
          position: { x: 0, y: 0 },
          data: { target: route.target, type: route.type, color },
        });

        edges.push({
          id: `e-${routeId}-${targetId}`,
          source: routeId,
          target: targetId,
          type: 'smoothstep',
          animated: route.type === 'proxy',
          style: { stroke: color.border, strokeDasharray: route.type === 'redirect' ? '5 3' : undefined },
          markerEnd: { type: 'arrowclosed', color: color.border },
        });
      }
    });

    // DocumentRoot node if no other routes cover it
    if (vh.documentRoot && vh.routes.length === 0 && vh.locations.length === 0) {
      const rootRouteId = nextId();
      const rootTargetId = nextId();
      nodes.push({
        id: rootRouteId,
        type: 'routeNode',
        position: { x: 0, y: 0 },
        data: { route: { type: 'alias', path: '/', target: vh.documentRoot }, color: ROUTE_COLORS.alias },
      });
      nodes.push({
        id: rootTargetId,
        type: 'targetNode',
        position: { x: 0, y: 0 },
        data: { target: vh.documentRoot, type: 'alias', color: ROUTE_COLORS.alias },
      });
      edges.push({ id: `e-${vhId}-${rootRouteId}`, source: vhId, target: rootRouteId, type: 'smoothstep', style: { stroke: ROUTE_COLORS.alias.border } });
      edges.push({ id: `e-${rootRouteId}-${rootTargetId}`, source: rootRouteId, target: rootTargetId, type: 'smoothstep', style: { stroke: ROUTE_COLORS.alias.border } });
    }
  });

  // Auto-layout: simple hierarchical left-to-right layout
  layoutNodes(nodes, edges, internetId);

  return { nodes, edges };
}

function layoutNodes(nodes, edges, internetId) {
  // BFS to assign layers
  const layers = new Map();
  const queue = [{ id: internetId, layer: 0 }];
  const visited = new Set([internetId]);

  const adjList = new Map();
  edges.forEach(e => {
    if (!adjList.has(e.source)) adjList.set(e.source, []);
    adjList.get(e.source).push(e.target);
  });

  while (queue.length > 0) {
    const { id, layer } = queue.shift();
    if (!layers.has(layer)) layers.set(layer, []);
    layers.get(layer).push(id);

    const children = adjList.get(id) || [];
    children.forEach(childId => {
      if (!visited.has(childId)) {
        visited.add(childId);
        queue.push({ id: childId, layer: layer + 1 });
      }
    });
  }

  // Assign positions
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
