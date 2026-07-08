import { useState } from 'react';
import {
  decodeProgress,
  encodeProgress,
  loadProgress,
  mergeProgress,
  saveProgress,
  type Progress,
} from '../progress';

/**
 * Cross-device progress transfer. No accounts / no server: your progress is
 * packed into a link (or code) you open on another device, where it MERGES
 * with whatever is there — you never lose progress moving between devices.
 */
export function SyncPanel({
  progress,
  onImported,
}: {
  progress: Progress;
  onImported: (p: Progress) => void;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const link = `${window.location.origin}${window.location.pathname}?sync=${encodeProgress(progress)}`;
  const bareCode = encodeProgress(progress);

  const flash = (msg: string) => {
    setStatus(msg);
    window.setTimeout(() => setStatus(null), 2600);
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(label);
    } catch {
      flash('Copy failed — long-press the box to copy manually.');
    }
  };

  const restore = () => {
    const incoming = decodeProgress(code);
    if (!incoming) {
      flash('That code didn’t look right. Paste the whole thing.');
      return;
    }
    const merged = mergeProgress(loadProgress(), incoming);
    saveProgress(merged);
    onImported(merged);
    setCode('');
    flash('✓ Progress restored and merged!');
  };

  return (
    <div className="sync">
      <button className="sync-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        ☁ Sync{open ? ' ▲' : ' ▾'}
      </button>

      {open && (
        <div className="sync-body">
          <p className="sync-lead">
            Move your streak & XP to another device — no account needed. Open the link there, or paste the code.
          </p>

          <div className="sync-section">
            <span className="sync-label">1 · Back up this device</span>
            <div className="sync-row">
              <button className="btn btn-primary btn-small" onClick={() => void copy(link, '✓ Backup link copied!')}>
                Copy backup link
              </button>
              <button className="btn btn-small" onClick={() => void copy(bareCode, '✓ Code copied!')}>
                Copy code
              </button>
            </div>
            <textarea className="sync-box" readOnly value={link} onFocus={(e) => e.target.select()} rows={2} />
          </div>

          <div className="sync-section">
            <span className="sync-label">2 · Restore on another device</span>
            <textarea
              className="sync-box"
              placeholder="Paste a backup link or code here…"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/^.*[?&]sync=/, ''))}
              rows={2}
            />
            <button className="btn btn-primary btn-small" onClick={restore} disabled={!code.trim()}>
              Restore progress
            </button>
          </div>

          {status && <div className="sync-status">{status}</div>}
        </div>
      )}
    </div>
  );
}
