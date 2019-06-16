import { existsSync, readFileSync } from 'fs';
import { extname, resolve } from 'path';

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

enum SupportedFileType {
  TYPESCRIPT = 'ts',
  HTML = 'html',
}

const filetypeCommentReaders: Record<SupportedFileType, FilenameFromCommentReader> = {
  [SupportedFileType.TYPESCRIPT]: line => {
    const match = line.match(/^\/\/\s?(\S*?$)/m);
    if (!match) {
      return null;
    }

    return match[1];
  },
  [SupportedFileType.HTML]: line => {
    const match = line.match(/<!--\s*?(\S*?)\s*?-->/);
    if (!match) {
      return null;
    }

    return match[1];
  },
};

/**
 * Match a codefence, capture groups around the file extension (optional) and first line starting with // (optional)
 */
const codeFenceMatcher: RegExp = /```([\S]*)$\n([\s\S]*?$)?([\s\S]*?)\n?```/gm;

export function embedme(sourceText: string, inputFilePath: string): string {
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
        console.warn(
          `Unsupported file extension [${codeExtension}], supported extensions are ${supportedFileTypes.join(
            ', ',
          )}, skipping code block`,
        );
        return substr;
      }

      const commentedFilename = filetypeCommentReaders[codeExtension](firstLine);

      if (!commentedFilename) {
        return substr;
      }

      const matches = commentedFilename.match(/\s?(\S+?)((#L(\d+)-L(\d+))|$)/m);

      if (!matches) {
        return substr;
      }

      const [, filename, , lineNumbering, startLine, endLine] = matches;
      if (filename.includes('#')) {
        console.warn(`Incorrectly formatted line numbering string ${filename}, Expecting Github formatting e.g. #L10-L20`);
        return substr;
      }

      const relativePath = resolve(inputFilePath, '..', filename);

      if (!existsSync(relativePath)) {
        console.warn(`Found filename ${filename} in comment in first line, but file does not exist at that location!`);
        return substr;
      }

      const extension = extname(filename).slice(1);
      const file = readFileSync(relativePath, 'utf8');

      let lines = file.split('\n');
      if (lineNumbering) {
        lines = lines.slice(+startLine - 1, +endLine);
      }

      const minimumLeadingSpaces = lines.reduce((minSpaces: number, line: string) => {
        if (minSpaces === 0) {
          return 0;
        }

        const leadingSpaces = line.match(/^[\s]+/m);

        if (!leadingSpaces) {
          return 0;
        }

        return Math.min(minSpaces, leadingSpaces[0].length);
      }, Infinity);

      lines = lines.map(line => line.slice(minimumLeadingSpaces));

      const outputCode = lines.join('\n');

      return `\`\`\`${extension}
${firstLine}

${outputCode}
  \`\`\``;
    },
  );
}
