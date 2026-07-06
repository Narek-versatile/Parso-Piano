import { useState } from 'react';
import { useAppStore } from '../app/store';

export function WarningsBanner() {
  const warnings = useAppStore((s) => s.warnings);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const fileName = useAppStore((s) => s.fileName);

  if (warnings.length === 0 || dismissed === fileName) return null;

  return (
    <div className="warnings" role="status">
      <div className="warnings-body">
        <strong>Heads-up about this file</strong>
        <ul>
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      </div>
      <button className="btn btn-small" onClick={() => setDismissed(fileName)} aria-label="Dismiss warnings">
        ✕
      </button>
    </div>
  );
}
