import { StaffGlyph } from './StaffGlyph';

/** One-page reference for reading notes — the course distilled. */
export function CheatSheet() {
  return (
    <div className="cheatsheet">
      <header className="cs-header">
        <h1>📜 Note-Reading Cheatsheet</h1>
        <p>Everything from the course on one page. Anchor first, mnemonic second, intervals always.</p>
      </header>

      <section className="cs-section">
        <h2>1 · The anchors (learn these cold)</h2>
        <div className="cs-cols">
          <div className="cs-card">
            <h3>Treble 𝄞</h3>
            <StaffGlyph clef="treble" notes={['C4', 'G4', 'C5']} labels height={130} />
            <ul>
              <li><strong>G4</strong> — the clef’s curl wraps this line</li>
              <li><strong>C4</strong> (middle C) — ledger line below</li>
              <li><strong>C5</strong> — 3rd space, octave above middle C</li>
            </ul>
          </div>
          <div className="cs-card">
            <h3>Bass 𝄢</h3>
            <StaffGlyph clef="bass" notes={['C3', 'F3', 'C4']} labels height={130} />
            <ul>
              <li><strong>F3</strong> — between the clef’s two dots</li>
              <li><strong>C4</strong> (middle C) — ledger line above</li>
              <li><strong>C3</strong> — 2nd space, octave below middle C</li>
            </ul>
          </div>
        </div>
        <p className="cs-hack">💡 From any anchor: next line-or-space = next letter. Never count from the bottom line.</p>
      </section>

      <section className="cs-section">
        <h2>2 · Full maps</h2>
        <div className="cs-cols">
          <div className="cs-card">
            <h3>Treble lines & spaces</h3>
            <StaffGlyph clef="treble" notes={['E4', 'G4', 'B4', 'D5', 'F5']} labels height={120} />
            <p className="cs-mnemonic">Lines: <strong>E</strong>very <strong>G</strong>ood <strong>B</strong>oy <strong>D</strong>oes <strong>F</strong>ine</p>
            <StaffGlyph clef="treble" notes={['F4', 'A4', 'C5', 'E5']} labels height={120} />
            <p className="cs-mnemonic">Spaces spell <strong>F A C E</strong></p>
          </div>
          <div className="cs-card">
            <h3>Bass lines & spaces</h3>
            <StaffGlyph clef="bass" notes={['G2', 'B2', 'D3', 'F3', 'A3']} labels height={120} />
            <p className="cs-mnemonic">Lines: <strong>G</strong>ood <strong>B</strong>oys <strong>D</strong>o <strong>F</strong>ine <strong>A</strong>lways</p>
            <StaffGlyph clef="bass" notes={['A2', 'C3', 'E3', 'G3']} labels height={120} />
            <p className="cs-mnemonic">Spaces: <strong>A</strong>ll <strong>C</strong>ows <strong>E</strong>at <strong>G</strong>rass</p>
          </div>
        </div>
      </section>

      <section className="cs-section">
        <h2>3 · Read intervals, not letters</h2>
        <table className="cs-table">
          <tbody>
            <tr><td>Line → next space (or space → next line)</td><td><strong>Step</strong> — play the neighbor key</td></tr>
            <tr><td>Line → next line (or space → space)</td><td><strong>Skip (3rd)</strong> — skip one key</td></tr>
            <tr><td>Same line/space repeated</td><td><strong>Same note</strong> — don’t re-read it</td></tr>
          </tbody>
        </table>
        <p className="cs-hack">💡 Name the first note, then follow the contour: up/down, step/skip. This is how fluent readers actually read.</p>
      </section>

      <section className="cs-section">
        <h2>4 · Accidentals</h2>
        <table className="cs-table">
          <tbody>
            <tr><td>♯ sharp</td><td>next key right (usually black)</td></tr>
            <tr><td>♭ flat</td><td>next key left (usually black)</td></tr>
            <tr><td>♮ natural</td><td>cancel — play the white key</td></tr>
            <tr><td>Duration</td><td>an accidental lasts <strong>until the barline</strong>; a key signature lasts the whole piece</td></tr>
          </tbody>
        </table>
      </section>

      <section className="cs-section">
        <h2>5 · Key signature tricks</h2>
        <div className="cs-cols">
          <div className="cs-card">
            <h3>Sharps — F C G D A E B</h3>
            <p className="cs-mnemonic">Father Charles Goes Down And Ends Battle</p>
            <p className="cs-hack">💡 <strong>Last sharp + half step = the major key.</strong><br />F♯ → G major · F♯C♯ → D major · F♯C♯G♯ → A major</p>
          </div>
          <div className="cs-card">
            <h3>Flats — B E A D G C F</h3>
            <p className="cs-mnemonic">BEAD + Greatest Common Factor</p>
            <p className="cs-hack">💡 <strong>The second-to-last flat IS the major key.</strong><br />B♭E♭ → B♭ major · B♭E♭A♭ → E♭ major<br />Exception: one flat = <strong>F major</strong></p>
          </div>
        </div>
        <table className="cs-table cs-keys">
          <thead><tr><th>Signature</th><th>Major</th><th>Minor</th></tr></thead>
          <tbody>
            <tr><td>—</td><td>C</td><td>Am</td></tr>
            <tr><td>1♯</td><td>G</td><td>Em</td></tr>
            <tr><td>2♯</td><td>D</td><td>Bm</td></tr>
            <tr><td>3♯</td><td>A</td><td>F♯m</td></tr>
            <tr><td>4♯</td><td>E</td><td>C♯m</td></tr>
            <tr><td>1♭</td><td>F</td><td>Dm</td></tr>
            <tr><td>2♭</td><td>B♭</td><td>Gm</td></tr>
            <tr><td>3♭</td><td>E♭</td><td>Cm</td></tr>
            <tr><td>4♭</td><td>A♭</td><td>Fm</td></tr>
          </tbody>
        </table>
      </section>

      <section className="cs-section">
        <h2>6 · Rhythm at a glance</h2>
        <table className="cs-table">
          <thead><tr><th>Note</th><th>Beats (in 4/4)</th><th>Count</th></tr></thead>
          <tbody>
            <tr><td>𝅝 whole</td><td>4</td><td>1 – 2 – 3 – 4</td></tr>
            <tr><td>𝅗𝅥 half</td><td>2</td><td>1 – 2</td></tr>
            <tr><td>♩ quarter</td><td>1</td><td>1</td></tr>
            <tr><td>♪ eighth</td><td>½</td><td>“and”</td></tr>
            <tr><td>𝅘𝅥𝅯 sixteenth</td><td>¼</td><td>“e / a”</td></tr>
            <tr><td>♩. dotted</td><td>+ half its value</td><td>♩. = 1½</td></tr>
            <tr><td>♩‿♩ tie</td><td>sum of both</td><td>one attack</td></tr>
          </tbody>
        </table>
        <p className="cs-hack">💡 Count out loud, subdivide at the smallest value present, and let the metronome be the boss.</p>
      </section>

      <section className="cs-section">
        <h2>7 · The habits that actually work</h2>
        <ol className="cs-list">
          <li><strong>Anchors over alphabets</strong> — G4, F3 and the three Cs beat reciting mnemonics from the bottom line.</li>
          <li><strong>Intervals over names</strong> — read distances and contour; name only the first note of a phrase.</li>
          <li><strong>Sound + sight together</strong> — always hear the note you read (that’s why the drills play audio).</li>
          <li><strong>Count out loud</strong> — the only reliable cure for rushing.</li>
          <li><strong>Five minutes daily</strong> — spaced practice rewires recognition; cramming doesn’t. Keep the streak. 🔥</li>
        </ol>
      </section>
    </div>
  );
}
