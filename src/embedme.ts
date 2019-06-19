#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { relative, resolve } from 'path';
import { embedme, EmbedmeOptions, logBuilder } from './embedme.lib';
import program from 'commander';
import chalk from 'chalk';
const pkg = require('../package.json');

program
  .version(pkg.version)
  .arguments('[...files]')
  .option('--verify', `Verify that running embedme would result in no changes. Useful for CI`)
  .option('--dry-run', `Run embedme as usual, but don't write`)
  .option(
    '--source-root [directory]',
    `Directory your source files live in in order to shorten the comment line in code fence`,
  )
  .option('--silent', `No console output`)
  .option('--stdout', `Output resulting file to stdout (don't rewrite original)`)
  .option('--strip-embed-comment', `Remove the comments from the code fence. *Must* be run with --stdout flag`)
  .parse(process.argv);

const { args: sourceFiles } = program;

const options: EmbedmeOptions = (program as unknown) as EmbedmeOptions;

const log = logBuilder(options);

if (options.stdout && sourceFiles.length > 1) {
  log(chalk.yellow(`More than one file matched your input, results will be concatenated in stdout`));
}

if (options.stripEmbedComment && !options.stdout) {
  log(
    chalk.red(
      `If you use the --strip-embed-comment flag, you must use the --stdout flag and redirect the result to your destination file, otherwise your source file(s) will be rewritten and comment source is lost.`,
    ),
  );
  process.exit(1);
}

if (options.verify) {
  log(chalk.blue(`Verifying...`));
} else if (options.dryRun) {
  log(chalk.blue(`Doing a dry run...`));
} else if (options.stdout) {
  log(chalk.blue(`Outputting to stdout...`));
} else {
  log(chalk.blue(`Embedding...`));
}

sourceFiles.forEach(source => {
  const sourceText = readFileSync(source, 'utf-8');

  const resolvedPath = resolve(source);

  const outText = embedme(sourceText, resolvedPath, options);

  if (options.verify) {
    if (sourceText !== outText) {
      log(chalk.red(`Diff detected, exiting 1`));
      process.exit(1);
    }
  } else if (options.stdout) {
    process.stdout.write(outText);
  } else if (!options.dryRun) {
    log(chalk.magenta(`  Writing ${chalk.underline(relative(process.cwd(), resolvedPath))} with embedded changes.`));
    writeFileSync(source, outText);
  }
});
