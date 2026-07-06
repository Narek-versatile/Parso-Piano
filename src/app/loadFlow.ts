import { loadScoreFile } from '../lib/files/loadFile';
import { findExample, type ExamplePiece } from './examples';
import { scoreController } from './scoreController';
import { useAppStore } from './store';

/** Load a dropped/picked file end-to-end into the score view. */
export async function openFile(file: File): Promise<void> {
  setPieceParam(null); // a user file replaces any shareable example URL
  await load(() => loadScoreFile(file));
}

/** Load a bundled example and make the URL shareable (?piece=<id>). */
export async function openExample(example: ExamplePiece): Promise<void> {
  setPieceParam(example.id);
  await load(async () => {
    const res = await fetch(`${import.meta.env.BASE_URL}${example.path}`);
    if (!res.ok) throw new Error(`Could not download the example (HTTP ${res.status}).`);
    const bytes = await res.arrayBuffer();
    return loadScoreFile(new File([bytes], example.fileName));
  });
}

/** If the page URL names an example (?piece=…), load it on startup. */
export async function openFromUrl(): Promise<boolean> {
  if (useAppStore.getState().loadStatus !== 'idle') return false; // already loading (StrictMode re-run)
  const id = new URLSearchParams(window.location.search).get('piece');
  const example = id ? findExample(id) : undefined;
  if (!example) return false;
  await openExample(example);
  return true;
}

async function load(fn: () => Promise<Awaited<ReturnType<typeof loadScoreFile>>>): Promise<void> {
  const store = useAppStore.getState();
  store.set({ loadStatus: 'loading', errorMessage: undefined });
  try {
    const loaded = await fn();
    await scoreController.loadXml(loaded.xml, loaded.source, loaded.fileName, loaded.warnings);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not read this file.';
    useAppStore.getState().set({
      loadStatus: useAppStore.getState().model ? 'ready' : 'error',
      errorMessage: message,
    });
  }
}

function setPieceParam(id: string | null): void {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set('piece', id);
  else url.searchParams.delete('piece');
  window.history.replaceState(null, '', url);
}
