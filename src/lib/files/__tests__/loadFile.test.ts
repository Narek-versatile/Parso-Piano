import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { detectKind, unpackMxl } from '../loadFile';

describe('detectKind', () => {
  it('detects MIDI by magic bytes regardless of extension', () => {
    const bytes = new Uint8Array([0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6]); // "MThd"
    expect(detectKind('weird.dat', bytes)).toBe('midi');
  });

  it('detects mxl by PK zip header', () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    expect(detectKind('score.mxl', bytes)).toBe('mxl');
  });

  it('falls back to extension for xml', () => {
    const bytes = strToU8('<?xml version="1.0"?><score-partwise/>');
    expect(detectKind('piece.musicxml', bytes)).toBe('musicxml');
    expect(detectKind('piece.xml', bytes)).toBe('musicxml');
  });
});

describe('unpackMxl', () => {
  const scoreXml = '<?xml version="1.0"?><score-partwise version="3.1"></score-partwise>';

  it('follows META-INF/container.xml to the root file', () => {
    const container =
      '<?xml version="1.0"?><container><rootfiles><rootfile full-path="score.xml"/></rootfiles></container>';
    const zipped = zipSync({
      'META-INF/container.xml': strToU8(container),
      'score.xml': strToU8(scoreXml),
      'other.txt': strToU8('junk'),
    });
    expect(unpackMxl(zipped)).toBe(scoreXml);
  });

  it('falls back to the first xml entry without a container', () => {
    const zipped = zipSync({ 'piece.musicxml': strToU8(scoreXml) });
    expect(unpackMxl(zipped)).toBe(scoreXml);
  });

  it('throws when the archive has no xml', () => {
    const zipped = zipSync({ 'readme.txt': strToU8('hello') });
    expect(() => unpackMxl(zipped)).toThrow(/No MusicXML/);
  });
});
