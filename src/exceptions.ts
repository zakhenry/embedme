import chalk from 'chalk';

export class DestinationFileNotFoundError extends Error {
  name = 'DestinationFileNotFoundError';
  constructor(args: string[]) {
    super(chalk.red('No files matched your input', chalk.underline(args)));
    this.name = `${chalk.bgRed('ERROR:')} ${chalk.bgCyan('[', this.name, ']')}`;
  }
}

export class SnippetHeaderNotFoundError extends Error {
  name = 'SnippetHeaderNotFoundError';
  constructor(args: string) {
    super(chalk.red('Unable to find header in snippet', chalk.underline(args)));
    this.name = `${chalk.bgRed('ERROR:')} ${chalk.bgCyan('[', this.name, ']')}`;
  }
}

export class SnippetFooterNotFoundError extends Error {
  name = 'SnippetFooterNotFoundError';
  constructor(args: string) {
    super(chalk.red('Unable to find footer in snippet', chalk.underline(args)));
    this.name = `${chalk.bgRed('ERROR:')} ${chalk.bgCyan('[', this.name, ']')}`;
  }
}

export class SourceFileNameNotFoundError extends Error {
  name = 'SourceFileNameNotFoundError';
  constructor(args: string) {
    super(chalk.red('Unable to identify source file name in snippet', chalk.underline(args)));
    this.name = `${chalk.bgRed('ERROR:')} ${chalk.bgCyan('[', this.name, ']')}`;
  }
}

export class SourceFileNotFoundError extends Error {
  name = 'SourceFileNotFoundError';
  constructor(args: string) {
    super(chalk.red('File', chalk.underline(args), 'does not exist'));
    this.name = `${chalk.bgRed('ERROR:')} ${chalk.bgCyan('[', this.name, ']')}`;
  }
}

export class SourceTableHeaderNotConfiguredError extends Error {
  name = 'SourceTableHeaderNotConfiguredError';
  constructor(args: string) {
    super(chalk.red('Table header configuration not found in snippet', chalk.underline(args)));
    this.name = `${chalk.bgRed('ERROR:')} ${chalk.bgCyan('[', this.name, ']')}`;
  }
}

export class VerificationError extends Error {
  name = 'VerificationError';
  constructor(destinationFile: string, current: string, update: string) {
    super();
    const msg = [
      `Difference between destination and source files detected in file ${chalk.underline(destinationFile)}`,
      chalk.bgWhiteBright('>>> destination snippet begins <<<'),
      current,
      chalk.bgWhiteBright('<<< destination snippet ends >>>'),
      chalk.bgWhiteBright('>>> source snippet begins <<<'),
      update,
      chalk.bgWhiteBright('<<< source snippet ends >>>'),
    ].join('\n');
    this.message = msg;
    this.name = `${chalk.bgRed('ERROR:')} ${chalk.bgCyan('[', this.name, ']')}`;
  }
}
