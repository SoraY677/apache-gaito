import { useRef } from 'react';
import { Save, FolderOpen, RefreshCw, Maximize2, Info } from 'lucide-react';
import type { ReactNode, CSSProperties } from 'react';

interface ButtonDef {
  icon: ReactNode;
  label: string;
  title: string;
  onClick: () => void;
  color: string;
}

interface Props {
  onSave: () => void;
  onLoad: (text: string) => void;
  onParse: () => void;
  onFitView: () => void;
  onInfo: () => void;
}

export default function FloatingButtons({ onSave, onLoad, onParse, onFitView, onInfo }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') onLoad(ev.target.result);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const buttons: ButtonDef[] = [
    { icon: <FolderOpen size={18} />, label: 'Load',  title: 'Load config file',      onClick: handleLoadClick, color: '#3b82f6' },
    { icon: <Save       size={18} />, label: 'Save',  title: 'Save config file',      onClick: onSave,         color: '#22c55e' },
    { icon: <RefreshCw  size={18} />, label: 'Parse', title: 'Re-parse & visualize',  onClick: onParse,        color: '#a855f7' },
    { icon: <Maximize2  size={18} />, label: 'Fit',   title: 'Fit view',              onClick: onFitView,      color: '#f97316' },
    { icon: <Info       size={18} />, label: 'Help',  title: 'About',                 onClick: onInfo,         color: '#64748b' },
  ];

  const baseStyle = (color: string): CSSProperties => ({
    width: 48,
    height: 48,
    borderRadius: 12,
    border: `1px solid ${color}44`,
    background: '#0f172acc',
    backdropFilter: 'blur(8px)',
    color,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
    boxShadow: `0 2px 12px ${color}22`,
  });

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
            style={baseStyle(btn.color)}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = `${btn.color}22`;
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = '#0f172acc';
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            {btn.icon}
          </button>
        ))}
      </div>
    </>
  );
}
