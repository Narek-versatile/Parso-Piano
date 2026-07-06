import { unzipSync, strFromU8 } from 'fflate';
import { midiToMusicXML } from '../midi';

export type InputKind = 'midi' | 'musicxml' | 'mxl' | 'unknown';

export interface LoadedScore {
  xml: string;
  source: 'musicxml' | 'midi';
  fileName: string;
  warnings: string[];
}

export function detectKind(fileName: string, bytes: Uint8Array): InputKind {
  // Magic bytes are authoritative; extension is the fallback.
  if (bytes.length >= 4) {
    const head = String.fromCharCode(...bytes.slice(0, 4));
    if (head === 'MThd') return 'midi';
    if (head.startsWith('PK')) return 'mxl';
  }
  const ext = fileName.toLowerCase().split('.').pop() ?? '';
  if (ext === 'mid' || ext === 'midi') return 'midi';
  if (ext === 'mxl') return 'mxl';
  if (ext === 'xml' || ext === 'musicxml') return 'musicxml';
  return 'unknown';
}

/** Extract the root MusicXML document from a compressed .mxl archive. */
export function unpackMxl(bytes: Uint8Array): string {
  const files = unzipSync(bytes);
  // META-INF/container.xml names the root score file.
  const container = files['META-INF/container.xml'];
  if (container) {
    const doc = new DOMParser().parseFromString(strFromU8(container), 'application/xml');
    const rootfile = doc.querySelector('rootfile');
    const path = rootfile?.getAttribute('full-path');
    if (path && files[path]) return strFromU8(files[path]);
  }
  // Fallback: first .xml/.musicxml entry outside META-INF.
  for (const [name, data] of Object.entries(files)) {
    if (name.startsWith('META-INF/')) continue;
    if (/\.(xml|musicxml)$/i.test(name)) return strFromU8(data);
  }
  throw new Error('No MusicXML document found inside the .mxl archive.');
}

export async function loadScoreFile(file: File): Promise<LoadedScore> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length === 0) throw new Error('The file is empty.');
  if (bytes.length > 20 * 1024 * 1024) throw new Error('File is too large (max 20 MB).');

  const kind = detectKind(file.name, bytes);
  switch (kind) {
    case 'musicxml': {
      const xml = new TextDecoder().decode(bytes);
      assertLooksLikeMusicXml(xml);
      return { xml, source: 'musicxml', fileName: file.name, warnings: [] };
    }
    case 'mxl': {
      const xml = unpackMxl(bytes);
      assertLooksLikeMusicXml(xml);
      return { xml, source: 'musicxml', fileName: file.name, warnings: [] };
    }
    case 'midi': {
      const { xml, warnings } = midiToMusicXML(bytes, file.name);
      return { xml, source: 'midi', fileName: file.name, warnings };
    }
    default:
      throw new Error(
        `Unsupported file type. Please load a .mid, .midi, .musicxml, .xml or .mxl file.`,
      );
  }
}

function assertLooksLikeMusicXml(xml: string): void {
  if (!xml.includes('<score-partwise') && !xml.includes('<score-timewise')) {
    throw new Error('This XML file does not look like MusicXML (no <score-partwise> found).');
  }
}
