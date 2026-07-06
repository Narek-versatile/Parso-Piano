/** Bundled example scores, loadable via the `?piece=<id>` URL parameter. */

export interface ExamplePiece {
  id: string;
  /** Button / display label */
  title: string;
  /** Path under the app base URL */
  path: string;
  fileName: string;
}

export const EXAMPLES: ExamplePiece[] = [
  {
    id: 'funeral-march',
    title: 'Chopin — Funeral March',
    path: 'examples/funeral-march.mxl',
    fileName: 'Funeral March (Chopin).mxl',
  },
];

export function findExample(id: string): ExamplePiece | undefined {
  return EXAMPLES.find((e) => e.id === id);
}
