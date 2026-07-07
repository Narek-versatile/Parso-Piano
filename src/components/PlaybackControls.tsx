import { useAppStore, type KeyboardSize } from '../app/store';
import { scoreController } from '../app/scoreController';
import { InputSelect } from './InputSelect';

export function PlaybackControls() {
  const playState = useAppStore((s) => s.playState);
  const tempoFactor = useAppStore((s) => s.tempoFactor);
  const zoom = useAppStore((s) => s.zoom);
  const model = useAppStore((s) => s.model);
  const keyboardSize = useAppStore((s) => s.keyboardSize);
  const inputStatus = useAppStore((s) => s.inputStatus);
  const practice = useAppStore((s) => s.practice);
  const set = useAppStore((s) => s.set);

  if (!model) return null;

  const practicing = practice.state === 'waiting';

  return (
    <div className="controls">
      <div className="controls-group">
        {playState === 'playing' ? (
          <button className="btn btn-primary" onClick={() => scoreController.pause()} aria-label="Pause">
            ⏸
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => void scoreController.play()} aria-label="Play">
            ▶
          </button>
        )}
        <button
          className="btn"
          onClick={() => scoreController.stop()}
          disabled={playState === 'stopped'}
          aria-label="Stop"
        >
          ⏹
        </button>
      </div>

      <label className="tempo-control">
        <span className="control-label">Tempo ×{tempoFactor.toFixed(2)}</span>
        <input
          type="range"
          min={0.5}
          max={1.5}
          step={0.05}
          value={tempoFactor}
          onChange={(e) => scoreController.setTempoFactor(parseFloat(e.target.value))}
        />
      </label>

      <div className="controls-group">
        <label className="control-label" htmlFor="kb-size">Keys</label>
        <select
          id="kb-size"
          className="kb-size-select"
          value={keyboardSize}
          onChange={(e) => set({ keyboardSize: e.target.value as KeyboardSize })}
        >
          <option value="s">S</option>
          <option value="m">M</option>
          <option value="l">L</option>
          <option value="focus">Focus 🎹</option>
        </select>
      </div>

      <InputSelect />

      {inputStatus !== 'off' && (
        <button
          className={`btn ${practicing ? 'btn-danger' : 'btn-practice'}`}
          onClick={() => (practicing ? scoreController.stopPractice() : scoreController.startPractice())}
        >
          {practicing ? '■ Stop practice' : '🎯 Practice'}
        </button>
      )}

      <div className="controls-group zoom-group">
        <button className="btn" onClick={() => scoreController.applyZoom(zoom - 0.15)} aria-label="Zoom out">
          −
        </button>
        <span className="control-label">{Math.round(zoom * 100)}%</span>
        <button className="btn" onClick={() => scoreController.applyZoom(zoom + 0.15)} aria-label="Zoom in">
          +
        </button>
      </div>
    </div>
  );
}
