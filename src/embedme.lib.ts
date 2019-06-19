import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import chalk from 'chalk';

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
  RUST = 'rs',
  JAVA = 'java',
  CPP = 'cpp',
  C = 'c',
  HTML = 'html',
  XML = 'xml',
  MARKDOWN = 'md',
  YAML = 'yaml',
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
}

enum CommentFamily {
  C,
  XML,
  HASH,
}

const languageMap: Record<CommentFamily, SupportedFileType[]> = {
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
  ],
  [CommentFamily.XML]: [SupportedFileType.HTML, SupportedFileType.MARKDOWN, SupportedFileType.XML],
  [CommentFamily.HASH]: [
    SupportedFileType.PYTHON,
    SupportedFileType.BASH,
    SupportedFileType.SHELL,
    SupportedFileType.YAML,
    SupportedFileType.RUBY,
  ],
};

const filetypeCommentReaders: Record<CommentFamily, FilenameFromCommentReader> = {
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

/**
 * Match a codefence, capture groups around the file extension (optional) and first line starting with // (optional)
 */
const codeFenceMatcher: RegExp = /```([\S]*)$\n([\s\S]*?$)?([\s\S]*?)\n?```/gm;

export function embedme(sourceText: string, inputFilePath: string, options: EmbedmeOptions): string {
  const log = logBuilder(options);

  log(chalk.magenta(`  Analysing ${chalk.underline(inputFilePath)}...`));

  return sourceText.replace(
    codeFenceMatcher,
    (substr: string, codeExtension: SupportedFileType, firstLine?: string) => {
      if (!firstLine || !codeExtension) {
        return substr;
      }

      const supportedFileTypes: SupportedFileType[] = Object.values(SupportedFileType).filter(
        x => typeof x === 'string',
      );

      if (supportedFileTypes.indexOf(codeExtension) < 0) {
        log(
          chalk.yellow(
            `    Unsupported file extension [${codeExtension}], supported extensions are ${supportedFileTypes.join(
              ', ',
            )}, skipping code block`,
          ),
        );
        return substr;
      }

      const languageFamily: CommentFamily | null = lookupLanguageCommentFamily(codeExtension);

      if (languageFamily == null) {
        log(
          chalk.red(
            `    File extension ${chalk.underline(
              codeExtension,
            )} marked as supported, but comment family could not be determined. Please report this issue.`,
          ),
        );
        return substr;
      }

      const commentedFilename = filetypeCommentReaders[languageFamily](firstLine);

      if (!commentedFilename) {
        log(chalk.gray(`    No comment detected in first line for block with extension ${codeExtension}`));
        return substr;
      }

      const matches = commentedFilename.match(/\s?(\S+?\.\S+?)((#L(\d+)-L(\d+))|$)/m);

      if (!matches) {
        log(chalk.gray(`    No file found in first comment block`));
        return substr;
      }

      const [, filename, , lineNumbering, startLine, endLine] = matches;
      if (filename.includes('#')) {
        log(
          chalk.red(
            `    Incorrectly formatted line numbering string ${chalk.underline(
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
          chalk.red(
            `    Found filename ${chalk.underline(
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
          chalk.red(
            `    Output snippet for file ${chalk.underline(
              filename,
            )} contains a code fence. Refusing to embed as that would break the document`,
          ),
        );
        return substr;
      }

      log(
        chalk.green(
          `    Embedded code snippet (${chalk.bold(lines.length + ' lines')}) from file ${chalk.underline(
            commentedFilename,
          )}`,
        ),
      );

      if (options.stripEmbedComment) {
        return `\`\`\`${codeExtension}
${outputCode}
\`\`\``;
      }

      return `\`\`\`${codeExtension}
${firstLine}

${outputCode}
\`\`\``;
    },
  );
}
