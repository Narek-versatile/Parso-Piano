import { useAppStore } from '../app/store';
import { scoreController } from '../app/scoreController';
import { pretty } from '../explain';

export function ExplanationPanel() {
  const selectedNote = useAppStore((s) => s.selectedNote);
  const analysis = useAppStore((s) => s.analysis);
  const sections = useAppStore((s) => s.sections);
  const expanded = useAppStore((s) => s.sheetExpanded);
  const set = useAppStore((s) => s.set);
  const model = useAppStore((s) => s.model);

  if (!model) return null;

  const headline = selectedNote
    ? selectedNote.isRest
      ? 'Rest'
      : pretty(selectedNote.pitch!.name)
    : null;
  const chordLine = analysis?.chordSymbol
    ? `${pretty(analysis.chordSymbol)}${analysis.roman ? ` · ${analysis.roman}` : ''}`
    : analysis && analysis.soundingNotes.length > 1
      ? `${analysis.soundingNotes.length} notes`
      : null;

  return (
    <aside className={`panel ${expanded ? 'panel-expanded' : ''} ${selectedNote ? 'panel-has-note' : ''}`}>
      <button
        className="panel-handle"
        aria-label={expanded ? 'Collapse details' : 'Expand details'}
        onClick={() => set({ sheetExpanded: !expanded })}
      >
        <span className="panel-grip" />
      </button>

      {!selectedNote ? (
        <div className="panel-empty">
          <p>👆 Tap any note in the score to see what it means — pitch, rhythm, the chord it belongs to, and every sign around it.</p>
        </div>
      ) : (
        <>
          <header className="panel-head">
            <div className="panel-title">
              <span className="panel-note-name">{headline}</span>
              {chordLine && <span className="panel-chord-name">{chordLine}</span>}
            </div>
            <div className="panel-actions">
              {!selectedNote.isRest && (
                <button className="btn btn-small" onClick={() => scoreController.hearSelectedNote()}>
                  ▶ Note
                </button>
              )}
              {analysis && analysis.soundingNotes.length > 1 && (
                <button className="btn btn-small" onClick={() => scoreController.hearSelectedChord()}>
                  ▶ Chord
                </button>
              )}
            </div>
          </header>

          <div className="panel-body">
            {sections.map((section) => (
              <section className="explain-section" key={section.id}>
                <h3>{section.title}</h3>
                <dl>
                  {section.items.map((item, i) => (
                    <div className="explain-item" key={i}>
                      <dt>
                        {item.symbol && <span className="explain-symbol">{item.symbol}</span>}
                        {item.label}
                      </dt>
                      <dd>{item.text}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}
