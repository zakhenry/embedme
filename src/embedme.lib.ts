import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import { relative, resolve } from 'path';

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
}

enum CommentFamily {
  NONE, // some languages do not support comments, e.g. JSON
  C,
  XML,
  HASH,
  SINGLE_QUOTE,
}

const languageMap: Record<CommentFamily, SupportedFileType[]> = {
  [CommentFamily.NONE]: [SupportedFileType.JSON],
  [CommentFamily.C]: [
    SupportedFileType.PLAIN_TEXT, // this is a lie, but we gotta pick something
    SupportedFileType.C,
    SupportedFileType.TYPESCRIPT,
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
  ],
  [CommentFamily.XML]: [SupportedFileType.HTML, SupportedFileType.MARKDOWN, SupportedFileType.XML],
  [CommentFamily.HASH]: [
    SupportedFileType.PYTHON,
    SupportedFileType.BASH,
    SupportedFileType.SHELL,
    SupportedFileType.YAML,
    SupportedFileType.RUBY,
    SupportedFileType.CRYSTAL,
  ],
  [CommentFamily.SINGLE_QUOTE]: [SupportedFileType.PLANT_UML],
};

const filetypeCommentReaders: Record<CommentFamily, FilenameFromCommentReader> = {
  [CommentFamily.NONE]: _ => null,
  [CommentFamily.C]: line => {
    const match = line.match(/\/\/\s?(\S*?$)/m);
    if (!match) {
      return null;
    }

    return match[1];
  },
  [CommentFamily.XML]: line => {
    const match = line.match(/<!--\s*?(\S*?)\s*?-->/);
    if (!match) {
      return null;
    }

    return match[1];
  },
  [CommentFamily.HASH]: line => {
    const match = line.match(/#\s*?(\S*?)$/);
    if (!match) {
      return null;
    }

    return match[1];
  },
  [CommentFamily.SINGLE_QUOTE]: line => {
    const match = line.match(/'\s*?(\S*?)$/);
    if (!match) {
      return null;
    }

    return match[1];
  },
};

function lookupLanguageCommentFamily(fileType: SupportedFileType): CommentFamily | null {
  return Object.values(CommentFamily)
    .filter(x => typeof x === 'number')
    .find((commentFamily: CommentFamily) => languageMap[commentFamily].includes(fileType));
}

export const logBuilder = (options: EmbedmeOptions) => (...messages: string[]) => {
  if (!options.silent) {
    if (options.stdout) {
      // as we're putting the resulting file out of stdout, we redirect the logs to stderr so they can still be seen,
      // but won't be piped
      console.error(...messages);
    } else {
      console.log(...messages);
    }
  }
};

/* @internal */
function getReplacement(
  inputFilePath: string,
  options: EmbedmeOptions,
  logMethod: ReturnType<typeof logBuilder>,
  substr: string,
  leadingSpaces: string,
  codeExtension: SupportedFileType,
  firstLine: string,
  startLineNumber: number,
  ignoreNext: boolean,
  commentEmbedOverrideFilepath?: string,
): string {
  /**
   * Re-declare the log class, prefixing each snippet with the file and line number
   * Note that we couldn't have derived the line count in the parent regex matcher, as we don't yet know how long the
   * embed is going to be.
   */
  const log = ({ returnSnippet }: { returnSnippet: string }, ...messages: string[]) => {
    const endLineNumber = returnSnippet.split('\n').length + startLineNumber - 1;

    const logPrefix = chalk.gray(`   ${relative(process.cwd(), inputFilePath)}#L${startLineNumber}-L${endLineNumber}`);

    logMethod(logPrefix, ...messages);
  };

  if (!codeExtension) {
    log({ returnSnippet: substr }, chalk.blue(`No code extension detected, skipping code block...`));
    return substr;
  }

  if (!firstLine && !commentEmbedOverrideFilepath) {
    log({ returnSnippet: substr }, chalk.blue(`Code block is empty & no preceding embedme comment, skipping...`));
    return substr;
  }

  if (ignoreNext) {
    log({ returnSnippet: substr }, chalk.blue(`"Ignore next" comment detected, skipping code block...`));
    return substr;
  }

  const supportedFileTypes: SupportedFileType[] = Object.values(SupportedFileType).filter(x => typeof x === 'string');

  if (supportedFileTypes.indexOf(codeExtension) < 0) {
    log(
      { returnSnippet: substr },
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
    log(
      { returnSnippet: substr },
      chalk.red(
        `File extension ${chalk.underline(
          codeExtension,
        )} marked as supported, but comment family could not be determined. Please report this issue.`,
      ),
    );
    return substr;
  }

  const commentedFilename = commentEmbedOverrideFilepath || filetypeCommentReaders[languageFamily](firstLine);

  if (!commentedFilename) {
    log(
      { returnSnippet: substr },
      chalk.gray(`No comment detected in first line for block with extension ${codeExtension}`),
    );
    return substr;
  }

  const matches = commentedFilename.match(/\s?(\S+?)((#L(\d+)-L(\d+))|$)/m);

  if (!matches) {
    log({ returnSnippet: substr }, chalk.gray(`No file found in first comment block`));
    return substr;
  }

  const [, filename, , lineNumbering, startLine, endLine] = matches;
  if (filename.includes('#')) {
    log(
      { returnSnippet: substr },
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

  if (!existsSync(relativePath)) {
    log(
      { returnSnippet: substr },
      chalk.red(
        `Found filename ${chalk.underline(
          filename,
        )} in comment in first line, but file does not exist at ${chalk.underline(relativePath)}!`,
      ),
    );
    return substr;
  }

  const file = readFileSync(relativePath, 'utf8');

  let lines = file.split('\n');
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

  const outputCode = lines.join('\n');

  if (/```/.test(outputCode)) {
    log(
      { returnSnippet: substr },
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
      ? `\`\`\`${codeExtension}\n${outputCode}\n\`\`\``
      : `\`\`\`${codeExtension}\n${firstLine.trim()}\n\n${outputCode}\n\`\`\``;

  if (leadingSpaces.length) {
    replacement = replacement
      .split('\n')
      .map(line => leadingSpaces + line)
      .join('\n');
  }

  if (replacement === substr) {
    log({ returnSnippet: substr }, chalk.gray(`No changes required, already up to date`));
    return substr;
  }

  if (replacement.slice(0, -3).trimRight() === substr.slice(0, -3).trimRight()) {
    log({ returnSnippet: substr }, chalk.gray(`Changes are trailing whitespace only, ignoring`));
    return substr;
  }

  const chalkColour = options.verify ? 'red' : 'green';

  log(
    { returnSnippet: replacement },
    chalk[chalkColour](
      `Embedded ${chalk[(chalkColour + 'Bright') as 'greenBright'](
        lines.length + ' lines',
      )} from file ${chalk.underline(commentedFilename)}`,
    ),
  );

  return replacement;
}

function getLineNumber(text: string, index: number): number {
  return text.substring(0, index).split('\n').length;
}

export function embedme(sourceText: string, inputFilePath: string, options: EmbedmeOptions): string {
  const log = logBuilder(options);

  log(chalk.magenta(`  Analysing ${chalk.underline(relative(process.cwd(), inputFilePath))}...`));

  /**
   * Match a codefence, capture groups around the file extension (optional) and first line starting with // (optional)
   */
  const codeFenceFinder: RegExp = /([ \t]*?)```([\s\S]*?)^[ \t]*?```/gm;

  const docPartials = [];

  let previousEnd = 0;

  let result: RegExpExecArray | null;
  while ((result = codeFenceFinder.exec(sourceText)) !== null) {
    const [codeFence, leadingSpaces] = result;
    const start = sourceText.substring(previousEnd, result.index);

    const extensionMatch = codeFence.match(/```(\S*)/);

    const codeExtension = extensionMatch ? extensionMatch[1] : null;
    const splitFence = codeFence.split('\n');
    const firstLine = splitFence.length >= 3 ? splitFence[1] : null;

    /**
     * Working out the starting line number is slightly complex as the logic differs depending on whether or not we are
     * writing to the file.
     */
    const startLineNumber = (() => {
      if (options.dryRun || options.stdout || options.verify) {
        return getLineNumber(sourceText.substring(0, result.index), result.index);
      }
      const startingLineNumber = docPartials.join('').split('\n').length - 1;
      return startingLineNumber + getLineNumber(sourceText.substring(previousEnd, result.index), result.index);
    })();

    const commentInsertion = start.match(/<!--\s*?embedme[ ]+?(\S+?)\s*?-->/);

    const replacement = getReplacement(
      inputFilePath,
      options,
      log,
      codeFence,
      leadingSpaces,
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
