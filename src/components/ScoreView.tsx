import { useEffect, useRef } from 'react';
import { scoreController } from '../app/scoreController';
import { useAppStore } from '../app/store';

export function ScoreView() {
  const hostRef = useRef<HTMLDivElement>(null);
  const loadStatus = useAppStore((s) => s.loadStatus);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    scoreController.attach(host);

    // Re-render (and rebuild note maps) when the container resizes.
    let timer: number | undefined;
    const observer = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => scoreController.rerender(), 250);
    });
    observer.observe(host);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  const onClick = (e: React.MouseEvent) => {
    const note = scoreController.noteFromClick(e.target as Element, e.clientX, e.clientY);
    scoreController.selectNote(note);
  };

  return (
    <div className="score-area" data-status={loadStatus}>
      <div className="score-host" ref={hostRef} onClick={onClick} />
      {loadStatus === 'loading' && (
        <div className="score-overlay">
          <div className="spinner" aria-label="Loading score" />
        </div>
      )}
    </div>
  );
}
