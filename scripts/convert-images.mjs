#!/usr/bin/env node

import { writeFileSync } from 'fs';
import { basename, extname, resolve } from 'path';
import { parseArgs } from 'node:util';
import { imageToAsciiSvg } from '../convert.mjs';

// ─── CLI ───
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    output: { type: 'string', short: 'o', description: 'Output SVG path (default: <input>.svg)' },
    density: { type: 'string', short: 'd', default: '6', description: 'Cell width in px (smaller = more detail)' },
    color: { type: 'string', short: 'c', default: '#d4d4d4', description: 'Fill color for ASCII characters' },
    'max-width': { type: 'string', short: 'w', default: '120', description: 'Max columns of ASCII output' },
    'font-size': { type: 'string', short: 'f', default: '8', description: 'Font size in SVG' },
    threshold: { type: 'string', short: 't', default: '0.3', description: 'Coverage threshold (0-1)' },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (values.help || positionals.length === 0) {
  console.log(`
ascii-motion convert — turn any image into an ASCII SVG

Usage:
  node scripts/convert-images.mjs <input> [options]
  npm run convert -- <input> [options]

Arguments:
  <input>              Image file (png, jpg, gif, webp)

Options:
  -o, --output <path>  Output SVG path (default: <input-name>.svg)
  -d, --density <n>    Cell width in px, smaller = more detail (default: 6)
  -c, --color <hex>    Fill color for characters (default: #d4d4d4)
  -w, --max-width <n>  Max columns of ASCII output (default: 120)
  -f, --font-size <n>  Font size in the SVG (default: 8)
  -t, --threshold <n>  Coverage threshold 0-1 (default: 0.3)
  -h, --help           Show this help

Examples:
  node scripts/convert-images.mjs photo.png
  node scripts/convert-images.mjs photo.png -o public/ascii-photo.svg -d 4 -c "#ffffff"
  npm run convert -- photo.png -d 3 --color "#00ff00"
`);
  process.exit(0);
}

// ─── Run ───
const inputPath = resolve(positionals[0]);
const cellWidth = parseInt(values.density);
const defaultOutput = basename(inputPath, extname(inputPath)) + '.svg';
const outputPath = resolve(values.output || defaultOutput);

console.log(`Converting ${basename(inputPath)}...`);
console.log(`  density: ${cellWidth}px  color: ${values.color}  max-width: ${values['max-width']} cols`);

const { svg, cells, gridCols, gridRows } = await imageToAsciiSvg(inputPath, {
  cellWidth,
  maxWidth: parseInt(values['max-width']),
  fontSize: parseInt(values['font-size']),
  coverageThreshold: parseFloat(values.threshold),
  color: values.color,
});

writeFileSync(outputPath, svg);
console.log(`  ${cells} characters in ${gridCols}x${gridRows} grid`);
console.log(`  Saved to ${outputPath}`);
