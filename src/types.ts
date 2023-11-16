export const destinationSnippetRegExp: RegExp = /<!--\s*tableStart.*-->(.|\s)*?<!--\ *tableEnd\ *-->/g;;
export const destinationSnippetHeaderRegExp: RegExp = /<!--\ *tableStart.*-->/m;
export const destinationSnippetFooterRegExp: RegExp = /<!--\ *tableEnd.*-->/m;
export const sourceTableFileRegExp: RegExp = /\S+\.table\.md/;
export const tableHeaderLineNumberRegExp: RegExp = /#H(\d+)/;
export const tableBodyLineNumbersRegExp: RegExp = /#L\d+-L\d+/g;

export interface Options {
  sourceRoot: string;
  dryRun: boolean;
  verify: boolean;
  silent: boolean;
  stdout: boolean;
}

export type ReplacementConfig = {
  substr: string;
  returnCharacter: string;
  startLineNumber: number;
  inputFilePath: string;
  sourceRoot: string;
};
