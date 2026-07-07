import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore, type AppView } from './app/store';
import { openFile, openFromUrl } from './app/loadFlow';
import { ScoreView } from './components/ScoreView';
import { ExplanationPanel } from './components/ExplanationPanel';
import { PianoKeyboard } from './components/PianoKeyboard';
import { PlaybackControls } from './components/PlaybackControls';
import { AudienceToggle } from './components/AudienceToggle';
import { WarningsBanner } from './components/WarningsBanner';
import { UploadDropzone } from './components/UploadDropzone';
import { PracticeBar } from './components/PracticeBar';
import { Learn } from './learn/components/Learn';
import { CheatSheet } from './learn/components/CheatSheet';

const VIEW_TABS: { id: AppView; label: string; short: string }[] = [
  { id: 'score', label: 'Score', short: '🎼' },
  { id: 'learn', label: 'Learn', short: '🎓' },
  { id: 'cheatsheet', label: 'Cheatsheet', short: '📜' },
];

export default function App() {
  const model = useAppStore((s) => s.model);
  const errorMessage = useAppStore((s) => s.errorMessage);
  const loadStatus = useAppStore((s) => s.loadStatus);
  const view = useAppStore((s) => s.view);
  const keyboardSize = useAppStore((s) => s.keyboardSize);
  const set = useAppStore((s) => s.set);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) void openFile(file);
  }, []);

  // Load a shared example when the URL names one (?piece=…).
  useEffect(() => {
    void openFromUrl();
  }, []);

  useEffect(() => {
    const onDragOver = (e: DragEvent) => e.preventDefault();
    const onDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    };
    const onDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [onDrop]);

  const scoreVisible = view === 'score';

  return (
    <div className={`app ${model ? 'app-loaded' : 'app-empty'} view-${view} ${keyboardSize === 'focus' ? 'app-focus' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">🎹</span>
          <span className="brand-name">Parso&nbsp;Piano</span>
        </div>
        <nav className="view-tabs" aria-label="App sections">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              className={view === tab.id ? 'tab-active' : ''}
              onClick={() => set({ view: tab.id })}
            >
              <span className="tab-icon">{tab.short}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="topbar-actions">
          {scoreVisible && <AudienceToggle />}
          {scoreVisible && model && (
            <button className="btn btn-small" onClick={() => inputRef.current?.click()}>
              Open…
            </button>
          )}
        </div>
      </header>

      {scoreVisible && model && loadStatus === 'ready' && errorMessage && (
        <div className="load-error" role="alert">
          {errorMessage}
        </div>
      )}
      {scoreVisible && <WarningsBanner />}

      {/* The score view stays mounted so OSMD survives tab switches. */}
      <main className="main" hidden={!scoreVisible}>
        <div className="score-column">
          <PracticeBar />
          <ScoreView />
          {!model && loadStatus !== 'loading' && <UploadDropzone />}
        </div>
        <ExplanationPanel />
      </main>

      {view === 'learn' && (
        <main className="main main-page">
          <Learn />
        </main>
      )}
      {view === 'cheatsheet' && (
        <main className="main main-page">
          <CheatSheet />
        </main>
      )}

      {scoreVisible && model && (
        <footer className="dock">
          <PlaybackControls />
          <PianoKeyboard />
        </footer>
      )}

      {dragging && (
        <div className="drag-veil">
          <div className="drag-veil-text">Drop your music file to open it</div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".mid,.midi,.xml,.musicxml,.mxl"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void openFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
