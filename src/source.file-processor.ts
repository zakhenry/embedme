import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import { relative, resolve } from 'path';
import {
  ReplacementConfig,
  destinationSnippetFooterRegExp,
  destinationSnippetHeaderRegExp,
  sourceTableFileRegExp,
  tableBodyLineNumbersRegExp,
  tableHeaderLineNumberRegExp,
} from './types';
import {
  SnippetFooterNotFoundError,
  SnippetHeaderNotFoundError,
  SourceFileNotFoundError,
  SourceTableHeaderNotConfiguredError,
} from './exceptions';

export const getTableSnippet = (config: ReplacementConfig): string => {
  const endLineNumber = config.substr.split(config.returnCharacter).length + config.startLineNumber - 1;
  console.debug(
    chalk.gray(
      '\t',
      'Processing snippet',
      chalk.underline(`${relative(process.cwd(), config.inputFilePath)}#L${config.startLineNumber}-L${endLineNumber}`),
    ),
  );
  let destinationSnippet: string | null = '' + config.substr;
  let snippetHeader = '';
  let snippetFooter = '';
  let sourceTableFile = '';
  let relativePath = '';
  let regexResult: RegExpMatchArray | null = null;
  try {
    /**
     * @desc set snippet *header* or throw exception
     */
    regexResult = destinationSnippet.match(destinationSnippetHeaderRegExp);
    if (regexResult == null) {
      throw new SnippetHeaderNotFoundError(destinationSnippet);
    } else {
      snippetHeader = regexResult[0];
    }
    /**
     * @desc set snippet *footer* or throw exception
     */
    regexResult = destinationSnippet.match(destinationSnippetFooterRegExp);
    if (regexResult == null) {
      throw new SnippetFooterNotFoundError(destinationSnippet);
    } else {
      snippetFooter = regexResult[0];
    }
    /**
     * @desc set snippet *source file name in header* or throw exception
     */
    regexResult = snippetHeader.match(sourceTableFileRegExp);
    if (regexResult == null) {
      throw new SnippetFooterNotFoundError(snippetHeader);
    } else {
      sourceTableFile = regexResult[0];
    }
    /**
     * @desc check if *source file exists on disk* or throw exception
     */
    if (config.sourceRoot) {
      relativePath = resolve(process.cwd(), config.sourceRoot, sourceTableFile);
    } else {
      relativePath = resolve(config.inputFilePath, '..', sourceTableFile);
    }
    if (!existsSync(relativePath)) throw new SourceFileNotFoundError(relativePath);
  } catch (error) {
    if (error instanceof Error) console.error(error.name, error.message);
    process.exit(0);
  }
  const sourceFile = readFileSync(relativePath, 'utf8');
  const sourceLines = sourceFile.split(config.returnCharacter);
  let destinationLines: string[] = [];

  const tableBodyMatches = snippetHeader.match(tableBodyLineNumbersRegExp);
  if (tableBodyMatches == null) {
    console.debug('\t\t', chalk.grey('No line segments detected. Considering the entire file...'));
    destinationLines = destinationLines.concat(sourceLines);
  } else {
    regexResult = snippetHeader.match(tableHeaderLineNumberRegExp);
    let tableHeaderLineNumber = -1;
    try {
      if (regexResult == null) {
        throw new SourceTableHeaderNotConfiguredError(snippetHeader);
      } else {
        tableHeaderLineNumber = Number(regexResult[1]);
      }
    } catch (error) {
      if (error instanceof Error) console.error(error.name, error.message);
      process.exit(0);
    }
    /**
     * @desc Take the line of the header and 1 line below
     * @desc so the 2 lines added to the destination file are
     * @desc | col1 | col2 | etc. |
     * @desc |------|------|------|
     */
    destinationLines = destinationLines.concat(sourceLines.slice(tableHeaderLineNumber - 1, tableHeaderLineNumber + 1));

    tableBodyMatches.forEach((snippet: string) => {
      const matches = snippet.match(/\d+/g);
      if (matches != null) {
        const [snippetStartLine, snippetEndLine] = matches;
        destinationLines = destinationLines.concat(
          sourceLines.slice(Number(snippetStartLine) - 1, Number(snippetEndLine)),
        );
      }
    });
  }

  destinationLines.unshift(snippetHeader);
  destinationLines.push(snippetFooter);
  return destinationLines.join(config.returnCharacter);
};
