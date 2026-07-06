# 🎹 Parso Piano — Interactive Note Visualizer

Load sheet music (**MIDI** or **MusicXML**), see it engraved, and **click any note** to get a
full explanation of everything happening at that moment — with sound.

## Features

- **File input**: drag & drop or pick `.mid` / `.midi`, `.musicxml` / `.xml`, and compressed `.mxl` files. All parsing happens in the browser — nothing is uploaded anywhere.
- **Engraved score** (via [OpenSheetMusicDisplay](https://opensheetmusicdisplay.org/)) with clickable notes and zoom.
- **Click a note / chord** and the explanation panel shows:
  - *The note*: pitch & octave, accidental meaning, rhythm value & beats, real duration in seconds at the current tempo, staff & clef (which hand), frequency in Hz, MIDI number.
  - *Harmony at this moment*: every note sounding across both staves, chord name & inversion, intervals from the bass, and the chord's roman numeral & function in the current key (tonic, dominant, …).
  - *Signs on the note*: staccato, accents, tenuto, ties, slurs, dots, fermata, arpeggio, trills, mordents, turns, grace notes, attached dynamics — each explained.
  - *The measure*: beat position, time signature meaning, key signature (which notes are altered and the key name), clef, tempo (BPM + Italian term), active dynamic level, repeat signs and barlines.
- **Beginner / Advanced toggle** — plain-language teaching prose vs. terse theory.
- **On-screen piano keyboard** highlighting the selected note, its chord, and everything sounding during playback. Keys are tappable.
- **Playback** with a follow-along cursor, live score & keyboard highlighting, pause/resume and a live tempo slider — plus **click-to-hear** for any selected note or chord.
- **Mobile-first**: bottom-sheet explanations, scrollable keyboard strip, responsive score.

Try it with the files in [`examples/`](examples/).

## MIDI conversion notes

MIDI files carry no notation (no articulations, dynamics, spelling, or hand assignment), so
Parso converts them conservatively and tells you what it assumed:

- notes are quantized to a 16th-note grid (no tuplets),
- two tracks → treble/bass staves; single tracks are split around middle C,
- the key signature is taken from the file or estimated from the notes,
- each staff is written as a single voice (overlapping durations are clipped).

For the richest explanations, export **MusicXML** from MuseScore / Finale / Sibelius.

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # vitest unit tests (MIDI pipeline, MusicXML extraction, theory, explanations)
npm run build      # production build to dist/
```

Deployment: pushing to `main` runs the GitHub Actions workflow in
`.github/workflows/deploy.yml`, which tests, builds and publishes to GitHub Pages.

## Architecture

```
file (.mid/.mxl/.musicxml)
  → src/lib/files      (detect type, unzip .mxl)
  → src/lib/midi       (MIDI → quantize → split hands → spell → measures → MusicXML)
  → OpenSheetMusicDisplay renders the MusicXML (SVG)
  → src/lib/score      (normalized ScoreModel from the XML + OSMD note mapping + playback timeline)
  → src/lib/theory     (chords, intervals, roman numerals — via tonal)
  → src/explain        (beginner/advanced prose, all strings centralized for future i18n)
  → src/lib/audio      (Tone.js sampler + transport playback)
  → src/components     (React UI, zustand state)
```

## Credits

- Piano samples: [Salamander Grand Piano](https://archive.org/details/SalamanderGrandPianoV3)
  by Alexander Holm (CC-BY), via [tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments).
- Music engraving: [OpenSheetMusicDisplay](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay).
- Music theory: [tonal](https://github.com/tonaljs/tonal). MIDI parsing: [@tonejs/midi](https://github.com/Tonejs/Midi).
