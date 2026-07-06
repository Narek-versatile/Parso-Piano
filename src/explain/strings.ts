/**
 * All user-facing explanation prose lives here (single module for future i18n).
 * Each entry provides a beginner and an advanced variant.
 */

export type Audience = 'beginner' | 'advanced';

export interface SignText {
  symbol?: string;
  beginner: string;
  advanced: string;
}

export const ARTICULATIONS: Record<string, SignText> = {
  staccato: {
    symbol: '·',
    beginner: 'The small dot above or below the notehead means staccato: play the note short and bouncy — release the key quickly, about half the written length, leaving a little silence after it.',
    advanced: 'Staccato — detached; sound roughly half the notated value.',
  },
  staccatissimo: {
    symbol: '▾',
    beginner: 'A tiny wedge means staccatissimo: even shorter than staccato — just a quick touch of the key.',
    advanced: 'Staccatissimo — extremely short, about a quarter of the notated value.',
  },
  accent: {
    symbol: '>',
    beginner: 'The small arrowhead (>) is an accent: strike this note noticeably louder than its neighbors, then let it ring normally.',
    advanced: 'Accent — dynamic emphasis on the attack.',
  },
  'strong-accent': {
    symbol: '^',
    beginner: 'The upward wedge (^) is a marcato: the strongest kind of accent — play this note markedly louder and slightly detached.',
    advanced: 'Marcato — heavy accent, usually detached.',
  },
  tenuto: {
    symbol: '–',
    beginner: 'The short horizontal line is a tenuto: hold the note for its full written length, with a gentle lean on it — the opposite of staccato.',
    advanced: 'Tenuto — sustain full value with slight agogic/dynamic stress.',
  },
  'detached-legato': {
    symbol: '–·',
    beginner: 'A line plus a dot (portato): halfway between smooth and detached — slightly separated but still gentle.',
    advanced: 'Portato — semi-detached articulation.',
  },
  spiccato: {
    beginner: 'Spiccato: a very light, bouncing articulation (borrowed from string technique) — play crisp and short.',
    advanced: 'Spiccato — light, bounced articulation.',
  },
  'breath-mark': {
    symbol: '’',
    beginner: 'The comma above the staff is a breath mark: take a tiny pause here, like a singer catching a breath, before continuing.',
    advanced: 'Breath mark — brief luftpause; do not disturb the underlying pulse more than necessary.',
  },
  caesura: {
    symbol: '//',
    beginner: 'The two slashes are a caesura ("railroad tracks"): stop the sound completely for a moment, then continue.',
    advanced: 'Caesura — complete interruption of sound; duration at performer’s discretion.',
  },
};

export const ORNAMENTS: Record<string, SignText> = {
  trill: {
    symbol: 'tr',
    beginner: 'The "tr" sign is a trill: rapidly alternate between this note and the note just above it for the note’s duration, like a musical shiver.',
    advanced: 'Trill — rapid alternation with the upper auxiliary; in Classical style usually starting on the upper note.',
  },
  mordent: {
    symbol: '𝆚',
    beginner: 'A mordent: play the written note, quickly dip to the note above and come right back — a three-note flick.',
    advanced: 'Mordent — single rapid alternation with the upper neighbor.',
  },
  'inverted mordent': {
    symbol: '𝆛',
    beginner: 'An inverted (lower) mordent: play the written note, quickly dip to the note below and come right back.',
    advanced: 'Lower mordent — single rapid alternation with the lower neighbor.',
  },
  turn: {
    symbol: '𝆗',
    beginner: 'A turn: circle around the written note — play the note above, the note itself, the note below, then the note again, smoothly.',
    advanced: 'Turn (gruppetto) — upper neighbor, principal, lower neighbor, principal.',
  },
  'inverted turn': {
    beginner: 'An inverted turn: like a turn but starting from below — note below, the note, note above, the note.',
    advanced: 'Inverted turn — lower neighbor first.',
  },
  tremolo: {
    beginner: 'Tremolo: repeat the note (or alternate between notes) very fast for the whole duration.',
    advanced: 'Tremolo — rapid reiteration; slashes indicate subdivision speed.',
  },
  'grace note': {
    beginner: 'A grace note (the tiny note): squeeze it in quickly just before the main note — it borrows almost no time.',
    advanced: 'Grace note — acciaccatura/appoggiatura; takes its time from the adjacent principal note.',
  },
  schleifer: {
    beginner: 'A schleifer (slide): slide into the note quickly from a couple of steps below.',
    advanced: 'Schleifer — two-note ascending slide into the principal note.',
  },
};

export const DYNAMICS: Record<string, SignText> = {
  ppp: { symbol: 'ppp', beginner: 'pianississimo — as soft as you can play.', advanced: 'pianississimo.' },
  pp: { symbol: 'pp', beginner: 'pianissimo — very soft, a whisper.', advanced: 'pianissimo.' },
  p: { symbol: 'p', beginner: 'piano — soft and gentle.', advanced: 'piano.' },
  mp: { symbol: 'mp', beginner: 'mezzo-piano — moderately soft, a calm speaking voice.', advanced: 'mezzo-piano.' },
  mf: { symbol: 'mf', beginner: 'mezzo-forte — moderately loud; the "default" volume.', advanced: 'mezzo-forte.' },
  f: { symbol: 'f', beginner: 'forte — loud and confident.', advanced: 'forte.' },
  ff: { symbol: 'ff', beginner: 'fortissimo — very loud.', advanced: 'fortissimo.' },
  fff: { symbol: 'fff', beginner: 'fortississimo — as loud as you can play.', advanced: 'fortississimo.' },
  sf: { symbol: 'sf', beginner: 'sforzando — a sudden strong accent on this one note.', advanced: 'sforzando — sudden accent.' },
  sfz: { symbol: 'sfz', beginner: 'sforzando — a sudden strong accent on this one note.', advanced: 'sforzando — sudden accent.' },
  fp: { symbol: 'fp', beginner: 'fortepiano — hit the note loud, then instantly drop to soft.', advanced: 'fortepiano — loud attack, immediate piano.' },
  crescendo: { symbol: '<', beginner: 'crescendo (the opening "hairpin") — get gradually louder.', advanced: 'crescendo.' },
  diminuendo: { symbol: '>', beginner: 'diminuendo (the closing "hairpin") — get gradually softer.', advanced: 'diminuendo.' },
};

export const FUNCTION_DESCRIPTIONS: Record<string, SignText> = {
  tonic: {
    beginner: 'the "home" chord of the key — it feels stable and at rest, like arriving where the music belongs.',
    advanced: 'tonic function — point of maximal stability.',
  },
  supertonic: {
    beginner: 'built on the 2nd step of the scale — it often leads toward the dominant, preparing tension.',
    advanced: 'supertonic — predominant function, typically resolving to V.',
  },
  mediant: {
    beginner: 'built on the 3rd step — a gentle, in-between color that shares notes with both home and dominant chords.',
    advanced: 'mediant — shares two tones with both tonic and dominant.',
  },
  subdominant: {
    beginner: 'built on the 4th step — it moves the music away from home, often on the way to the dominant.',
    advanced: 'subdominant — predominant function.',
  },
  dominant: {
    beginner: 'built on the 5th step — the chord of maximum tension; your ear expects it to resolve back to the home (tonic) chord.',
    advanced: 'dominant function — demands resolution to tonic.',
  },
  submediant: {
    beginner: 'built on the 6th step — a softer stand-in for the home chord, often used in deceptive resolutions.',
    advanced: 'submediant — tonic substitute; target of the deceptive cadence.',
  },
  'leading tone': {
    beginner: 'built on the 7th step — extremely unstable, it pulls strongly upward into the home chord.',
    advanced: 'leading-tone chord — dominant function, resolves stepwise to tonic.',
  },
};

export const CLEF_TEXT: Record<string, SignText> = {
  treble: {
    symbol: '𝄞',
    beginner: 'the treble (G) clef — the curl wraps around the G line. On piano this staff is usually played by the right hand.',
    advanced: 'treble clef (G4 on line 2).',
  },
  bass: {
    symbol: '𝄢',
    beginner: 'the bass (F) clef — the two dots surround the F line. On piano this staff is usually played by the left hand.',
    advanced: 'bass clef (F3 on line 4).',
  },
  alto: { symbol: '𝄡', beginner: 'the alto (C) clef — middle C sits on the middle line.', advanced: 'alto clef (C4 on line 3).' },
  tenor: { symbol: '𝄡', beginner: 'the tenor (C) clef — middle C sits on the fourth line.', advanced: 'tenor clef (C4 on line 4).' },
  percussion: { beginner: 'a percussion clef — pitches are not fixed.', advanced: 'percussion clef.' },
  unknown: { beginner: 'an unrecognized clef.', advanced: 'unknown clef.' },
};

/** Italian tempo terms by BPM range. */
export const TEMPO_TERMS: { max: number; term: string; meaning: string }[] = [
  { max: 40, term: 'Grave', meaning: 'very slow and solemn' },
  { max: 55, term: 'Largo', meaning: 'slow and broad' },
  { max: 70, term: 'Adagio', meaning: 'slow, at ease' },
  { max: 90, term: 'Andante', meaning: 'at a walking pace' },
  { max: 110, term: 'Moderato', meaning: 'at a moderate speed' },
  { max: 140, term: 'Allegro', meaning: 'fast and lively' },
  { max: 170, term: 'Vivace', meaning: 'very fast and spirited' },
  { max: 999, term: 'Presto', meaning: 'extremely fast' },
];

export const UI = {
  sectionNote: 'The note',
  sectionChord: 'Harmony at this moment',
  sectionSigns: 'Signs on this note',
  sectionMeasure: 'The measure (bar)',
  noSigns: {
    beginner: 'No extra performance signs are attached to this note — play it plainly as written.',
    advanced: 'No attached notations.',
  },
  restSelected: {
    beginner: 'This is a rest — a moment of silence. Count its beats without playing anything.',
    advanced: 'Rest.',
  },
};
