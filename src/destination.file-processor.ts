import chalk from 'chalk';
import { Options, ReplacementConfig, destinationSnippetRegExp } from './types';
import { getLineNumber, getReturnCharacter } from './helpers';
import { getTableSnippet } from './source.file-processor';

export function processDestinationFile(destinationText: string, inputFilePath: string, options: Options): string {
  const docPartials: string[] = [];
  let regexResult: RegExpMatchArray | null = null;

  const returnCharacter = getReturnCharacter(destinationText);
  let previousEnd = 0;
  regexResult = destinationText.match(destinationSnippetRegExp);
  if (regexResult == null) {
    console.info(chalk.yellow('\t', 'Did not find any embed snippets in', chalk.underline(inputFilePath)));
    return [...docPartials].join('') + destinationText.substring(previousEnd);
  }

  while ((regexResult = destinationSnippetRegExp.exec(destinationText)) !== null) {
    const [destinationSnippet] = regexResult;
    const start = destinationText.substring(previousEnd, regexResult.index);
    /**
     * Working out the starting line number is slightly complex as the logic differs depending on whether or not we are
     * writing to the file.
     */
    const startLineNumber = (() => {
      if (options.dryRun || options.stdout || options.verify) {
        return getLineNumber(destinationText.substring(0, regexResult.index), regexResult.index!, returnCharacter);
      }
      const startingLineNumber = docPartials.join('').split(returnCharacter).length - 1;
      return (
        startingLineNumber +
        getLineNumber(destinationText.substring(previousEnd, regexResult.index), regexResult.index!, returnCharacter)
      );
    })();

    const config: ReplacementConfig = {
      substr: destinationSnippet,
      returnCharacter,
      startLineNumber,
      inputFilePath,
      sourceRoot: options.sourceRoot,
    };
    const text = getTableSnippet(config);

    docPartials.push(start, text);
    previousEnd = destinationSnippetRegExp.lastIndex;
  }

  return [...docPartials].join('') + destinationText.substring(previousEnd);
}
