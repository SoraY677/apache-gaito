import { useEffect, useRef } from 'react';

// Simple syntax highlighter via contenteditable overlay approach.
// We use a plain textarea for editing, and a div overlay for coloring.

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

function highlight(text) {
  return text
    // HTML escape first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Comments
    .replace(/(#.*)/g, '<span class="hl-comment">$1</span>')
    // Strings in quotes
    .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, '<span class="hl-string">$1</span>')
    // Directives/keywords
    .replace(
      new RegExp(`\\b(${KEYWORDS.join('|')})\\b`, 'g'),
      '<span class="hl-keyword">$1</span>'
    )
    // Tags like </VirtualHost>
    .replace(/(&lt;\/?[A-Za-z]+[^&]*?&gt;)/g, '<span class="hl-tag">$1</span>')
    // Numbers and flags
    .replace(/\b(\d+)\b/g, '<span class="hl-number">$1</span>');
}

export default function ApacheEditor({ value, onChange }) {
  const textareaRef = useRef(null);
  const highlightRef = useRef(null);

  const syncScroll = () => {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  useEffect(() => {
    if (highlightRef.current) {
      // Add trailing newline so last line renders correctly
      highlightRef.current.innerHTML = highlight(value + '\n');
    }
  }, [value]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Highlight layer */}
      <pre
        ref={highlightRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          margin: 0,
          padding: '16px 16px 16px 56px',
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
          fontSize: 13,
          lineHeight: 1.6,
          color: '#94a3b8',
          background: 'transparent',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          overflow: 'auto',
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 1,
          boxSizing: 'border-box',
        }}
      />

      {/* Line numbers */}
      <LineNumbers text={value} />

      {/* Actual textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onScroll={syncScroll}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        style={{
          position: 'absolute',
          inset: 0,
          margin: 0,
          padding: '16px 16px 16px 56px',
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
          fontSize: 13,
          lineHeight: 1.6,
          color: 'transparent',
          caretColor: '#e2e8f0',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          resize: 'none',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          overflow: 'auto',
          zIndex: 2,
          boxSizing: 'border-box',
          tabSize: 4,
        }}
        onKeyDown={e => {
          // Tab key inserts 4 spaces
          if (e.key === 'Tab') {
            e.preventDefault();
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            const newVal = value.substring(0, start) + '    ' + value.substring(end);
            onChange(newVal);
            setTimeout(() => {
              e.target.selectionStart = e.target.selectionEnd = start + 4;
            }, 0);
          }
        }}
      />
    </div>
  );
}

function LineNumbers({ text }) {
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
