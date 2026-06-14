import { Handle, Position, type NodeProps } from 'reactflow';
import { Globe } from 'lucide-react';
import type { InternetNodeData, VhNodeData, RouteNodeData, TargetNodeData, AnyRoute } from '../types';

export function InternetNode(_props: NodeProps<InternetNodeData>) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e3a5f, #0f2340)',
      border: '2px solid #3b82f6',
      borderRadius: 12,
      padding: '12px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      minWidth: 120,
      boxShadow: '0 0 20px rgba(59,130,246,0.3)',
    }}>
      <Globe size={28} color="#60a5fa" />
      <span style={{ color: '#93c5fd', fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>INTERNET</span>
      <Handle type="source" position={Position.Bottom} style={{ background: '#3b82f6', border: '2px solid #93c5fd' }} />
    </div>
  );
}

export function VirtualHostNode({ data }: NodeProps<VhNodeData>) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e2d4a, #0f1929)',
      border: '2px solid #3b82f6',
      borderRadius: 10,
      padding: '10px 14px',
      minWidth: 200,
      boxShadow: '0 0 14px rgba(59,130,246,0.2)',
      fontFamily: 'monospace',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#3b82f6' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <div style={{
          background: '#1d4ed8',
          borderRadius: 4,
          padding: '2px 7px',
          fontSize: 10,
          fontWeight: 700,
          color: '#bfdbfe',
          letterSpacing: 0.5,
        }}>VirtualHost</div>
        <span style={{ color: '#64748b', fontSize: 11 }}>{data.addr}</span>
      </div>

      {data.serverName && (
        <div style={{ color: '#93c5fd', fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
          {data.serverName}
        </div>
      )}
      {data.serverAlias.length > 0 && (
        <div style={{ color: '#64748b', fontSize: 11 }}>
          {data.serverAlias.join(', ')}
        </div>
      )}
      {data.documentRoot && (
        <div style={{ color: '#475569', fontSize: 11, marginTop: 4, borderTop: '1px solid #1e3a5f', paddingTop: 4 }}>
          📁 {data.documentRoot}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ background: '#3b82f6' }} />
    </div>
  );
}

const ROUTE_META: Record<string, { icon: string; label: string }> = {
  proxy:    { icon: '⇌', label: 'ProxyPass' },
  redirect: { icon: '↪', label: 'Redirect' },
  rewrite:  { icon: '✎', label: 'RewriteRule' },
  alias:    { icon: '⊕', label: 'Alias' },
  location: { icon: '📍', label: 'Location' },
};

function getStatusLabel(route: AnyRoute): string | null {
  if (route.type !== 'redirect') return null;
  const s = route.status;
  if (!s) return null;
  return s === 'permanent' ? '301' : s;
}

function getFlags(route: AnyRoute): string[] {
  if (route.type === 'rewrite') return route.flags;
  return [];
}

function getConditions(route: AnyRoute): string[] {
  if (route.type === 'rewrite') return route.conditions;
  return [];
}

function getPathDisplay(route: AnyRoute): string {
  if (route.type === 'rewrite') return route.pattern;
  return route.path ?? '/';
}

export function RouteNode({ data }: NodeProps<RouteNodeData>) {
  const { route, color } = data;
  const meta = ROUTE_META[route.type] ?? { icon: '?', label: route.type };
  const pathDisplay = getPathDisplay(route);
  const statusLabel = getStatusLabel(route);
  const flags = getFlags(route);
  const conditions = getConditions(route);

  return (
    <div style={{
      background: color.bg,
      border: `2px solid ${color.border}`,
      borderRadius: 8,
      padding: '8px 12px',
      minWidth: 180,
      fontFamily: 'monospace',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: color.border }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{
          background: color.badge,
          border: `1px solid ${color.border}`,
          borderRadius: 4,
          padding: '1px 6px',
          fontSize: 10,
          fontWeight: 700,
          color: color.text,
        }}>
          {meta.icon} {meta.label}
          {statusLabel && ` ${statusLabel}`}
        </span>
      </div>

      <div style={{ color: color.text, fontSize: 12, wordBreak: 'break-all' }}>
        {pathDisplay}
      </div>

      {conditions.length > 0 && (
        <div style={{ marginTop: 4, borderTop: `1px solid ${color.badge}`, paddingTop: 4 }}>
          {conditions.map((c, i) => (
            <div key={i} style={{ color: '#64748b', fontSize: 10 }}>if {c}</div>
          ))}
        </div>
      )}

      {flags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
          {flags.map(f => (
            <span key={f} style={{
              background: '#0f172a',
              border: `1px solid ${color.badge}`,
              borderRadius: 3,
              padding: '0px 5px',
              fontSize: 9,
              color: '#64748b',
            }}>{f}</span>
          ))}
        </div>
      )}

      {route.target && <Handle type="source" position={Position.Bottom} style={{ background: color.border }} />}
    </div>
  );
}

export function TargetNode({ data }: NodeProps<TargetNodeData>) {
  const { target, color } = data;

  const isUrl = target.startsWith('http://') || target.startsWith('https://') || target.startsWith('ws://');
  const isPath = target.startsWith('/') && !isUrl;

  return (
    <div style={{
      background: '#0f172a',
      border: `2px solid ${color.border}`,
      borderRadius: 8,
      padding: '8px 12px',
      minWidth: 180,
      maxWidth: 280,
      fontFamily: 'monospace',
      boxShadow: `0 0 10px ${color.border}33`,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: color.border }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 16 }}>{isUrl ? '🌐' : isPath ? '📂' : '🔗'}</span>
        <span style={{
          color: color.text,
          fontSize: 11,
          wordBreak: 'break-all',
          lineHeight: 1.4,
        }}>{target}</span>
      </div>
    </div>
  );
}
