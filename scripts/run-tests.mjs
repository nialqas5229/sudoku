import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function runWithEsbuild(tmpDir) {
  const esbuild = await import('esbuild');
  fs.mkdirSync(tmpDir, { recursive: true });
  const entryContent = `
    import '../src/tests/solver.test.ts';
    import '../src/tests/generator.test.ts';
    import '../src/tests/validator.test.ts';
    import '../src/tests/stats.test.ts';
    import '../src/tests/feedback.test.ts';
    import '../src/tests/highlighting.test.ts';
    import { getTestResults } from '../src/tests/test-harness.ts';
    export { getTestResults };
  `;
  const entryFile = path.join(tmpDir, 'entry.ts');
  const outFile = path.join(tmpDir, 'bundle.mjs');
  fs.writeFileSync(entryFile, entryContent);
  await esbuild.build({
    entryPoints: [entryFile],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: outFile,
    absWorkingDir: rootDir,
    logLevel: 'silent',
  });
  const mod = await import(pathToFileURL(outFile).href);
  return mod.getTestResults();
}

function reportResults(results) {
  let passed = 0;
  let failed = 0;
  for (const r of results) {
    if (r.passed) {
      passed++;
      console.log(`  PASS [${r.suite}] ${r.name}`);
    } else {
      failed++;
      console.error(`  FAIL [${r.suite}] ${r.name}\n    -> ${r.error}`);
    }
  }
  console.log(`\nTest Summary: ${passed} passed, ${failed} failed (${results.length} total).`);
  if (failed > 0) process.exit(1);
}

async function main() {
  const tmpDir = path.join(rootDir, '.tmp-test-build');
  fs.rmSync(tmpDir, { recursive: true, force: true });
  try {
    const results = await runWithEsbuild(tmpDir);
    reportResults(results);
  } catch (err) {
    console.error('Error running test suite (ensure npm install has been run):', err.message || err);
    process.exit(1);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main();
