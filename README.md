# Embedme

Simple utility to embed source files into markdown code blocks <sup>[why tho?](#why)</sup>

[![npm version](https://badge.fury.io/js/embedme.svg)](https://www.npmjs.com/package/embedme)
[![Build Status](https://travis-ci.org/zakhenry/embedme.svg?branch=master)](https://travis-ci.org/zakhenry/embedme)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](https://commitizen.github.io/cz-cli/)

## Quickstart

With a `README.md` in you current working directory, add a code block for one of the
[supported file types](supported-file-types-so-far) and start the code block simply with a comment with the path to a
file. For example

    This is a *markdown* document with a code block:

    ```ts
    <!-- example.ts -->
    ```

Next, run the following

```bash
npx embedme README.md
```

Et voilà! Your README.md file will be updated with the content of your source file:

    This is a *markdown* document with a code block:

    ```ts
    <!-- example.ts -->
    export function hello(name: string): string {
      return `Hello ${name}!, how are you today?`;
    }
    ```

As the comment is preserved, you can happily re-run `embedme` and it will run again but there will be no changes.

## Features

### Multi Language

`embedme` simply uses the file type hint in a code fence to choose a strategy for finding the commented filename in the
first line of the code block. This is a relatively trivial regular expression, so many more languages can be supported
in future

### Supported File Types (so far!)

Here's a list of file types supported by this utility, it is sure to grow as I need it but if you have a need for
another language please feel free to contribute, it is easy!

```ts
// src/embedme.lib.ts#L34-L38

enum SupportedFileType {
  TYPESCRIPT = 'ts',
  HTML = 'html',
  MARKDOWN = 'md',
}
```

### Partial Snippets

Very often you only want to highlight a small part of a file, to do so simply suffix the filename with the Gitlab line
number syntax, e.g. `path/to/my/file.ts#L20-30`.

## Why?

> Why do I want this utility? Writing code in a markdown document is not difficult?

True, however it is difficult to know when your documentation files become out of date - if you're introducing a
breaking change, having your example code _actually using your library_ guarantees it will be correct.

> How can just having my examples in the language give me guarantees?

For starters if you're using a typesafe language (e.g. Typescript) you will get compiler errors, and secondarily you
really should be writing unit tests on your example code. As simple as it might be, how embarrassing is it if your
example doesn't even work?!

## Future features

Feel free to raise a PR for any of these items!

- Tests for this repo to verify behavior & guard against regression
- Glob syntax support for embedding into multiple files at once
- Nicer console output (colours etc)
- Proper documentation in cli, i.e. `embedme --help` should give a nice info page
- Helper methods to verify no changes to readme in CI (this will be helpful to prevent people who don't know the code source
  is outside the readme)
- Blog post!
