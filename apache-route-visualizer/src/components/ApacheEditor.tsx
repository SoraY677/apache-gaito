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

const KEYWORD_RE = new RegExp(`\\b(${KEYWORDS.join('|')})\\b`, 'g');

function highlight(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/(#.*)/g, '<span class="hl-comment">$1</span>')
    .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, '<span class="hl-string">$1</span>')
    .replace(KEYWORD_RE, '<span class="hl-keyword">$1</span>')
    .replace(/(&lt;\/?[A-Za-z]+[^&]*?&gt;)/g, '<span class="hl-tag">$1</span>')
    .replace(/\b(\d+)\b/g, '<span class="hl-number">$1</span>');
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
