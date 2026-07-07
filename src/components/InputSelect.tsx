import { useState } from 'react';
import { useAppStore } from '../app/store';
import { disableInput, enableMic, enableMidi } from '../lib/input/pianoInput';

/** Enable/disable real-piano input (Web MIDI or experimental microphone). */
export function InputSelect() {
  const inputStatus = useAppStore((s) => s.inputStatus);
  const deviceName = useAppStore((s) => s.inputDeviceName);
  const [error, setError] = useState<string | null>(null);

  const choose = async (value: string) => {
    setError(null);
    try {
      if (value === 'midi') await enableMidi();
      else if (value === 'mic') await enableMic();
      else disableInput();
    } catch (err) {
      disableInput();
      setError(err instanceof Error ? err.message : 'Could not enable piano input.');
    }
  };

  return (
    <div className="input-select" title={deviceName ?? undefined}>
      <span className="input-select-icon">🎹</span>
      <select
        value={inputStatus}
        onChange={(e) => void choose(e.target.value)}
        aria-label="Real piano input"
      >
        <option value="off">Screen only</option>
        <option value="midi">MIDI piano</option>
        <option value="mic">Mic (beta)</option>
      </select>
      {inputStatus !== 'off' && <span className="input-live-dot" aria-label="Input active" />}
      {error && <span className="input-error">{error}</span>}
    </div>
  );
}
