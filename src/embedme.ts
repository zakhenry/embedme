#!/usr/bin/env node

import program from 'commander';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { Options } from './types';
import { DestinationFileNotFoundError, VerificationError } from './exceptions';
import chalk from 'chalk';
import { processDestinationFile } from './destination.file-processor';
import { getDestinationFilePaths } from './helpers';
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
  .parse(process.argv);

const destinationFiles = getDestinationFilePaths();

if (destinationFiles.length === 0) {
  try {
    throw new DestinationFileNotFoundError(program.args);
  } catch (error) {
    if (error instanceof Error) console.error(error.name, error.message);
    process.exit(0);
  }
} else {
  console.info(chalk.grey.underline('Discovered', destinationFiles.length, 'destination file(s).'));
  console.debug(chalk.grey('Listing discovered files...'));
  console.debug(chalk.bgGrey(destinationFiles));
}

const options: Options = (program as unknown) as Options;

destinationFiles.forEach((destinationFile, i) => {
  const resolvedPath = resolve(destinationFile);
  const destinationText = readFileSync(destinationFile, 'utf-8');
  
  console.info(chalk.yellow('[', chalk.underline(`${i + 1}/${destinationFiles.length}`), ']'), chalk.white.underline(resolvedPath));
  
  const destinationTextUpdate = processDestinationFile(destinationText, resolvedPath, options);
  if(options.verify){
    try {
      if (destinationText !== destinationTextUpdate) {
        throw new VerificationError(resolvedPath, destinationText, destinationTextUpdate);
      } else {
        console.info(chalk.green('\t', `Verification was ${chalk.underline('successful')} for file ${resolvedPath}`));
      }
    } catch (error) {
      if (error instanceof Error) console.error(error.name, error.message);
      process.exit(0);
    }  
  } else if (options.stdout) {
    process.stdout.write(destinationTextUpdate);
  } else if (!options.dryRun) {
    if (destinationText !== destinationTextUpdate) {
      console.info(chalk.magenta('\t', `Writing to ${chalk.underline(resolvedPath)} with embedded changes.`))
      writeFileSync(destinationFile, destinationTextUpdate);
    } else {
      console.info(
        chalk.magenta('\t', `No changes to write for`, chalk.underline(resolvedPath)),
      );
    }
  }
});
