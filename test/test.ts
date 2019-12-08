import test from 'ava';
import { exec } from 'child_process';
import { copyFileSync, readFileSync } from 'fs';
import * as util from 'util';

const execAsync = util.promisify(exec);

test('it edits the file in place, embedding code snippets', async t => {

  const src = `test/fixtures/fixture.md`;
  const filename = `test/fixtures/fixture-in-place.md`;
  await copyFileSync(`test/fixtures/fixture-source.md`, filename);
  const before = readFileSync(filename, 'utf8');

  const {stdout, stderr} = await execAsync(`node dist/embedme.js ${filename}`);
  const after = readFileSync(filename, 'utf8');

  const fileContentSource = readFileSync(src, 'utf8');

  t.is(after, fileContentSource);
  t.not(before, after);

  // these assertions are expected to fail when output or supported files changes.
  // run yarn test:update to update the snapshots. This is useful in code reviews
  // to interpret what has changed in output.
  t.snapshot(after, "File content matches");
  t.snapshot(stdout, "stdout matches");
  t.snapshot(stderr, "stderr matches");
});

test('it does not change source file with --dry-run', async t => {

  const src = `test/fixtures/fixture-source.md`;
  const before = readFileSync(src, 'utf8');

  const {stderr} = await execAsync(`node dist/embedme.js test/fixtures/fixture-source.md --dry-run`);

  const after = readFileSync(src, 'utf8');
  t.is(stderr, '');

  t.is(before, after);

  t.pass();

});
