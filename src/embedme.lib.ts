import chalk, { Chalk } from 'chalk';
import { existsSync, readFileSync } from 'fs';
import { relative, resolve } from 'path';
import { getTargetFileContentRemote } from './getTargetFileContentRemote';

/**
 * This simple script looks for code fences in source file for a syntax that looks like a file reference, optionally
 * with a line number reference. If a file exists at this location it is inserted into the code fence.
 *
 * Example:
 *
 * ```ts
 * // path/to/some/file.ts
 * ```
 *
 * will look for path/to/some/file.ts and if present, read it and insert
 *
 * ```ts
 * // path/to/some/file.ts
 * file content will appear hear
 * ```
 *
 * ```ts
 * // path/to/some/file.ts#L10-50
 * ```
 *
 * ```ts
 * // path/to/some/file.ts#L10-50
 * file content (only lines 10 - 50) will appear hear
 * ```
 *
 */

type FilenameFromCommentReader = (line: string) => string | null;

export interface EmbedmeOptions {
  sourceRoot: string;
  dryRun: boolean;
  verify: boolean;
  silent: boolean;
  stdout: boolean;
  stripEmbedComment: boolean;
}

enum SupportedFileType {
  PLAIN_TEXT = 'txt',
  TYPESCRIPT = 'ts',
  JAVASCRIPT = 'js',
  REASON = 're',
  SCSS = 'scss',
  RUST = 'rust',
  JAVA = 'java',
  CPP = 'cpp',
  C = 'c',
  HTML = 'html',
  XML = 'xml',
  MARKDOWN = 'md',
  YAML = 'yaml',
  JSON = 'json',
  JSON_5 = 'json5',
  PYTHON = 'py',
  BASH = 'bash',
  SHELL = 'sh',
  GOLANG = 'go',
  OBJECTIVE_C = 'objectivec',
  PHP = 'php',
  C_SHARP = 'cs',
  SWIFT = 'swift',
  RUBY = 'rb',
  KOTLIN = 'kotlin',
  SCALA = 'scala',
  CRYSTAL = 'cr',
  PLANT_UML = 'puml',
  MERMAID = 'mermaid',
  CMAKE = 'cmake',
  PROTOBUF = 'proto',
  SQL = 'sql',
  HASKELL = 'hs',
  ARDUINO = 'ino',
  JSX = 'jsx',
  TSX = 'tsx',
}

enum CommentFamily {
  NONE, // some languages do not support comments, e.g. JSON
  C,
  XML,
  HASH,
  SINGLE_QUOTE,
  DOUBLE_PERCENT,
  DOUBLE_HYPHENS,
}

const languageMap: Record<CommentFamily, SupportedFileType[]> = {
  [CommentFamily.NONE]: [SupportedFileType.JSON],
  [CommentFamily.C]: [
    SupportedFileType.PLAIN_TEXT, // this is a lie, but we gotta pick something
    SupportedFileType.C,
    SupportedFileType.TYPESCRIPT,
    SupportedFileType.REASON,
    SupportedFileType.JAVASCRIPT,
    SupportedFileType.RUST,
    SupportedFileType.CPP,
    SupportedFileType.JAVA,
    SupportedFileType.GOLANG,
    SupportedFileType.OBJECTIVE_C,
    SupportedFileType.SCSS,
    SupportedFileType.PHP,
    SupportedFileType.C_SHARP,
    SupportedFileType.SWIFT,
    SupportedFileType.KOTLIN,
    SupportedFileType.SCALA,
    SupportedFileType.JSON_5,
    SupportedFileType.PROTOBUF,
    SupportedFileType.ARDUINO,
    SupportedFileType.JSX,
    SupportedFileType.TSX,
  ],
  [CommentFamily.XML]: [SupportedFileType.HTML, SupportedFileType.MARKDOWN, SupportedFileType.XML],
  [CommentFamily.HASH]: [
    SupportedFileType.PYTHON,
    SupportedFileType.BASH,
    SupportedFileType.SHELL,
    SupportedFileType.YAML,
    SupportedFileType.RUBY,
    SupportedFileType.CRYSTAL,
    SupportedFileType.CMAKE,
  ],
  [CommentFamily.SINGLE_QUOTE]: [SupportedFileType.PLANT_UML],
  [CommentFamily.DOUBLE_PERCENT]: [SupportedFileType.MERMAID],
  [CommentFamily.DOUBLE_HYPHENS]: [SupportedFileType.SQL, SupportedFileType.HASKELL],
};

const leadingSymbol = (symbol: string): FilenameFromCommentReader => line => {
  const regex = new RegExp(`${symbol}\\s?(\\S*?$)`);

  const match = line.match(regex);
  if (!match) {
    return null;
  }

  return match[1];
};

const filetypeCommentReaders: Record<CommentFamily, FilenameFromCommentReader> = {
  [CommentFamily.NONE]: _ => null,
  [CommentFamily.C]: leadingSymbol('//'),
  [CommentFamily.XML]: line => {
    const match = line.match(/<!--\s*?(\S*?)\s*?-->/);
    if (!match) {
      return null;
    }

    return match[1];
  },
  [CommentFamily.HASH]: leadingSymbol('#'),
  [CommentFamily.SINGLE_QUOTE]: leadingSymbol(`'`),
  [CommentFamily.DOUBLE_PERCENT]: leadingSymbol('%%'),
  [CommentFamily.DOUBLE_HYPHENS]: leadingSymbol('--'),
};

function lookupLanguageCommentFamily(fileType: SupportedFileType): CommentFamily | null {
  return Object.values(CommentFamily)
    .filter(x => typeof x === 'number')
    .find((commentFamily: CommentFamily) => languageMap[commentFamily].includes(fileType));
}

// this somewhat convoluted type to generate logs is due to the requirement to be able to log colours to both stdout,
// and stderr, so the appropriate chalk instance has to be injected.
type LogConstructor = (chalk: Chalk) => string;

export const logBuilder = (options: EmbedmeOptions, errorLog = false) => (logConstructor: LogConstructor) => {
  if (!options.silent) {
    if (errorLog || options.stdout) {
      // as we're putting the resulting file out of stdout, we redirect the logs to stderr so they can still be seen,
      // but won't be piped
      console.error(logConstructor(chalk.stderr));
    } else {
      console.log(logConstructor(chalk));
    }
  }
};

/* @internal */
async function getReplacement(
  inputFilePath: string,
  options: EmbedmeOptions,
  logMethod: ReturnType<typeof logBuilder>,
  substr: string,
  leadingSpaces: string,
  lineEnding: string,
  codeExtension: SupportedFileType,
  firstLine: string,
  startLineNumber: number,
  ignoreNext: boolean,
  commentEmbedOverrideFilepath?: string,
) {
  /**
   * Re-declare the log class, prefixing each snippet with the file and line number
   * Note that we couldn't have derived the line count in the parent regex matcher, as we don't yet know how long the
   * embed is going to be.
   */
  const log = ({ returnSnippet }: { returnSnippet: string }, logConstructor: LogConstructor) => {
    const endLineNumber = returnSnippet.split(lineEnding).length + startLineNumber - 1;

    logMethod(chalk => {
      const logPrefix = chalk.gray(
        `   ${relative(process.cwd(), inputFilePath)}#L${startLineNumber}-L${endLineNumber}`,
      );
      return logPrefix + ' ' + logConstructor(chalk);
    });
  };

  if (ignoreNext) {
    log({ returnSnippet: substr }, chalk => chalk.blue(`"Ignore next" comment detected, skipping code block...`));
    return substr;
  }

  let commentedFilename: string | null;
  if (commentEmbedOverrideFilepath) {
    commentedFilename = commentEmbedOverrideFilepath;
  } else {
    if (!codeExtension) {
      log({ returnSnippet: substr }, chalk => chalk.blue(`No code extension detected, skipping code block...`));
      return substr;
    }

    if (!firstLine) {
      log({ returnSnippet: substr }, chalk =>
        chalk.blue(`Code block is empty & no preceding embedme comment, skipping...`),
      );
      return substr;
    }

    const supportedFileTypes: SupportedFileType[] = Object.values(SupportedFileType).filter(x => typeof x === 'string');

    if (supportedFileTypes.indexOf(codeExtension) < 0) {
      log({ returnSnippet: substr }, chalk =>
        chalk.yellow(
          `Unsupported file extension [${codeExtension}], supported extensions are ${supportedFileTypes.join(
            ', ',
          )}, skipping code block`,
        ),
      );
      return substr;
    }

    const languageFamily: CommentFamily | null = lookupLanguageCommentFamily(codeExtension);

    if (languageFamily == null) {
      log({ returnSnippet: substr }, chalk =>
        chalk.red(
          `File extension ${chalk.underline(
            codeExtension,
          )} marked as supported, but comment family could not be determined. Please report this issue.`,
        ),
      );
      return substr;
    }

    commentedFilename = filetypeCommentReaders[languageFamily](firstLine);
  }

  if (!commentedFilename) {
    log({ returnSnippet: substr }, chalk =>
      chalk.gray(`No comment detected in first line for block with extension ${codeExtension}`),
    );
    return substr;
  }

  const matches = commentedFilename.match(/\s?(\S+?)((#L(\d+)-L(\d+))|$)/m);

  if (!matches) {
    log({ returnSnippet: substr }, chalk => chalk.gray(`No file found in embed line`));
    return substr;
  }

  const [, filename, , lineNumbering, startLine, endLine] = matches;
  if (filename.includes('#')) {
    log({ returnSnippet: substr }, chalk =>
      chalk.red(
        `Incorrectly formatted line numbering string ${chalk.underline(
          filename,
        )}, Expecting Github formatting e.g. #L10-L20`,
      ),
    );
    return substr;
  }

  const relativePath = options.sourceRoot
    ? resolve(process.cwd(), options.sourceRoot, filename)
    : resolve(inputFilePath, '..', filename);

  let file = '';

  if (filename.startsWith('http')) {
    file = await getTargetFileContentRemote(filename);
    if (file === 'this-file-does-not-exist') {
      log({ returnSnippet: substr }, chalk =>
        chalk.red(`Found filename ${chalk.underline(filename)} in comment in first line, but file does not exist!`),
      );
      return substr;
    }
  } else {
    if (!existsSync(relativePath)) {
      log({ returnSnippet: substr }, chalk =>
        chalk.red(
          `Found filename ${chalk.underline(
            filename,
          )} in comment in first line, but file does not exist at ${chalk.underline(relativePath)}!`,
        ),
      );
      return substr;
    }

    file = readFileSync(relativePath, 'utf8');
  }

  let lines = file.split(lineEnding);
  if (lineNumbering) {
    lines = lines.slice(+startLine - 1, +endLine);
  }

  const minimumLeadingSpaces = lines.reduce((minSpaces: number, line: string) => {
    if (minSpaces === 0) {
      return 0;
    }

    if (line.length === 0) {
      return Infinity; //empty lines shouldn't count
    }

    const leadingSpaces = line.match(/^[\s]+/m);

    if (!leadingSpaces) {
      return 0;
    }

    return Math.min(minSpaces, leadingSpaces[0].length);
  }, Infinity);

  lines = lines.map(line => line.slice(minimumLeadingSpaces));

  const outputCode = lines.join(lineEnding);

  if (/```/.test(outputCode)) {
    log({ returnSnippet: substr }, chalk =>
      chalk.red(
        `Output snippet for file ${chalk.underline(
          filename,
        )} contains a code fence. Refusing to embed as that would break the document`,
      ),
    );
    return substr;
  }

  let replacement =
    !!commentEmbedOverrideFilepath || options.stripEmbedComment
      ? `\`\`\`${codeExtension}${lineEnding}${outputCode}${lineEnding}\`\`\``
      : `\`\`\`${codeExtension}${lineEnding}${firstLine.trim()}${lineEnding}${lineEnding}${outputCode}${lineEnding}\`\`\``;

  if (leadingSpaces.length) {
    replacement = replacement
      .split(lineEnding)
      .map(line => leadingSpaces + line)
      .join(lineEnding);
  }

  if (replacement === substr) {
    log({ returnSnippet: substr }, chalk => chalk.gray(`No changes required, already up to date`));
    return substr;
  }

  if (replacement.slice(0, -3).trimRight() === substr.slice(0, -3).trimRight()) {
    log({ returnSnippet: substr }, chalk => chalk.gray(`Changes are trailing whitespace only, ignoring`));
    return substr;
  }

  const chalkColour = options.verify ? 'yellow' : 'green';

  log({ returnSnippet: replacement }, chalk =>
    chalk[chalkColour](
      `Embedded ${chalk[(chalkColour + 'Bright') as 'greenBright'](lines.length + ' lines')}${
        options.stripEmbedComment ? chalk.italic(' without comment line') : ''
      } from file ${chalk.underline(commentedFilename)}`,
    ),
  );

  return replacement;
}

function getLineNumber(text: string, index: number, lineEnding: string): number {
  return text.substring(0, index).split(lineEnding).length;
}

function detectLineEnding(sourceText: string): string {
  let rexp = new RegExp(/\r\n/);

  return rexp.test(sourceText) ? '\r\n' : '\n';
}

export async function embedme(sourceText: string, inputFilePath: string, options: EmbedmeOptions): Promise<string> {
  const log = logBuilder(options);

  log(chalk => chalk.magenta(`  Analysing ${chalk.underline(relative(process.cwd(), inputFilePath))}...`));

  /**
   * Match a codefence, capture groups around the file extension (optional) and first line starting with // (optional)
   */
  const codeFenceFinder: RegExp = /([ \t]*?)```([\s\S]*?)^[ \t]*?```/gm;

  /*
   * Detects line ending to use based on whether or not CRLF is detected in the source text.
   */
  const lineEnding = detectLineEnding(sourceText);

  const docPartials = [];

  let previousEnd = 0;

  let result: RegExpExecArray | null;
  while ((result = codeFenceFinder.exec(sourceText)) !== null) {
    const [codeFence, leadingSpaces] = result;
    const start = sourceText.substring(previousEnd, result.index);

    const extensionMatch = codeFence.match(/```(.*)/);

    const codeExtension = extensionMatch ? extensionMatch[1] : null;
    const splitFence = codeFence.split(lineEnding);
    const firstLine = splitFence.length >= 3 ? splitFence[1] : null;

    /**
     * Working out the starting line number is slightly complex as the logic differs depending on whether or not we are
     * writing to the file.
     */
    const startLineNumber = (() => {
      if (options.dryRun || options.stdout || options.verify) {
        return getLineNumber(sourceText.substring(0, result.index), result.index, lineEnding);
      }
      const startingLineNumber = docPartials.join('').split(lineEnding).length - 1;
      return (
        startingLineNumber + getLineNumber(sourceText.substring(previousEnd, result.index), result.index, lineEnding)
      );
    })();

    const commentInsertion = start.match(/<!--\s*?embedme[ ]+?(\S+?)\s*?-->/);

    const replacement: string = await getReplacement(
      //const replacement = await getReplacement(
      inputFilePath,
      options,
      log,
      codeFence,
      leadingSpaces,
      lineEnding,
      codeExtension as SupportedFileType,
      firstLine || '',
      startLineNumber,
      /<!--\s*?embedme[ -]ignore-next\s*?-->/g.test(start),
      commentInsertion ? commentInsertion[1] : undefined,
    );

    docPartials.push(start, replacement);
    previousEnd = codeFenceFinder.lastIndex;
  }

  return [...docPartials].join('') + sourceText.substring(previousEnd);
}
