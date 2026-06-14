import { useState, useCallback, useRef } from 'react';
import { ReactFlowProvider } from 'reactflow';
import ApacheEditor from './components/ApacheEditor';
import RouteViewer from './components/RouteViewer';
import './App.css';

const DEFAULT_CONFIG = `# Apache Route Visualizer — Example Configuration
# Edit this config to see the routing graph update in real time.

<VirtualHost *:80>
    ServerName example.com
    ServerAlias www.example.com

    # Redirect all HTTP to HTTPS
    Redirect permanent / https://example.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName example.com
    ServerAlias www.example.com

    DocumentRoot /var/www/html

    # API reverse proxy
    ProxyPass        /api/  http://backend:3000/api/
    ProxyPassReverse /api/  http://backend:3000/api/

    # WebSocket proxy
    ProxyPass        /ws    ws://backend:3000/ws
    ProxyPassReverse /ws    ws://backend:3000/ws

    # Admin panel
    <Location /admin>
        ProxyPass http://admin-service:8080/
        ProxyPassReverse http://admin-service:8080/
        Require ip 10.0.0.0/8
    </Location>

    # Static assets alias
    Alias /static /var/www/static

    # Rewrite old paths
    RewriteEngine On
    RewriteCond %{REQUEST_URI} ^/old-blog/(.*)$
    RewriteRule ^/old-blog/(.*)$ /blog/$1 [R=301,L]
</VirtualHost>

<VirtualHost *:443>
    ServerName api.example.com

    ProxyPass        / http://api-gateway:8080/
    ProxyPassReverse / http://api-gateway:8080/

    <Location /v1>
        ProxyPass http://api-v1:8001/
    </Location>

    <Location /v2>
        ProxyPass http://api-v2:8002/
    </Location>
</VirtualHost>
`;

export default function App() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [dividerX, setDividerX] = useState(50);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setDividerX(Math.min(80, Math.max(20, pct)));
    };

    const onMouseUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, []);

  const handleLoad = useCallback((text: string) => setConfig(text), []);

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-header-brand">
          <span className="app-header-icon">⚙</span>
          <span className="app-header-title">Apache Route Visualizer</span>
        </div>
        <div className="app-header-labels">
          <span className="panel-label">Config Editor</span>
          <span className="panel-label viewer-label">Route Viewer</span>
        </div>
      </header>

      <main className="app-main" ref={containerRef}>
        <div className="panel editor-panel" style={{ width: `${dividerX}%` }}>
          <ApacheEditor value={config} onChange={setConfig} />
        </div>

        <div className="divider" onMouseDown={handleMouseDown} title="Drag to resize">
          <div className="divider-handle" />
        </div>

        <div className="panel viewer-panel" style={{ width: `${100 - dividerX}%` }}>
          <ReactFlowProvider>
            <RouteViewer configText={config} onLoad={handleLoad} />
          </ReactFlowProvider>
        </div>
      </main>
    </div>
  );
}
