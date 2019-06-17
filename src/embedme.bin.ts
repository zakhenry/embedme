#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { embedme, EmbedmeOptions, logBuilder } from './embedme.lib';
import program from 'commander';
import chalk from 'chalk';
const pkg = require('../package.json');

program
  .version(pkg.version)
  .arguments('...files')
  .option('--verify', `Verify that running embedme would result in no changes. Useful for CI`)
  .option('--dry-run', `Run embedme as usual, but don't write`)
  .option(
    '--source-root [directory]',
    `Directory your source files live in in order to shorten the comment line in code fence`,
  )
  .option('--silent', `No console output`)
  .parse(process.argv);

const { args: sourceFiles } = program;

const options: EmbedmeOptions = (program as unknown) as EmbedmeOptions;

const log = logBuilder(options);

sourceFiles.forEach(source => {
  if (options.verify) {
    log(chalk.blue(`Verifying...`));
  } else if (options.dryRun) {
    log(chalk.blue(`Doing a dry run...`));
  } else {
    log(chalk.blue(`Embedding...`));
  }

  const sourceText = readFileSync(source, 'utf-8');

  const resolvedPath = resolve(source);

  const outText = embedme(sourceText, resolvedPath, options);

  if (options.verify) {
    if (sourceText !== outText) {
      log(chalk.red(`Diff detected, exiting 1`));
      process.exit(1);
    }
  } else if (!options.dryRun) {
    writeFileSync(source, outText);
  }
});
