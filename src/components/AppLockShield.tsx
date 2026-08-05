import React, { useEffect, useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Lock, Unlock, AlertTriangle, EyeOff, X } from 'lucide-react';

interface AppLockShieldProps {
  onToggleLock?: (locked: boolean) => void;
}

export function AppLockShield({ onToggleLock }: AppLockShieldProps) {
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const saved = localStorage.getItem('biz_comply_app_locked');
    return saved !== null ? saved === 'true' : true;
  });

  const [toastMessage, setToastMessage] = useState<{ id: number; title: string; desc: string } | null>(null);

  const showSecurityToast = (title: string, desc: string) => {
    const id = Date.now();
    setToastMessage({ id, title, desc });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.id === id ? null : prev));
    }, 3500);
  };

  const toggleLock = (newState: boolean) => {
    setIsLocked(newState);
    localStorage.setItem('biz_comply_app_locked', String(newState));
    if (onToggleLock) onToggleLock(newState);
    if (newState) {
      showSecurityToast('🔒 Security Shield Enabled', 'Source code, right-click, and inspection tools locked.');
    } else {
      showSecurityToast('🔓 Security Shield Suspended', 'Inspection and developer tools unlocked.');
    }
  };

  useEffect(() => {
    if (!isLocked) {
      document.body.classList.remove('select-none', 'app-code-locked');
      return;
    }

    document.body.classList.add('select-none', 'app-code-locked');

    // 1. Disable Right Click Context Menu
    const handleContextMenu = (e: MouseEvent) => {
      // Allow right click if inside an editable input/textarea
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      e.preventDefault();
      showSecurityToast(
        '🔒 Code & Content Locked',
        'Right-click context menu and source inspection are disabled.'
      );
    };

    // 2. Disable Key Combinations for DevTools, View Source, Save Page
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
      const key = e.key.toLowerCase();

      // F12 Key
      if (e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        showSecurityToast('🛡️ Developer Tools Blocked', 'F12 key inspection is restricted on this web app.');
        return false;
      }

      // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (Inspect, Console, Element picker)
      if (ctrlOrCmd && e.shiftKey && (key === 'i' || key === 'j' || key === 'c' || key === 'k')) {
        e.preventDefault();
        e.stopPropagation();
        showSecurityToast('🛡️ Inspect Element Blocked', 'Developer shortcut disabled by Application Code Shield.');
        return false;
      }

      // Ctrl+U (View Source)
      if (ctrlOrCmd && key === 'u') {
        e.preventDefault();
        e.stopPropagation();
        showSecurityToast('🛡️ View Source Blocked', 'Viewing page source code is restricted.');
        return false;
      }

      // Ctrl+S (Save Page HTML)
      if (ctrlOrCmd && key === 's') {
        e.preventDefault();
        e.stopPropagation();
        showSecurityToast('🛡️ Save Code Blocked', 'Saving webpage source files is locked.');
        return false;
      }

      // Ctrl+P (Print Page / Export HTML)
      if (ctrlOrCmd && key === 'p') {
        // Prevent printing if locked
        e.preventDefault();
        e.stopPropagation();
        showSecurityToast('🛡️ Print / Export Blocked', 'Page printing and code export restricted.');
        return false;
      }
    };

    // 3. Disable Text Copying outside form inputs
    const handleCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return; // allow form field copying
      }
      e.preventDefault();
      showSecurityToast('🔒 Content Copying Locked', 'Copying app layout & data is disabled under Code Shield.');
    };

    // 4. Disable Dragging images/elements
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.tagName === 'IMG') {
        e.preventDefault();
      }
    };

    // Console Warning Banner
    const printConsoleSecurityWarning = () => {
      console.clear();
      console.log(
        '%c 🛑 BIZ-COMPLY SECURITY SHIELD %c\nApplication source code and UI layout are protected against unauthorized copying and reverse engineering.',
        'background: #dc2626; color: #ffffff; font-size: 16px; font-weight: bold; padding: 6px 12px; border-radius: 4px;',
        'color: #f87171; font-size: 12px; font-weight: bold; margin-top: 6px;'
      );
    };

    printConsoleSecurityWarning();

    window.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('copy', handleCopy, true);
    window.addEventListener('dragstart', handleDragStart, true);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('copy', handleCopy, true);
      window.removeEventListener('dragstart', handleDragStart, true);
      document.body.classList.remove('select-none', 'app-code-locked');
    };
  }, [isLocked]);

  return (
    <>
      {/* Toast Alert for Blocked Actions */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[9999] max-w-sm w-full bg-slate-900/95 dark:bg-slate-900/95 text-white p-4 rounded-xl shadow-2xl border border-red-500/40 backdrop-blur-md animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 shrink-0">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-red-300 flex items-center space-x-1">
                <span>{toastMessage.title}</span>
              </h4>
              <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                {toastMessage.desc}
              </p>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Application Security Badge */}
      <div className="fixed bottom-3 right-3 z-40 hidden sm:flex items-center space-x-2 bg-slate-900/90 dark:bg-slate-900/90 text-slate-200 px-3 py-1.5 rounded-full border border-slate-800 shadow-lg text-[11px] backdrop-blur-sm select-none">
        <div className={`w-2 h-2 rounded-full ${isLocked ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
        <span className="font-semibold text-slate-300">
          {isLocked ? 'Code Lock Active' : 'Shield Suspended'}
        </span>
        <button
          onClick={() => toggleLock(!isLocked)}
          title={isLocked ? 'Click to unlock inspection for dev testing' : 'Click to lock application code'}
          className="ml-1 p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          {isLocked ? <Lock className="w-3 h-3 text-emerald-400" /> : <Unlock className="w-3 h-3 text-amber-400" />}
        </button>
      </div>
    </>
  );
}
