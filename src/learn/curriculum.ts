import type { Unit } from './types';

/**
 * The note-reading course. Teaching approach: landmark notes + intervallic
 * reading (the methods that actually stick), with classic mnemonics as
 * secondary crutches. Each lesson mixes tip cards with generated drills.
 */
export const UNITS: Unit[] = [
  {
    id: 'treble',
    title: 'Treble Clef',
    icon: '𝄞',
    color: '#7c5cff',
    lessons: [
      {
        id: 'treble-1',
        title: 'Meet the treble clef',
        blurb: 'The G landmark & middle C',
        items: [
          {
            kind: 'tip',
            title: 'The staff is a ladder',
            body: [
              'Music is written on 5 lines and 4 spaces. Higher on the staff = higher sound. Each line or space is one letter of the musical alphabet: A B C D E F G, then it repeats.',
              'You never need to memorize all of them at once — you only need a couple of anchor notes and the ability to step up or down from them.',
            ],
          },
          {
            kind: 'tip',
            title: 'Lifehack #1 — the clef tells you a note for free',
            body: [
              'The treble clef is a fancy letter G. Its curl wraps around the 2nd line from the bottom — so that line is G (G4). This is your first anchor.',
              'Your second anchor is middle C (C4): the short line drawn just below the staff. It sits in the middle of the piano too.',
              'From an anchor, every step to the next line-or-space is the next letter. G4 → space above = A. G4 → space below = F.',
            ],
            staffNotes: { clef: 'treble', notes: ['C4', 'G4'], labels: true },
          },
          { kind: 'note-name', clef: 'treble', pool: ['C4', 'G4'], count: 4 },
          { kind: 'note-name', clef: 'treble', pool: ['C4', 'F4', 'G4', 'A4'], count: 6 },
          { kind: 'tap-key', clef: 'treble', pool: ['C4', 'G4', 'A4'], count: 4 },
        ],
      },
      {
        id: 'treble-2',
        title: 'The lines',
        blurb: 'E · G · B · D · F',
        items: [
          {
            kind: 'tip',
            title: 'Lines from bottom to top: E G B D F',
            body: [
              '"Every Good Boy Does Fine." Mnemonics work as a backup — but say the letters going up AND down (F D B G E) so you don’t have to recite the whole sentence to find one note.',
              'Faster in practice: anchor on the G line (2nd) and the middle line B, then step from there.',
            ],
            staffNotes: { clef: 'treble', notes: ['E4', 'G4', 'B4', 'D5', 'F5'], labels: true },
          },
          { kind: 'note-name', clef: 'treble', pool: ['E4', 'G4', 'B4'], count: 5 },
          { kind: 'note-name', clef: 'treble', pool: ['E4', 'G4', 'B4', 'D5', 'F5'], count: 7 },
          { kind: 'tap-key', clef: 'treble', pool: ['E4', 'G4', 'B4', 'D5'], count: 4 },
        ],
      },
      {
        id: 'treble-3',
        title: 'The spaces',
        blurb: 'They spell FACE',
        items: [
          {
            kind: 'tip',
            title: 'The spaces spell a word: F A C E',
            body: [
              'Bottom space to top space: F, A, C, E — it literally spells FACE. This is the one mnemonic nobody ever forgets.',
              'Notice C5 (3rd space) — one octave above middle C. Anchor pair: middle C hangs below the staff, C5 sits in the 3rd space.',
            ],
            staffNotes: { clef: 'treble', notes: ['F4', 'A4', 'C5', 'E5'], labels: true },
          },
          { kind: 'note-name', clef: 'treble', pool: ['F4', 'A4', 'C5', 'E5'], count: 6 },
          {
            kind: 'note-name',
            clef: 'treble',
            pool: ['E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5'],
            count: 6,
          },
          { kind: 'tap-key', clef: 'treble', pool: ['F4', 'A4', 'C5', 'E5'], count: 4 },
        ],
      },
      {
        id: 'treble-4',
        title: 'Steps, skips & review',
        blurb: 'Read shapes, not letters',
        items: [
          {
            kind: 'tip',
            title: 'Lifehack #2 — read intervals, not note names',
            body: [
              'Good readers don’t name every note. They name the FIRST one, then read the distances: line→next space is a step (play the neighbor key), line→next line is a skip (skip one key).',
              'Your eyes read the contour — up, up, skip down — while your fingers follow. This is the single biggest speed-up in sight reading.',
              'Drill idea that works: pick any note, then play/say your way through a melody using only "step up / skip down" thinking.',
            ],
          },
          {
            kind: 'tip',
            title: 'Ledger lines are just more ladder',
            body: [
              'Short lines above/below the staff extend it. Below the treble staff: middle C (C4). Above: A5 sits on the first ledger line.',
              'Don’t count ledger lines one by one in real time — anchor: 1st ledger above treble = A5, 1st below = C4.',
            ],
            staffNotes: { clef: 'treble', notes: ['C4', 'A5'], labels: true },
          },
          { kind: 'note-name', clef: 'treble', pool: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5'], count: 8 },
          { kind: 'ear', mode: 'higher-lower', pool: [], count: 4 },
          { kind: 'tap-key', clef: 'treble', pool: ['C4', 'E4', 'G4', 'B4', 'D5', 'F5', 'A5'], count: 5 },
        ],
      },
    ],
  },
  {
    id: 'bass',
    title: 'Bass Clef',
    icon: '𝄢',
    color: '#1e88c7',
    lessons: [
      {
        id: 'bass-1',
        title: 'Meet the bass clef',
        blurb: 'The F landmark',
        items: [
          {
            kind: 'tip',
            title: 'The bass clef gives you F for free',
            body: [
              'The bass clef is an old letter F. Its two dots hug the 4th line — so that line is F (F3). That’s your left-hand anchor.',
              'Middle C appears again — this time on a ledger line just ABOVE the bass staff. The two staves meet at middle C.',
            ],
            staffNotes: { clef: 'bass', notes: ['F3', 'C4'], labels: true },
          },
          { kind: 'note-name', clef: 'bass', pool: ['F3', 'C4'], count: 4 },
          { kind: 'note-name', clef: 'bass', pool: ['E3', 'F3', 'G3', 'C4'], count: 6 },
          { kind: 'tap-key', clef: 'bass', pool: ['F3', 'C4', 'G3'], count: 4 },
        ],
      },
      {
        id: 'bass-2',
        title: 'The lines',
        blurb: 'G · B · D · F · A',
        items: [
          {
            kind: 'tip',
            title: 'Lines from bottom to top: G B D F A',
            body: [
              '"Good Boys Do Fine Always." Again — anchor first (F on the 4th line, D in the middle), mnemonic as backup.',
              'Sneaky pattern: the bass lines are the treble SPACES shifted — don’t mix the two clefs up; anchor notes prevent exactly this.',
            ],
            staffNotes: { clef: 'bass', notes: ['G2', 'B2', 'D3', 'F3', 'A3'], labels: true },
          },
          { kind: 'note-name', clef: 'bass', pool: ['G2', 'B2', 'D3'], count: 5 },
          { kind: 'note-name', clef: 'bass', pool: ['G2', 'B2', 'D3', 'F3', 'A3'], count: 7 },
          { kind: 'tap-key', clef: 'bass', pool: ['G2', 'B2', 'D3', 'F3'], count: 4 },
        ],
      },
      {
        id: 'bass-3',
        title: 'The spaces',
        blurb: 'All Cows Eat Grass',
        items: [
          {
            kind: 'tip',
            title: 'Spaces from bottom to top: A C E G',
            body: [
              '"All Cows Eat Grass" — or notice it’s just an A-minor-seventh-worth of letters: A C E G.',
              'C3 (2nd space) is exactly one octave below middle C. Anchor triple: C3 → C4 (between staves) → C5 (treble 3rd space).',
            ],
            staffNotes: { clef: 'bass', notes: ['A2', 'C3', 'E3', 'G3'], labels: true },
          },
          { kind: 'note-name', clef: 'bass', pool: ['A2', 'C3', 'E3', 'G3'], count: 6 },
          { kind: 'note-name', clef: 'bass', pool: ['G2', 'A2', 'B2', 'C3', 'D3', 'E3', 'F3', 'G3', 'A3'], count: 6 },
          { kind: 'tap-key', clef: 'bass', pool: ['A2', 'C3', 'E3', 'G3'], count: 4 },
        ],
      },
      {
        id: 'bass-4',
        title: 'The grand staff & review',
        blurb: 'One system, mirrored at C',
        items: [
          {
            kind: 'tip',
            title: 'Lifehack #3 — the grand staff is a mirror',
            body: [
              'Think of both staves as ONE big ladder with middle C in the center. The treble G anchor (2nd line up from C) mirrors the bass F anchor (2nd line down from C).',
              'This symmetry means every treble skill you built transfers: read distance from the nearest anchor, in either direction.',
            ],
          },
          { kind: 'note-name', clef: 'bass', pool: ['E2', 'G2', 'B2', 'D3', 'F3', 'A3', 'C4', 'C3', 'E3', 'G3'], count: 8 },
          { kind: 'ear', mode: 'identify', pool: ['F3', 'C4', 'G4'], count: 3 },
          { kind: 'tap-key', clef: 'bass', pool: ['E2', 'G2', 'C3', 'F3', 'A3', 'C4'], count: 5 },
        ],
      },
    ],
  },
  {
    id: 'accidentals',
    title: 'Accidentals & Keys',
    icon: '♯',
    color: '#e8a020',
    lessons: [
      {
        id: 'acc-1',
        title: 'Sharps & flats',
        blurb: 'The black keys',
        items: [
          {
            kind: 'tip',
            title: 'Half steps and the black keys',
            body: [
              'A ♯ (sharp) raises a note by a half step — the very next key to the right. A ♭ (flat) lowers it — next key to the left. Usually that lands on a black key.',
              'Every black key has two names: F♯ is the same key as G♭. Which name is used depends on the key of the piece (that’s spelling, and it matters for reading, not for your finger).',
            ],
            keyboardHighlight: [61, 63, 66, 68, 70],
          },
          { kind: 'note-name', clef: 'treble', pool: ['F#4', 'C#5', 'Bb4', 'Eb4', 'G#4'], count: 6, withAccidentals: true },
          { kind: 'tap-key', clef: 'treble', pool: ['F#4', 'Bb4', 'C#5', 'Eb4'], count: 5 },
        ],
      },
      {
        id: 'acc-2',
        title: 'Naturals & the measure rule',
        blurb: 'How long does a ♯ last?',
        items: [
          {
            kind: 'tip',
            title: 'An accidental lasts until the barline',
            body: [
              'When you see a ♯ or ♭ in front of a note, it applies to every repeat of that exact note until the end of the measure. The barline cancels it.',
              'A ♮ (natural) cancels a sharp or flat early — it always means "play the plain white key".',
            ],
          },
          {
            kind: 'quiz',
            questions: [
              { prompt: 'A ♯ appears on F in beat 1. What is F on beat 3 of the same measure?', choices: ['F♯ — accidentals last the whole measure', 'F — accidentals affect one note only', 'F♭'], answer: 0 },
              { prompt: 'What does a ♮ (natural) do?', choices: ['Cancels any sharp or flat — play the white key', 'Raises the note a half step', 'Marks the note as important'], answer: 0 },
              { prompt: 'The measure ends. Does last measure’s B♭ carry into the next measure?', choices: ['No — the barline cancels accidentals', 'Yes — until a natural appears', 'Only in 4/4 time'], answer: 0 },
            ],
          },
          { kind: 'note-name', clef: 'bass', pool: ['F#3', 'Bb2', 'C#3', 'Eb3'], count: 5, withAccidentals: true },
        ],
      },
      {
        id: 'acc-3',
        title: 'Key signatures: sharps',
        blurb: 'The last-sharp trick',
        items: [
          {
            kind: 'tip',
            title: 'Lifehack #4 — the last sharp names the key',
            body: [
              'Sharps always appear in the same order: F C G D A E B ("Father Charles Goes Down And Ends Battle").',
              'The trick: take the LAST sharp in the signature and go up one half step — that’s your major key. Last sharp F♯? F♯+1 = G major. Last sharp C♯? = D major.',
              'A key signature means those notes are sharp for the whole piece — every F, every octave, unless a natural says otherwise.',
            ],
          },
          {
            kind: 'quiz',
            questions: [
              { prompt: 'The signature has one sharp (F♯). What major key is it?', choices: ['G major — F♯ + half step', 'F major', 'C major'], answer: 0 },
              { prompt: 'Signature: F♯ C♯ G♯. The key is…', choices: ['A major — G♯ + half step', 'G major', 'E major'], answer: 0 },
              { prompt: 'What is the order of sharps?', choices: ['F C G D A E B', 'B E A D G C F', 'C D E F G A B'], answer: 0 },
              { prompt: 'The key signature has F♯. You see a plain F on the page. What do you play?', choices: ['F♯ — the signature applies everywhere', 'F natural', 'Depends on the measure'], answer: 0 },
            ],
          },
        ],
      },
      {
        id: 'acc-4',
        title: 'Key signatures: flats',
        blurb: 'The second-to-last flat',
        items: [
          {
            kind: 'tip',
            title: 'Lifehack #5 — the second-to-last flat IS the key',
            body: [
              'Flats appear in the reverse order of sharps: B E A D G C F — "BEAD, then Greatest Common Factor".',
              'The trick: the SECOND-TO-LAST flat names the major key. Signature B♭ E♭? Second-to-last is B♭ → B♭ major. B♭ E♭ A♭? → E♭ major.',
              'Exception to memorize: ONE flat (just B♭) is F major — there’s no second-to-last to look at.',
            ],
          },
          {
            kind: 'quiz',
            questions: [
              { prompt: 'Signature: B♭ E♭. What major key?', choices: ['B♭ major — the second-to-last flat', 'E♭ major', 'F major'], answer: 0 },
              { prompt: 'Signature: one flat (B♭). What major key?', choices: ['F major — the one exception to memorize', 'B♭ major', 'C major'], answer: 0 },
              { prompt: 'What is the order of flats?', choices: ['B E A D G C F', 'F C G D A E B', 'A B C D E F G'], answer: 0 },
              { prompt: 'Signature: B♭ E♭ A♭ D♭. What major key?', choices: ['A♭ major', 'D♭ major', 'E♭ major'], answer: 0 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'rhythm',
    title: 'Rhythm Values',
    icon: '♩',
    color: '#2fa36b',
    lessons: [
      {
        id: 'rhythm-1',
        title: 'The big four',
        blurb: 'Whole to eighth',
        items: [
          {
            kind: 'tip',
            title: 'Each value is half the previous one',
            body: [
              'Whole note 𝅝 = 4 beats. Half note 𝅗𝅥 = 2. Quarter ♩ = 1. Eighth ♪ = ½. Each is exactly half of the one before — rhythm is just repeated halving.',
              'Hollow = long: the whole and half notes have empty heads. Flags/beams = short: each flag halves the note again.',
            ],
            glyphLine: '𝅝 = 4    𝅗𝅥 = 2    ♩ = 1    ♪ = ½',
          },
          {
            kind: 'quiz',
            questions: [
              { prompt: 'How many quarter notes fit in one whole note?', choices: ['4', '2', '8'], answer: 0 },
              { prompt: 'How many beats is a half note?', choices: ['2', '4', '1'], answer: 0 },
              { prompt: 'Two eighth notes together last as long as…', choices: ['one quarter note', 'one half note', 'one whole note'], answer: 0 },
              { prompt: 'Which note has a hollow head and a stem?', choices: ['Half note', 'Quarter note', 'Whole note'], answer: 0 },
            ],
          },
        ],
      },
      {
        id: 'rhythm-2',
        title: 'Counting that works',
        blurb: '1 & 2 & — out loud',
        items: [
          {
            kind: 'tip',
            title: 'Lifehack #6 — count out loud and subdivide',
            body: [
              'Count "1 2 3 4" for quarters and "1-and-2-and" when eighths appear. Counting OUT LOUD (or whispering) forces your hands to follow the pulse instead of the other way around — this is the fix for rushed rhythms.',
              'Always count at the smallest value in the passage. If there are eighths anywhere, count "and"s everywhere.',
            ],
            glyphLine: '♩ ♩ ♫ ♩  →  “1,  2,  3-and,  4”',
          },
          {
            kind: 'quiz',
            questions: [
              { prompt: 'How do you count: ♩ ♫ ♩ ♩ in 4/4?', choices: ['1, 2-and, 3, 4', '1, 2, 3, 4-and', '1-and, 2, 3, 4'], answer: 0, glyphLine: '♩ ♫ ♩ ♩' },
              { prompt: 'Where does the second eighth of beat 3 fall?', choices: ['On “3-and”', 'On “4”', 'On “3”'], answer: 0 },
              { prompt: 'The most reliable way to fix rushing is…', choices: ['Count out loud while playing', 'Play faster until it evens out', 'Ignore the metronome'], answer: 0 },
            ],
          },
        ],
      },
      {
        id: 'rhythm-3',
        title: 'Dots & ties',
        blurb: 'Half again as long',
        items: [
          {
            kind: 'tip',
            title: 'The dot adds half; the tie adds exactly',
            body: [
              'A dot stretches a note by HALF its value: dotted half = 2+1 = 3 beats, dotted quarter = 1+½ = 1½ beats.',
              'A tie joins two notes of the SAME pitch into one sound: play once, hold for the sum. Ties can cross barlines — dots cannot.',
            ],
            glyphLine: '𝅗𝅥. = 3    ♩. = 1½    ♩‿♩ = 2',
          },
          {
            kind: 'quiz',
            questions: [
              { prompt: 'A dotted quarter note lasts…', choices: ['1½ beats', '1¼ beats', '2 beats'], answer: 0 },
              { prompt: 'A dotted half note lasts…', choices: ['3 beats', '2½ beats', '4 beats'], answer: 0 },
              { prompt: 'A quarter tied to a half lasts…', choices: ['3 beats', '2 beats', '1½ beats'], answer: 0 },
              { prompt: 'What can a tie do that a dot cannot?', choices: ['Extend a note across a barline', 'Make a note shorter', 'Change the pitch'], answer: 0 },
            ],
          },
        ],
      },
      {
        id: 'rhythm-4',
        title: 'Time signatures',
        blurb: '4/4 · 3/4 · 6/8',
        items: [
          {
            kind: 'tip',
            title: 'Top = how many, bottom = of what',
            body: [
              'The top number counts beats per measure; the bottom names the beat: 4 = quarter note, 8 = eighth note. 3/4 = three quarter-note beats (a waltz).',
              '6/8 is the special one: six eighths, but FELT as two big beats of three ("ONE-two-three FOUR-five-six") — that lilt is compound meter.',
            ],
            glyphLine: '4/4: 1 2 3 4    3/4: 1 2 3    6/8: ONE-2-3 FOUR-5-6',
          },
          {
            kind: 'quiz',
            questions: [
              { prompt: 'In 3/4, how many quarter-note beats per measure?', choices: ['3', '4', '6'], answer: 0 },
              { prompt: 'In 6/8, the music is usually FELT in…', choices: ['2 big beats of three eighths', '6 equal strong beats', '3 half-note beats'], answer: 0 },
              { prompt: 'The bottom number 8 means the beat unit is…', choices: ['an eighth note', 'an octave', 'eight measures'], answer: 0 },
              { prompt: 'The "C" symbol at the start of a staff means…', choices: ['Common time — the same as 4/4', 'The key of C', 'Play with the right hand'], answer: 0 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'timing',
    title: 'Timing Studio',
    icon: '⏱',
    color: '#e8590c',
    lessons: [
      {
        id: 'timing-1',
        title: 'Steady quarters',
        blurb: 'Lock onto the click',
        items: [
          {
            kind: 'tip',
            title: 'How the timing drills work',
            body: [
              'You’ll hear 4 count-in clicks, then tap the highlighted key exactly on the rhythm shown. Land within the green window for "perfect".',
              'Lifehack #7 — don’t watch your finger. Listen to the click and let the tap happen; timing lives in the ears, not the eyes.',
            ],
          },
          {
            kind: 'timing',
            bpm: 80,
            count: 3,
            patterns: [
              { taps: [0, 1, 2, 3], glyphs: '♩ ♩ ♩ ♩', label: 'Four steady quarters' },
              { taps: [0, 1, 2, 3], glyphs: '♩ ♩ ♩ ♩', label: 'Again — settle into the pulse' },
              { taps: [0, 2], glyphs: '𝅗𝅥 𝅗𝅥', label: 'Two half notes — tap on 1 and 3' },
            ],
          },
        ],
      },
      {
        id: 'timing-2',
        title: 'Longs & shorts',
        blurb: 'Halves, wholes, quarters',
        items: [
          {
            kind: 'timing',
            bpm: 80,
            count: 4,
            patterns: [
              { taps: [0, 2, 3], glyphs: '𝅗𝅥 ♩ ♩', label: 'Half then two quarters' },
              { taps: [0, 1, 2], glyphs: '♩ ♩ 𝅗𝅥', label: 'Two quarters then hold' },
              { taps: [0], glyphs: '𝅝', label: 'One whole note — just the downbeat' },
              { taps: [0, 3], glyphs: '𝅗𝅥. ♩', label: 'Dotted half then quarter' },
            ],
          },
        ],
      },
      {
        id: 'timing-3',
        title: 'Eighth grooves',
        blurb: 'Find the “and”',
        items: [
          {
            kind: 'tip',
            title: 'Split the beat in your head',
            body: [
              'Before tapping eighths, say "1-and-2-and-3-and-4-and" along with the click. The taps then fall on syllables you’re already saying — much easier than aiming between clicks.',
            ],
          },
          {
            kind: 'timing',
            bpm: 70,
            count: 3,
            patterns: [
              { taps: [0, 0.5, 1, 1.5, 2, 3], glyphs: '♫ ♫ ♩ ♩', label: 'Eighths on beats 1 & 2' },
              { taps: [0, 1, 1.5, 2, 3], glyphs: '♩ ♫ ♩ ♩', label: 'Eighths on beat 2' },
              { taps: [0, 1, 2, 2.5, 3, 3.5], glyphs: '♩ ♩ ♫ ♫', label: 'Eighths on beats 3 & 4' },
            ],
          },
        ],
      },
      {
        id: 'timing-4',
        title: 'Dots & offbeats',
        blurb: 'The tricky ones',
        items: [
          {
            kind: 'timing',
            bpm: 70,
            count: 3,
            patterns: [
              { taps: [0, 1.5, 2, 3], glyphs: '♩. ♪ ♩ ♩', label: 'Dotted quarter + eighth' },
              { taps: [1, 3], glyphs: '𝄽 ♩ 𝄽 ♩', label: 'Offbeats — rest on 1 and 3' },
              { taps: [0, 1.5, 3], glyphs: '♩. ♪‿𝅗𝅥', label: 'Dotted rhythm into a hold' },
            ],
          },
          {
            kind: 'tip',
            title: 'Lifehack #8 — five minutes beats one hour',
            body: [
              'Reading notes is a recognition skill, like vocabulary. Five minutes of drills every day rewires recognition far faster than a long weekly session — spacing is the trick memory researchers actually agree on.',
              'Come back tomorrow: your streak is counting on you. 🔥',
            ],
          },
        ],
      },
    ],
  },
];

export function findLesson(lessonId: string): { unit: Unit; lesson: Unit['lessons'][number]; unitIndex: number; lessonIndex: number } | undefined {
  for (let u = 0; u < UNITS.length; u++) {
    const l = UNITS[u].lessons.findIndex((x) => x.id === lessonId);
    if (l >= 0) return { unit: UNITS[u], lesson: UNITS[u].lessons[l], unitIndex: u, lessonIndex: l };
  }
  return undefined;
}
