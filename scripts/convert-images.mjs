#!/usr/bin/env node

import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { basename, extname, resolve } from 'path';
import { parseArgs } from 'node:util';

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

// ─── ASCII conversion ───
const ASCII_RAMP = '@#%&$8BWM*oahkbdpqwmZO0QLCJUYXzcvunxrjft/|()1{}[]?-_+~<>i!lI;:,"^`. ';

const XML_ESCAPE = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

function escapeXml(char) {
  return XML_ESCAPE[char] ?? char;
}

function computeBackgroundBrightness(pixels, imgWidth, imgHeight, cellWidth, cellHeight) {
  let total = 0;
  let count = 0;
  const corners = [
    { x: 0, y: 0 },
    { x: imgWidth - cellWidth, y: 0 },
    { x: 0, y: imgHeight - cellHeight },
    { x: imgWidth - cellWidth, y: imgHeight - cellHeight },
  ];
  for (const corner of corners) {
    for (let y = corner.y; y < corner.y + cellHeight && y < imgHeight; y++) {
      for (let x = corner.x; x < corner.x + cellWidth && x < imgWidth; x++) {
        if (x < 0) continue;
        const idx = (y * imgWidth + x) * 4;
        total += 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
        count++;
      }
    }
  }
  return count > 0 ? total / count : 128;
}

async function imageToAsciiSvg(imagePath, options = {}) {
  const {
    cellWidth = 6,
    cellHeight,
    maxWidth = 120,
    fontSize = 8,
    coverageThreshold = 0.3,
    color = '#d4d4d4',
  } = options;

  const actualCellHeight = cellHeight ?? Math.round(cellWidth * 1.5);

  const image = sharp(imagePath);
  const metadata = await image.metadata();
  let imgWidth = metadata.width;
  let imgHeight = metadata.height;

  const cols = Math.floor(imgWidth / cellWidth);
  if (cols > maxWidth) {
    const scale = maxWidth / cols;
    imgWidth = Math.floor(imgWidth * scale);
    imgHeight = Math.floor(imgHeight * scale);
  }

  const { data: pixels } = await image
    .resize(imgWidth, imgHeight, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const gridCols = Math.floor(imgWidth / cellWidth);
  const gridRows = Math.floor(imgHeight / actualCellHeight);

  const bgBrightness = computeBackgroundBrightness(pixels, imgWidth, imgHeight, cellWidth, actualCellHeight);

  const cells = [];

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const startX = col * cellWidth;
      const startY = row * actualCellHeight;

      let totalBrightness = 0;
      let coveredPixels = 0;
      let totalPixels = 0;

      for (let y = startY; y < startY + actualCellHeight && y < imgHeight; y++) {
        for (let x = startX; x < startX + cellWidth && x < imgWidth; x++) {
          const idx = (y * imgWidth + x) * 4;
          const r = pixels[idx];
          const g = pixels[idx + 1];
          const b = pixels[idx + 2];
          const a = pixels[idx + 3];
          const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

          totalBrightness += brightness;
          totalPixels++;

          if (a > 128 && Math.abs(brightness - bgBrightness) > 30) {
            coveredPixels++;
          }
        }
      }

      const coverage = coveredPixels / totalPixels;
      if (coverage < coverageThreshold) continue;

      const avgBrightness = totalBrightness / totalPixels;
      const normalizedBrightness = Math.max(0, Math.min(255, avgBrightness));
      const rampIndex = Math.floor(
        ((255 - normalizedBrightness) / 255) * (ASCII_RAMP.length - 1)
      );
      const char = ASCII_RAMP[rampIndex];
      if (char === ' ') continue;

      cells.push({
        char,
        x: startX,
        y: startY + actualCellHeight,
        brightness: avgBrightness,
      });
    }
  }

  const svgWidth = gridCols * cellWidth;
  const svgHeight = gridRows * actualCellHeight;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">\n`;
  svg += `  <style>text { font-family: monospace; font-size: ${fontSize}px; fill: ${color}; }</style>\n`;

  for (const cell of cells) {
    svg += `  <text x="${cell.x}" y="${cell.y}">${escapeXml(cell.char)}</text>\n`;
  }

  svg += `</svg>`;

  return { svg, cells: cells.length, gridCols, gridRows };
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
