#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { relative, resolve } from 'path';
import { embedme, EmbedmeOptions, logBuilder } from './embedme.lib';
import { compile } from 'gitignore-parser';
import program from 'commander';
import glob from 'glob';
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

const { args: sourceFilesInput } = program;

const options: EmbedmeOptions = (program as unknown) as EmbedmeOptions;

const log = logBuilder(options);
const errorLog = logBuilder(options, true);

let sourceFiles = sourceFilesInput.reduce<string[]>((files, file) => {
  if (glob.hasMagic(file)) {
    files.push(...glob.sync(file));
  } else {
    files.push(file);
  }

  return files;
}, []);

if (sourceFiles.length > 1) {
  log(chalk => chalk.yellow(`More than one file matched your input, results will be concatenated in stdout`));
} else if (sourceFiles.length === 0) {
  log(chalk => chalk.yellow(`No files matched your input`));
  process.exit(0);
}

if (options.stripEmbedComment && !options.stdout) {
  errorLog(chalk =>
    chalk.red(
      `If you use the --strip-embed-comment flag, you must use the --stdout flag and redirect the result to your destination file, otherwise your source file(s) will be rewritten and comment source is lost.`,
    ),
  );
  process.exit(1);
}

if (options.verify) {
  log(chalk => chalk.blue(`Verifying...`));
} else if (options.dryRun) {
  log(chalk => chalk.blue(`Doing a dry run...`));
} else if (options.stdout) {
  log(chalk => chalk.blue(`Outputting to stdout...`));
} else {
  log(chalk => chalk.blue(`Embedding...`));
}

const ignoreFile = ['.embedmeignore', '.gitignore'].map(f => relative(process.cwd(), f)).find(existsSync);

if (ignoreFile) {
  const ignore = compile(readFileSync(ignoreFile, 'utf-8'));

  const filtered = sourceFiles.filter(ignore.accepts);

  log(chalk => chalk.blue(`Skipped ${sourceFiles.length - filtered.length} files ignored in '${ignoreFile}'`));

  sourceFiles = filtered;

  if (sourceFiles.length === 0) {
    log(chalk => chalk.yellow(`All matching files were ignored in '${ignoreFile}'`));
    process.exit(0);
  }
}

sourceFiles.forEach((source, i) => {
  if (i > 0) {
    log(chalk => chalk.gray(`---`));
  }

  const resolvedPath = resolve(source);

  if (!existsSync(source)) {
    errorLog(chalk => chalk.red(`  File ${chalk.underline(relative(process.cwd(), resolvedPath))} does not exist.`));
    process.exit(1);
    return;
  }

  const sourceText = readFileSync(source, 'utf-8');

  const outText = embedme(sourceText, resolvedPath, options);

  if (options.verify) {
    if (sourceText !== outText) {
      errorLog(chalk => chalk.red(`Diff detected, exiting 1`));
      process.exit(1);
    }
  } else if (options.stdout) {
    process.stdout.write(outText);
  } else if (!options.dryRun) {
    if (sourceText !== outText) {
      log(chalk =>
        chalk.magenta(`  Writing ${chalk.underline(relative(process.cwd(), resolvedPath))} with embedded changes.`),
      );
      writeFileSync(source, outText);
    } else {
      log(chalk =>
        chalk.magenta(`  No changes to write for ${chalk.underline(relative(process.cwd(), resolvedPath))}`),
      );
    }
  }
});
