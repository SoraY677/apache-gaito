import type {
  ParsedConfig,
  VirtualHost,
  LocationBlock,
  AnyRoute,
  RewriteRoute,
} from '../types';

export function parseApacheConfig(configText: string): ParsedConfig {
  const lines = configText.split('\n');
  const result: ParsedConfig = { virtualHosts: [] };
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.startsWith('#') || line === '') { i++; continue; }

    const vhMatch = line.match(/^<VirtualHost\s+(.+?)>/i);
    if (vhMatch) {
      const { virtualHost, endIndex } = parseVirtualHost(lines, i, vhMatch[1]);
      result.virtualHosts.push(virtualHost);
      i = endIndex + 1;
      continue;
    }
    i++;
  }

  return result;
}

function parseVirtualHost(
  lines: string[],
  startIndex: number,
  addr: string,
): { virtualHost: VirtualHost; endIndex: number } {
  const vh: VirtualHost = {
    addr,
    serverName: null,
    serverAlias: [],
    documentRoot: null,
    routes: [],
    locations: [],
  };

  let i = startIndex + 1;
  const rewriteConditions: string[] = [];

  while (i < lines.length) {
    const line = lines[i].trim();

    if (/^<\/VirtualHost>/i.test(line)) return { virtualHost: vh, endIndex: i };
    if (line.startsWith('#') || line === '') { i++; continue; }

    const snMatch = line.match(/^ServerName\s+(.+)/i);
    if (snMatch) { vh.serverName = snMatch[1].trim(); i++; continue; }

    const saMatch = line.match(/^ServerAlias\s+(.+)/i);
    if (saMatch) { vh.serverAlias = saMatch[1].trim().split(/\s+/); i++; continue; }

    const drMatch = line.match(/^DocumentRoot\s+(.+)/i);
    if (drMatch) { vh.documentRoot = drMatch[1].trim().replace(/['"]/g, ''); i++; continue; }

    const ppMatch = line.match(/^ProxyPass\s+(\S+)\s+(\S+)/i);
    if (ppMatch && !/ProxyPassReverse/i.test(line)) {
      vh.routes.push({ type: 'proxy', path: ppMatch[1], target: ppMatch[2] });
      i++; continue;
    }

    const redMatch = line.match(/^RedirectMatch\s+(?:(\d{3}|permanent|temp|seeother|gone)\s+)?(\S+)\s+(\S+)/i);
    if (redMatch) {
      vh.routes.push({ type: 'redirect', status: redMatch[1] ?? '302', path: redMatch[2], target: redMatch[3], isRegex: true });
      i++; continue;
    }
    const redMatch2 = line.match(/^Redirect\s+(?:(\d{3}|permanent|temp|seeother|gone)\s+)?(\S+)\s+(\S+)/i);
    if (redMatch2) {
      vh.routes.push({ type: 'redirect', status: redMatch2[1] ?? '302', path: redMatch2[2], target: redMatch2[3] });
      i++; continue;
    }

    const rcMatch = line.match(/^RewriteCond\s+(.+)/i);
    if (rcMatch) { rewriteConditions.push(rcMatch[1].trim()); i++; continue; }

    const rrMatch = line.match(/^RewriteRule\s+(\S+)\s+(\S+)(?:\s+\[(.+?)\])?/i);
    if (rrMatch) {
      const rw: RewriteRoute = {
        type: 'rewrite',
        pattern: rrMatch[1],
        target: rrMatch[2],
        flags: rrMatch[3] ? rrMatch[3].split(',') : [],
        conditions: [...rewriteConditions],
      };
      vh.routes.push(rw);
      rewriteConditions.length = 0;
      i++; continue;
    }

    const aliasMatch = line.match(/^Alias\s+(\S+)\s+(\S+)/i);
    if (aliasMatch) {
      vh.routes.push({ type: 'alias', path: aliasMatch[1], target: aliasMatch[2].replace(/['"]/g, '') });
      i++; continue;
    }

    const locMatch = line.match(/^<Location(?:Match)?\s+(.+?)>/i);
    if (locMatch) {
      const isRegex = /LocationMatch/i.test(line);
      const { location, endIndex } = parseLocation(lines, i, locMatch[1], isRegex);
      vh.locations.push(location);
      i = endIndex + 1;
      continue;
    }

    i++;
  }

  return { virtualHost: vh, endIndex: i };
}

function parseLocation(
  lines: string[],
  startIndex: number,
  path: string,
  isRegex: boolean,
): { location: LocationBlock; endIndex: number } {
  const loc: LocationBlock = { path, isRegex, routes: [], directives: [], auth: null };
  let i = startIndex + 1;
  const rewriteConditions: string[] = [];

  while (i < lines.length) {
    const line = lines[i].trim();

    if (/^<\/Location(?:Match)?>/i.test(line)) return { location: loc, endIndex: i };
    if (line.startsWith('#') || line === '') { i++; continue; }

    const ppMatch = line.match(/^ProxyPass\s+(\S+)/i);
    if (ppMatch && !/ProxyPassReverse/i.test(line)) {
      loc.routes.push({ type: 'proxy', path: path, target: ppMatch[1] });
      i++; continue;
    }

    const rcMatch = line.match(/^RewriteCond\s+(.+)/i);
    if (rcMatch) { rewriteConditions.push(rcMatch[1].trim()); i++; continue; }

    const rrMatch = line.match(/^RewriteRule\s+(\S+)\s+(\S+)(?:\s+\[(.+?)\])?/i);
    if (rrMatch) {
      const rw: RewriteRoute = {
        type: 'rewrite',
        pattern: rrMatch[1],
        target: rrMatch[2],
        flags: rrMatch[3] ? rrMatch[3].split(',') : [],
        conditions: [...rewriteConditions],
      };
      loc.routes.push(rw);
      rewriteConditions.length = 0;
      i++; continue;
    }

    const authMatch = line.match(/^Require\s+(.+)/i);
    if (authMatch) { loc.auth = authMatch[1].trim(); i++; continue; }

    loc.directives.push(line);
    i++;
  }

  return { location: loc, endIndex: i };
}

// Flatten location routes with parent path context
export function flattenRoutes(vh: VirtualHost): AnyRoute[] {
  const flat: AnyRoute[] = [...vh.routes];
  for (const loc of vh.locations) {
    if (loc.routes.length > 0) {
      for (const r of loc.routes) {
        flat.push({ ...r, path: r.path ?? loc.path } as AnyRoute);
      }
    } else {
      flat.push({
        type: 'location',
        path: loc.path,
        target: null,
        directives: loc.directives,
        auth: loc.auth,
      });
    }
  }
  return flat;
}
