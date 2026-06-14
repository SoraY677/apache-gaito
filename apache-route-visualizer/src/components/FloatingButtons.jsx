import { useRef } from 'react';
import {
  Save, FolderOpen, RefreshCw, Maximize2, Info,
} from 'lucide-react';

export default function FloatingButtons({ onSave, onLoad, onParse, onFitView, onInfo }) {
  const fileInputRef = useRef(null);

  const handleLoadClick = () => fileInputRef.current?.click();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      onLoad(ev.target.result);
    };
    reader.readAsText(file);
    // Reset so same file can be re-loaded
    e.target.value = '';
  };

  const buttons = [
    { icon: <FolderOpen size={18} />, label: 'Load', title: 'Load config file', onClick: handleLoadClick, color: '#3b82f6' },
    { icon: <Save size={18} />, label: 'Save', title: 'Save config file', onClick: onSave, color: '#22c55e' },
    { icon: <RefreshCw size={18} />, label: 'Parse', title: 'Re-parse & visualize', onClick: onParse, color: '#a855f7' },
    { icon: <Maximize2 size={18} />, label: 'Fit', title: 'Fit view', onClick: onFitView, color: '#f97316' },
    { icon: <Info size={18} />, label: 'Help', title: 'About', onClick: onInfo, color: '#64748b' },
  ];

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".conf,.txt,.cfg,*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div style={{
        position: 'absolute',
        bottom: 24,
        right: 24,
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        {buttons.map((btn) => (
          <button
            key={btn.label}
            onClick={btn.onClick}
            title={btn.title}
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              border: `1px solid ${btn.color}44`,
              background: '#0f172acc',
              backdropFilter: 'blur(8px)',
              color: btn.color,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
              boxShadow: `0 2px 12px ${btn.color}22`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = `${btn.color}22`;
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#0f172acc';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {btn.icon}
          </button>
        ))}
      </div>
    </>
  );
}
