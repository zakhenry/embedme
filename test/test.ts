import test from 'ava';
import { exec } from 'child_process';
import { copyFileSync, readFileSync } from 'fs';
import * as util from 'util';

const execAsync = util.promisify(exec);

function stripCwd(str: string): string {
  return str.replace(new RegExp(process.cwd(), 'g'), '${cwd}');
}

test('it aborts on unrecognised flags', async t => {
  await t.throwsAsync(() => execAsync(`node dist/embedme.js test/fixtures/fixture.md --this-is-not-a-valid-flag`));
});

test('it embeds snippets into destination file with --stdout and does not edit the source', async t => {
  const src = `test/fixtures/fixture-source.md`;
  const dest = `test/fixtures/fixture.md`;
  const before = readFileSync(src, 'utf8');

  const { stderr } = await execAsync(`node dist/embedme.js ${src} --stdout > ${dest}`);

  const after = readFileSync(src, 'utf8');
  t.not(stderr, '');

  t.is(before, after);

  t.pass();
});

test('it edits the file in place, embedding code snippets', async t => {
  const src = `test/fixtures/fixture.md`;
  const filename = `test/fixtures/fixture-in-place.md`;
  await copyFileSync(`test/fixtures/fixture-source.md`, filename);
  const before = readFileSync(filename, 'utf8');

  const { stdout, stderr } = await execAsync(`node dist/embedme.js ${filename}`);
  const after = readFileSync(filename, 'utf8');

  const fileContentSource = readFileSync(src, 'utf8');

  t.is(after, fileContentSource);
  t.not(before, after);

  // these assertions are expected to fail when output or supported files changes.
  // run yarn test:update to update the snapshots. This is useful in code reviews
  // to interpret what has changed in output.
  t.snapshot(after, 'File content does not match');
  t.snapshot(stripCwd(stdout), 'stdout does not match');
  t.snapshot(stderr, 'stderr does not match');
});

test('it does not change source file with --dry-run', async t => {
  const src = `test/fixtures/fixture-source.md`;
  const before = readFileSync(src, 'utf8');

  const { stderr } = await execAsync(`node dist/embedme.js test/fixtures/fixture-source.md --dry-run`);

  const after = readFileSync(src, 'utf8');
  t.is(stderr, '');

  t.is(before, after);

  t.pass();
});

test('it strips embedded comments', async t => {
  const { stdout, stderr } = await execAsync(
    `node dist/embedme.js test/fixtures/fixture-source.md --strip-embed-comment --stdout`,
  );

  t.assert(stderr.includes('without comment line'));
  t.assert(!stdout.includes('// snippets/sample.md'));
});

test('it exits with code 1 in error conditions', async t => {
  const error: Error & { code: number; stdout: string } = await t.throwsAsync(
    execAsync(`node dist/embedme.js test/fixtures/fixture-error.md --verify`),
  );

  t.snapshot(stripCwd(error.stdout), 'stdout does not match');
  t.assert(error.code === 1);
});
