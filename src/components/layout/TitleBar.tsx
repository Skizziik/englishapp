import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const checkMaximized = async () => {
      if (window.electronAPI) {
        const maximized = await window.electronAPI.window.isMaximized();
        setIsMaximized(maximized);
      }
    };
    checkMaximized();
  }, []);

  const handleMinimize = () => {
    window.electronAPI?.window.minimize();
  };

  const handleMaximize = async () => {
    await window.electronAPI?.window.maximize();
    const maximized = await window.electronAPI?.window.isMaximized();
    setIsMaximized(maximized || false);
  };

  const handleClose = () => {
    window.electronAPI?.window.close();
  };

  return (
    <div className="h-10 bg-background/80 backdrop-blur-xl border-b border-border flex items-center justify-between select-none drag-region">
      {/* App logo and name */}
      <div className="flex items-center gap-2 px-4 no-drag">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold">E</span>
        </div>
        <span className="text-sm font-semibold text-foreground/80">English Learning</span>
      </div>

      {/* Window controls */}
      <div className="flex items-center h-full no-drag">
        <button
          onClick={handleMinimize}
          className="h-full px-4 hover:bg-white/10 transition-colors flex items-center justify-center"
          aria-label="Свернуть"
        >
          <Minus className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          onClick={handleMaximize}
          className="h-full px-4 hover:bg-white/10 transition-colors flex items-center justify-center"
          aria-label={isMaximized ? 'Восстановить' : 'Развернуть'}
        >
          {isMaximized ? (
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <Square className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
        <button
          onClick={handleClose}
          className="h-full px-4 hover:bg-red-500 transition-colors flex items-center justify-center group"
          aria-label="Закрыть"
        >
          <X className="h-4 w-4 text-muted-foreground group-hover:text-white" />
        </button>
      </div>
    </div>
  );
};
