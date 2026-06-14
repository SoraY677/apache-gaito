// ─── Apache Config Types ───────────────────────────────────────────────────

export type RouteType = 'proxy' | 'redirect' | 'rewrite' | 'alias' | 'location';

export interface BaseRoute {
  type: RouteType;
  path?: string;
  target?: string | null;
}

export interface ProxyRoute extends BaseRoute {
  type: 'proxy';
  path: string;
  target: string;
}

export interface RedirectRoute extends BaseRoute {
  type: 'redirect';
  path: string;
  target: string;
  status?: string;
  isRegex?: boolean;
}

export interface RewriteRoute extends BaseRoute {
  type: 'rewrite';
  pattern: string;
  target: string;
  flags: string[];
  conditions: string[];
}

export interface AliasRoute extends BaseRoute {
  type: 'alias';
  path: string;
  target: string;
}

export interface LocationRoute extends BaseRoute {
  type: 'location';
  path: string;
  target: null;
  directives: string[];
  auth: string | null;
}

export type AnyRoute =
  | ProxyRoute
  | RedirectRoute
  | RewriteRoute
  | AliasRoute
  | LocationRoute;

export interface LocationBlock {
  path: string;
  isRegex: boolean;
  routes: AnyRoute[];
  directives: string[];
  auth: string | null;
}

export interface VirtualHost {
  addr: string;
  serverName: string | null;
  serverAlias: string[];
  documentRoot: string | null;
  routes: AnyRoute[];
  locations: LocationBlock[];
}

export interface ParsedConfig {
  virtualHosts: VirtualHost[];
}

// ─── Graph / ReactFlow Types ───────────────────────────────────────────────

export interface NodeColor {
  bg: string;
  border: string;
  text: string;
  badge: string;
}

export interface InternetNodeData {
  label: string;
}

export interface VhNodeData {
  addr: string;
  serverName: string | null;
  serverAlias: string[];
  documentRoot: string | null;
  label: string;
}

export interface RouteNodeData {
  route: AnyRoute;
  color: NodeColor;
}

export interface TargetNodeData {
  target: string;
  type: RouteType;
  color: NodeColor;
}
