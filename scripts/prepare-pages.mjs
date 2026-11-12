import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('dist/studio', { recursive: true });
await Promise.all([
  copyFile('dist/index.html', 'dist/studio/index.html'),
  copyFile('dist/index.html', 'dist/404.html'),
  copyFile('CNAME', 'dist/CNAME'),
]);
