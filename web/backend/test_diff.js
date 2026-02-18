import { DiffEngine } from './src/DiffEngine.js';

const revisions = [
  { id: '1', modifiedTime: '2023-01-01T10:00:00Z', lastModifyingUser: { displayName: 'Alice' }, text: 'Hello' },
  { id: '2', modifiedTime: '2023-01-01T10:01:00Z', lastModifyingUser: { displayName: 'Alice' }, text: 'Hello World' },
  { id: '3', modifiedTime: '2023-01-01T10:02:00Z', lastModifyingUser: { displayName: 'Bob' }, text: 'Hello World!' }
];

const engine = new DiffEngine();
const manifest = engine.computeManifest('file123', revisions);

console.log(JSON.stringify(manifest, null, 2));

if (manifest.totalRevisions === 3 && manifest.deltas.length === 2 && manifest.baseText === 'Hello') {
  console.log('Test Passed');
} else {
  console.error('Test Failed');
  process.exit(1);
}
