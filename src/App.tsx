import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from './app/store';
import { openFile } from './app/loadFlow';
import { ScoreView } from './components/ScoreView';
import { ExplanationPanel } from './components/ExplanationPanel';
import { PianoKeyboard } from './components/PianoKeyboard';
import { PlaybackControls } from './components/PlaybackControls';
import { AudienceToggle } from './components/AudienceToggle';
import { WarningsBanner } from './components/WarningsBanner';
import { UploadDropzone } from './components/UploadDropzone';

export default function App() {
  const model = useAppStore((s) => s.model);
  const fileName = useAppStore((s) => s.fileName);
  const errorMessage = useAppStore((s) => s.errorMessage);
  const loadStatus = useAppStore((s) => s.loadStatus);
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

  return (
    <div className={`app ${model ? 'app-loaded' : 'app-empty'}`}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">🎹</span>
          <span className="brand-name">Parso&nbsp;Piano</span>
        </div>
        {model && (
          <div className="topbar-file" title={fileName ?? ''}>
            {model.title ?? fileName}
          </div>
        )}
        <div className="topbar-actions">
          <AudienceToggle />
          {model && (
            <button className="btn btn-small" onClick={() => inputRef.current?.click()}>
              Open…
            </button>
          )}
        </div>
      </header>

      {model && loadStatus === 'ready' && errorMessage && (
        <div className="load-error" role="alert">
          {errorMessage}
        </div>
      )}
      <WarningsBanner />

      <main className="main">
        <div className="score-column">
          <ScoreView />
          {!model && loadStatus !== 'loading' && <UploadDropzone />}
        </div>
        <ExplanationPanel />
      </main>

      {model && (
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
