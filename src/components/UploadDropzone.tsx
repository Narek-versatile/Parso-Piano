import { useRef } from 'react';
import { useAppStore } from '../app/store';
import { openFile } from '../app/loadFlow';

/** Hero empty-state with a drop target and file picker. */
export function UploadDropzone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const errorMessage = useAppStore((s) => s.errorMessage);
  const loadStatus = useAppStore((s) => s.loadStatus);

  const pick = () => inputRef.current?.click();

  return (
    <div className="dropzone" onClick={pick} role="button" aria-label="Open a music file">
      <div className="dropzone-inner">
        <div className="dropzone-icon">🎹</div>
        <h2>Parso Piano</h2>
        <p className="dropzone-lead">
          Drop a <strong>MIDI</strong> (.mid) or <strong>MusicXML</strong> (.musicxml, .mxl) file here
          — or tap to browse.
        </p>
        <p className="dropzone-sub">
          Then click any note to see its name, rhythm, chord, and every sign in the measure —
          explained in plain language, with sound.
        </p>
        {loadStatus === 'error' && errorMessage && <p className="dropzone-error">{errorMessage}</p>}
        <button className="btn btn-primary btn-large">Choose a file</button>
      </div>
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
