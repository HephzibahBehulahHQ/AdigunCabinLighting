import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const TEXT_ASSET = /\.(?:html|js|css|json|map|svg|txt|xml|webmanifest)$/i;
const FINDINGS = [
  ['gateway-source', /(?:ADIGUN_GATEWAY_TOKEN|dist-gateway|gateway\/server|createGatewayServer|startGateway)/i],
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['credential-pattern', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9_-]{24,})\b/],
  ['bearer-secret', /\bBearer\s+[A-Za-z0-9+/=_-]{32,}/i],
];

export async function inspectStaticRelease(root) {
  const rootInfo = await stat(root).catch(() => null);
  if (!rootInfo?.isDirectory()) throw new Error(`Static release directory is missing: ${root}`);

  const files = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Static release contains a symlink: ${path.relative(root, absolute)}`);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile() && TEXT_ASSET.test(entry.name)) files.push(absolute);
    }
  }
  await walk(root);

  if (!files.some((file) => path.relative(root, file).split(path.sep).join('/') === 'index.html')) {
    throw new Error('Static release is missing index.html.');
  }

  const findings = [];
  for (const file of files.sort()) {
    const contents = await readFile(file, 'utf8');
    for (const [code, pattern] of FINDINGS) {
      if (pattern.test(contents)) findings.push({ file: path.relative(root, file).split(path.sep).join('/'), code });
    }
  }
  return findings;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const root = process.argv[2] ?? 'dist';
  try {
    const findings = await inspectStaticRelease(root);
    if (findings.length) {
      for (const finding of findings) console.error(`FAIL ${finding.code}: ${finding.file}`);
      process.exitCode = 1;
    } else {
      console.log(`PASS static release inspection (${root})`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Static release inspection failed.');
    process.exitCode = 1;
  }
}

