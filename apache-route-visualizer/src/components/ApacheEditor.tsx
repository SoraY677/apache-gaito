import { useEffect, useRef, useCallback } from 'react';

const KEYWORDS = [
  'VirtualHost', 'ServerName', 'ServerAlias', 'DocumentRoot',
  'ProxyPass', 'ProxyPassReverse', 'ProxyPreserveHost',
  'Redirect', 'RedirectMatch', 'RedirectPermanent',
  'RewriteEngine', 'RewriteRule', 'RewriteCond', 'RewriteBase',
  'Location', 'LocationMatch', 'Directory', 'Files',
  'Alias', 'AliasMatch', 'ScriptAlias',
  'SSLEngine', 'SSLCertificateFile', 'SSLCertificateKeyFile',
  'Header', 'RequestHeader', 'LogLevel', 'ErrorLog', 'CustomLog',
  'Require', 'AuthType', 'AuthName', 'Options', 'AllowOverride',
];

// ---- Tokenizer-based highlighter ----------------------------------------
// Instead of chaining regex replacements (where a later regex can match
// inside HTML tags injected by an earlier one), we:
//   1. Identify all token ranges in the RAW source text
//   2. Sort them so they don't overlap
//   3. HTML-escape each segment and wrap tokens in <span> once at the end
// This completely avoids the bug where the string regex matched the
// `"hl-comment"` inside class="hl-comment" and produced broken HTML.
// -------------------------------------------------------------------------

const KEYWORD_RE = new RegExp(`\\b(${KEYWORDS.join('|')})\\b`, 'g');

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

interface Token { start: number; end: number; cls: string; }

function overlaps(tokens: Token[], start: number, end: number): boolean {
  return tokens.some(t => start < t.end && end > t.start);
}

/** Highlight non-comment code: find token ranges in raw text, build HTML. */
function highlightCode(raw: string): string {
  if (!raw) return '';
  const tokens: Token[] = [];
  let m: RegExpExecArray | null;

  // Apache directive tags:  <VirtualHost *:443>  </VirtualHost>  etc.
  const tagRe = /<\/?[A-Za-z][^>]*>/g;
  while ((m = tagRe.exec(raw)) !== null) {
    tokens.push({ start: m.index, end: m.index + m[0].length, cls: 'hl-tag' });
  }

  // Quoted strings (not inside a tag range already found)
  const strRe = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g;
  while ((m = strRe.exec(raw)) !== null) {
    if (!overlaps(tokens, m.index, m.index + m[0].length))
      tokens.push({ start: m.index, end: m.index + m[0].length, cls: 'hl-string' });
  }

  // Keywords  (reset lastIndex — module-level /g regex must be reset each call)
  KEYWORD_RE.lastIndex = 0;
  while ((m = KEYWORD_RE.exec(raw)) !== null) {
    if (!overlaps(tokens, m.index, m.index + m[0].length))
      tokens.push({ start: m.index, end: m.index + m[0].length, cls: 'hl-keyword' });
  }

  // Numbers
  const numRe = /\b(\d+)\b/g;
  while ((m = numRe.exec(raw)) !== null) {
    if (!overlaps(tokens, m.index, m.index + m[0].length))
      tokens.push({ start: m.index, end: m.index + m[0].length, cls: 'hl-number' });
  }

  tokens.sort((a, b) => a.start - b.start);

  let out = '';
  let pos = 0;
  for (const tok of tokens) {
    out += escapeHtml(raw.substring(pos, tok.start));
    out += `<span class="${tok.cls}">${escapeHtml(raw.substring(tok.start, tok.end))}</span>`;
    pos = tok.end;
  }
  return out + escapeHtml(raw.substring(pos));
}

/** Find first unquoted '#' on a line (= comment start). Returns -1 if none. */
function findCommentStart(line: string): number {
  let inStr = false;
  let strChar = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inStr) {
      if (ch === '\\') { i++; continue; }
      if (ch === strChar) inStr = false;
    } else {
      if (ch === '"' || ch === "'") { inStr = true; strChar = ch; }
      else if (ch === '#') return i;
    }
  }
  return -1;
}

function highlightLine(line: string): string {
  const ci = findCommentStart(line);
  if (ci === 0) return `<span class="hl-comment">${escapeHtml(line)}</span>`;
  if (ci > 0) {
    return (
      highlightCode(line.substring(0, ci)) +
      `<span class="hl-comment">${escapeHtml(line.substring(ci))}</span>`
    );
  }
  return highlightCode(line);
}

function highlight(text: string): string {
  return text.split('\n').map(highlightLine).join('\n');
}

interface Props {
  value: string;
  onChange: (val: string) => void;
}

export default function ApacheEditor({ value, onChange }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  const syncScroll = useCallback(() => {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.innerHTML = highlight(value + '\n');
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newVal = value.substring(0, start) + '    ' + value.substring(end);
      onChange(newVal);
      setTimeout(() => {
        el.selectionStart = el.selectionEnd = start + 4;
      }, 0);
    }
  };

  const sharedStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    margin: 0,
    padding: '16px 16px 16px 56px',
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
    fontSize: 13,
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    overflow: 'auto',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <pre
        ref={highlightRef}
        aria-hidden="true"
        style={{
          ...sharedStyle,
          color: '#94a3b8',
          background: 'transparent',
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 1,
        }}
      />

      <LineNumbers text={value} />

      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onScroll={syncScroll}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        style={{
          ...sharedStyle,
          color: 'transparent',
          caretColor: '#e2e8f0',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          resize: 'none',
          zIndex: 2,
          tabSize: 4,
        }}
      />
    </div>
  );
}

function LineNumbers({ text }: { text: string }) {
  const lines = (text + '\n').split('\n');
  return (
    <div style={{
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 44,
      background: '#0a1020',
      borderRight: '1px solid #1e293b',
      padding: '16px 0',
      overflowY: 'hidden',
      zIndex: 3,
      pointerEvents: 'none',
      userSelect: 'none',
    }}>
      {lines.map((_, i) => (
        <div key={i} style={{
          height: '1.6em',
          lineHeight: '1.6em',
          textAlign: 'right',
          paddingRight: 10,
          fontFamily: "'JetBrains Mono', Consolas, monospace",
          fontSize: 12,
          color: '#334155',
        }}>
          {i + 1}
        </div>
      ))}
    </div>
  );
}
