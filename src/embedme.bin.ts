#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { embedme } from './embedme.lib';

const [, , /*proc*/ /*thisFile*/ source] = process.argv;

const sourceText = readFileSync(source, 'utf-8');

const resolvedPath = resolve(source);

const outText = embedme(sourceText, resolvedPath);
writeFileSync(source, outText);
