import { loadScoreFile } from '../lib/files/loadFile';
import { scoreController } from './scoreController';
import { useAppStore } from './store';

/** Load a dropped/picked file end-to-end into the score view. */
export async function openFile(file: File): Promise<void> {
  const store = useAppStore.getState();
  store.set({ loadStatus: 'loading', errorMessage: undefined });
  try {
    const loaded = await loadScoreFile(file);
    await scoreController.loadXml(loaded.xml, loaded.source, loaded.fileName, loaded.warnings);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not read this file.';
    useAppStore.getState().set({
      loadStatus: useAppStore.getState().model ? 'ready' : 'error',
      errorMessage: message,
    });
  }
}
