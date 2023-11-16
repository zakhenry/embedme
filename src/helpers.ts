import program from 'commander';
import glob from 'glob';

export const getLineNumber = (text: string, index: number, lineEnding: string): number => {
  return text.substring(0, index).split(lineEnding).length;
};

/*
 * Detects line ending to use based on whether or not CRLF is detected in the source text.
 */

export const getReturnCharacter = (sourceText: string): string => {
  let rexp = new RegExp(/\r\n/);

  return rexp.test(sourceText) ? '\r\n' : '\n';
};

/**
 * Identify all destination files
 */
export const getDestinationFilePaths = (): string[] => {
  return program.args.reduce<string[]>((files, file) => {
    if (glob.hasMagic(file)) {
      files.push(...glob.sync(file));
    } else {
      files.push(file);
    }

    return files;
  }, []);
};
