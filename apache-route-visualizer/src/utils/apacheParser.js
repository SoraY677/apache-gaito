/**
 * Apache configuration parser
 * Extracts VirtualHosts, routes, and directives from Apache config text
 */

export function parseApacheConfig(configText) {
  const lines = configText.split('\n');
  const result = { virtualHosts: [] };
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

function parseVirtualHost(lines, startIndex, addr) {
  const vh = {
    addr,
    serverName: null,
    serverAlias: [],
    documentRoot: null,
    routes: [],
    locations: [],
  };

  let i = startIndex + 1;
  const rewriteConditions = [];

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.match(/^<\/VirtualHost>/i)) return { virtualHost: vh, endIndex: i };
    if (line.startsWith('#') || line === '') { i++; continue; }

    // ServerName
    const snMatch = line.match(/^ServerName\s+(.+)/i);
    if (snMatch) { vh.serverName = snMatch[1].trim(); i++; continue; }

    // ServerAlias
    const saMatch = line.match(/^ServerAlias\s+(.+)/i);
    if (saMatch) { vh.serverAlias = saMatch[1].trim().split(/\s+/); i++; continue; }

    // DocumentRoot
    const drMatch = line.match(/^DocumentRoot\s+(.+)/i);
    if (drMatch) { vh.documentRoot = drMatch[1].trim().replace(/['"]/g, ''); i++; continue; }

    // ProxyPass (skip ProxyPassReverse)
    const ppMatch = line.match(/^ProxyPass\s+(\S+)\s+(\S+)/i);
    if (ppMatch && !/ProxyPassReverse/i.test(line)) {
      vh.routes.push({ type: 'proxy', path: ppMatch[1], target: ppMatch[2] });
      i++; continue;
    }

    // Redirect / RedirectMatch
    const redMatch = line.match(/^RedirectMatch\s+(?:(\d{3}|permanent|temp|seeother|gone)\s+)?(\S+)\s+(\S+)/i);
    if (redMatch) {
      vh.routes.push({ type: 'redirect', status: redMatch[1] || '302', path: redMatch[2], target: redMatch[3], isRegex: true });
      i++; continue;
    }
    const redMatch2 = line.match(/^Redirect\s+(?:(\d{3}|permanent|temp|seeother|gone)\s+)?(\S+)\s+(\S+)/i);
    if (redMatch2) {
      vh.routes.push({ type: 'redirect', status: redMatch2[1] || '302', path: redMatch2[2], target: redMatch2[3] });
      i++; continue;
    }

    // RewriteCond (accumulate)
    const rcMatch = line.match(/^RewriteCond\s+(.+)/i);
    if (rcMatch) { rewriteConditions.push(rcMatch[1].trim()); i++; continue; }

    // RewriteRule
    const rrMatch = line.match(/^RewriteRule\s+(\S+)\s+(\S+)(?:\s+\[(.+?)\])?/i);
    if (rrMatch) {
      vh.routes.push({
        type: 'rewrite',
        pattern: rrMatch[1],
        target: rrMatch[2],
        flags: rrMatch[3] ? rrMatch[3].split(',') : [],
        conditions: [...rewriteConditions],
      });
      rewriteConditions.length = 0;
      i++; continue;
    }

    // Alias
    const aliasMatch = line.match(/^Alias\s+(\S+)\s+(\S+)/i);
    if (aliasMatch) {
      vh.routes.push({ type: 'alias', path: aliasMatch[1], target: aliasMatch[2].replace(/['"]/g, '') });
      i++; continue;
    }

    // Location block
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

function parseLocation(lines, startIndex, path, isRegex) {
  const loc = { path, isRegex, routes: [], directives: [], auth: null };
  let i = startIndex + 1;
  const rewriteConditions = [];

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.match(/^<\/Location(?:Match)?>/i)) return { location: loc, endIndex: i };
    if (line.startsWith('#') || line === '') { i++; continue; }

    const ppMatch = line.match(/^ProxyPass\s+(\S+)/i);
    if (ppMatch && !/ProxyPassReverse/i.test(line)) {
      loc.routes.push({ type: 'proxy', target: ppMatch[1] });
      i++; continue;
    }

    const rcMatch = line.match(/^RewriteCond\s+(.+)/i);
    if (rcMatch) { rewriteConditions.push(rcMatch[1].trim()); i++; continue; }

    const rrMatch = line.match(/^RewriteRule\s+(\S+)\s+(\S+)(?:\s+\[(.+?)\])?/i);
    if (rrMatch) {
      loc.routes.push({
        type: 'rewrite',
        pattern: rrMatch[1],
        target: rrMatch[2],
        flags: rrMatch[3] ? rrMatch[3].split(',') : [],
        conditions: [...rewriteConditions],
      });
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
