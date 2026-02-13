import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join } from 'path';

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
    cellHeight = 9,
    maxWidth = 120,
    fontSize = 8,
    coverageThreshold = 0.3,
    color = '#d4d4d4',
  } = options;

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
  const gridRows = Math.floor(imgHeight / cellHeight);

  const bgBrightness = computeBackgroundBrightness(pixels, imgWidth, imgHeight, cellWidth, cellHeight);

  const cells = [];

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const startX = col * cellWidth;
      const startY = row * cellHeight;

      let totalBrightness = 0;
      let coveredPixels = 0;
      let totalPixels = 0;

      for (let y = startY; y < startY + cellHeight && y < imgHeight; y++) {
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
        y: startY + cellHeight,
        brightness: avgBrightness,
      });
    }
  }

  const svgWidth = gridCols * cellWidth;
  const svgHeight = gridRows * cellHeight;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">\n`;
  svg += `  <style>text { font-family: monospace; font-size: ${fontSize}px; fill: ${color}; }</style>\n`;

  for (const cell of cells) {
    svg += `  <text x="${cell.x}" y="${cell.y}">${escapeXml(cell.char)}</text>\n`;
  }

  svg += `</svg>`;

  return svg;
}

const publicDir = join(import.meta.dirname, '..', 'public');

const images = [
  { file: 'dragon.png', output: 'ascii-dragon.svg' },
  { file: 'mistukicomputer.jpg', output: 'ascii-mitsuki.svg' },
  { file: 'rubiks.webp', output: 'ascii-rubiks.svg' },
  { file: 'westwood.jpg', output: 'ascii-westwood.svg' },
];

for (const { file, output } of images) {
  const inputPath = join(publicDir, file);
  const outputPath = join(publicDir, output);
  console.log(`Converting ${file} -> ${output}...`);
  const svg = await imageToAsciiSvg(inputPath);
  writeFileSync(outputPath, svg);
  console.log(`  Done.`);
}

console.log('All conversions complete.');
