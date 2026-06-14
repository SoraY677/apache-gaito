import { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { InternetNode, VirtualHostNode, RouteNode, TargetNode } from './CustomNodes';
import FloatingButtons from './FloatingButtons';
import { parseApacheConfig } from '../utils/apacheParser';
import { buildGraph } from '../utils/graphBuilder';

const nodeTypes: NodeTypes = {
  internetNode: InternetNode,
  vhNode: VirtualHostNode,
  routeNode: RouteNode,
  targetNode: TargetNode,
};

const EMPTY_MSG = 'Paste or load an Apache config on the left to visualize routing.';

interface Props {
  configText: string;
  onLoad: (text: string) => void;
}

function RouteViewerInner({ configText, onLoad }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const { fitView } = useReactFlow();

  const rebuild = useCallback((text: string) => {
    if (!text.trim()) {
      setNodes([]);
      setEdges([]);
      setIsEmpty(true);
      setParseError(null);
      return;
    }
    try {
      const parsed = parseApacheConfig(text);
      if (parsed.virtualHosts.length === 0) {
        setNodes([]);
        setEdges([]);
        setIsEmpty(true);
        setParseError('No VirtualHost blocks found.');
        return;
      }
      const { nodes: n, edges: e } = buildGraph(parsed);
      setNodes(n);
      setEdges(e);
      setIsEmpty(false);
      setParseError(null);
      setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 50);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err));
    }
  }, [setNodes, setEdges, fitView]);

  useEffect(() => { rebuild(configText); }, [configText, rebuild]);

  const handleSave = useCallback(() => {
    const blob = new Blob([configText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'apache.conf';
    a.click();
    URL.revokeObjectURL(url);
  }, [configText]);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.15, duration: 400 });
  }, [fitView]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        style={{ background: '#030712' }}
        defaultEdgeOptions={{ type: 'smoothstep' }}
      >
        <Background color="#1e293b" gap={24} size={1} />
        <Controls style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }} />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === 'internetNode') return '#3b82f6';
            if (n.type === 'vhNode') return '#1d4ed8';
            if (n.type === 'routeNode') return (n.data as { color?: { border?: string } }).color?.border ?? '#475569';
            if (n.type === 'targetNode') return '#374151';
            return '#475569';
          }}
          maskColor="#030712bb"
          style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
        />
      </ReactFlow>

      {isEmpty && !parseError && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <div style={{
            color: '#334155', fontSize: 14, textAlign: 'center',
            maxWidth: 300, lineHeight: 1.8, fontFamily: 'monospace',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗺</div>
            {EMPTY_MSG}
          </div>
        </div>
      )}

      {parseError && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          background: '#431407', border: '1px solid #f97316', borderRadius: 8,
          padding: '8px 16px', color: '#fdba74', fontSize: 12, fontFamily: 'monospace',
          zIndex: 10,
        }}>
          ⚠ {parseError}
        </div>
      )}

      {/* Legend */}
      <div style={{
        position: 'absolute', top: 12, left: 12,
        background: '#0f172add', border: '1px solid #1e293b',
        borderRadius: 8, padding: '8px 12px',
        display: 'flex', flexDirection: 'column', gap: 5, zIndex: 10,
      }}>
        {([
          { color: '#22c55e', label: 'ProxyPass' },
          { color: '#f97316', label: 'Redirect' },
          { color: '#a855f7', label: 'RewriteRule' },
          { color: '#38bdf8', label: 'Alias / Location' },
        ] as const).map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
            <span style={{ color: '#64748b', fontSize: 10, fontFamily: 'monospace' }}>{label}</span>
          </div>
        ))}
      </div>

      <FloatingButtons
        onSave={handleSave}
        onLoad={onLoad}
        onParse={() => rebuild(configText)}
        onFitView={handleFitView}
        onInfo={() => setShowInfo(v => !v)}
      />

      {showInfo && (
        <div
          style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: '#000000aa', zIndex: 30,
          }}
          onClick={() => setShowInfo(false)}
        >
          <div
            style={{
              background: '#0f172a', border: '1px solid #1e293b',
              borderRadius: 12, padding: 24, maxWidth: 360,
              fontFamily: 'monospace', color: '#94a3b8', lineHeight: 1.7,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
              Apache Route Visualizer
            </div>
            <p style={{ margin: '0 0 10px' }}>
              Paste or load an Apache <code>.conf</code> file on the left. The routing graph updates automatically.
            </p>
            <p style={{ margin: 0 }}>
              Supported: <code>VirtualHost</code>, <code>ProxyPass</code>, <code>Redirect</code>, <code>RewriteRule</code>, <code>Alias</code>, <code>Location</code>
            </p>
            <button
              onClick={() => setShowInfo(false)}
              style={{
                marginTop: 16, width: '100%', padding: '8px 0',
                background: '#1e293b', border: '1px solid #334155',
                borderRadius: 6, color: '#94a3b8', cursor: 'pointer',
              }}
            >Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RouteViewer(props: Props) {
  return <RouteViewerInner {...props} />;
}
