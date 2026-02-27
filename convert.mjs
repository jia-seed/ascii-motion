import sharp from 'sharp';

const ASCII_RAMP = '@#%&$8BWM*oahkbdpqwmZO0QLCJUYXzcvunxrjft/|()1{}[]?-_+~<>i!lI;:,"^`. ';
const RAMP_LEN = ASCII_RAMP.length;

// pre-compute brightness -> ramp index lookup (0-255 -> ramp index)
const BRIGHTNESS_TO_RAMP = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  BRIGHTNESS_TO_RAMP[i] = Math.floor(((255 - i) / 255) * (RAMP_LEN - 1));
}

// only these chars need XML escaping in our ramp
const XML_ESCAPE = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

function escapeXml(char) {
  return XML_ESCAPE[char] ?? char;
}

// luminance coefficients as integers for faster calc (x1000)
const R_COEF = 299;
const G_COEF = 587;
const B_COEF = 114;

function computeBackgroundBrightness(pixels, imgWidth, imgHeight, cellWidth, cellHeight) {
  let total = 0;
  let count = 0;
  
  // sample corners more efficiently - just sample a subset of pixels
  const sampleStep = Math.max(1, Math.floor(cellWidth / 2));
  const corners = [
    [0, 0],
    [imgWidth - cellWidth, 0],
    [0, imgHeight - cellHeight],
    [imgWidth - cellWidth, imgHeight - cellHeight],
  ];
  
  for (const [cx, cy] of corners) {
    const endY = Math.min(cy + cellHeight, imgHeight);
    const endX = Math.min(cx + cellWidth, imgWidth);
    for (let y = cy; y < endY; y += sampleStep) {
      const rowOffset = y * imgWidth;
      for (let x = cx; x < endX; x += sampleStep) {
        if (x < 0) continue;
        const idx = (rowOffset + x) << 2; // * 4
        total += R_COEF * pixels[idx] + G_COEF * pixels[idx + 1] + B_COEF * pixels[idx + 2];
        count++;
      }
    }
  }
  return count > 0 ? total / count / 1000 : 128;
}

/**
 * convert an image file to an ascii svg.
 *
 * @param {string} imagePath - path to the image file (png, jpg, gif, webp)
 * @param {object} [options]
 * @param {number} [options.cellWidth=6] - cell width in px (smaller = more detail)
 * @param {number} [options.cellHeight] - cell height in px (default: cellWidth * 1.5)
 * @param {number} [options.maxWidth=120] - max columns of ascii output
 * @param {number} [options.fontSize=8] - font size in the svg
 * @param {number} [options.coverageThreshold=0.3] - min cell coverage to place a character (0-1)
 * @param {string} [options.color='#d4d4d4'] - fill color for ascii characters
 * @returns {Promise<{ svg: string, cells: number, gridCols: number, gridRows: number }>}
 */
export async function imageToAsciiSvg(imagePath, options = {}) {
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
  const bgThreshold = 30 * 1000; // pre-multiply for integer comparison

  // pre-calculate threshold as pixel count
  const cellPixelCount = cellWidth * actualCellHeight;
  const minCoveredPixels = Math.floor(coverageThreshold * cellPixelCount);

  // group cells by row for efficient SVG output
  const rows = new Array(gridRows);
  for (let i = 0; i < gridRows; i++) {
    rows[i] = [];
  }

  let totalCells = 0;

  for (let row = 0; row < gridRows; row++) {
    const startY = row * actualCellHeight;
    const endY = Math.min(startY + actualCellHeight, imgHeight);
    const rowCells = rows[row];

    for (let col = 0; col < gridCols; col++) {
      const startX = col * cellWidth;
      const endX = Math.min(startX + cellWidth, imgWidth);

      let totalBrightness = 0;
      let coveredPixels = 0;
      let pixelCount = 0;

      for (let y = startY; y < endY; y++) {
        const rowOffset = y * imgWidth;
        for (let x = startX; x < endX; x++) {
          const idx = (rowOffset + x) << 2;
          const r = pixels[idx];
          const g = pixels[idx + 1];
          const b = pixels[idx + 2];
          const a = pixels[idx + 3];
          
          // brightness * 1000 for integer math
          const brightness = R_COEF * r + G_COEF * g + B_COEF * b;
          totalBrightness += brightness;
          pixelCount++;

          if (a > 128) {
            const diff = brightness - bgBrightness * 1000;
            if (diff > bgThreshold || diff < -bgThreshold) {
              coveredPixels++;
            }
          }
        }
      }

      if (coveredPixels < minCoveredPixels) continue;

      const avgBrightness = Math.floor(totalBrightness / pixelCount / 1000);
      const clampedBrightness = avgBrightness < 0 ? 0 : avgBrightness > 255 ? 255 : avgBrightness;
      const char = ASCII_RAMP[BRIGHTNESS_TO_RAMP[clampedBrightness]];
      
      if (char === ' ') continue;

      rowCells.push({ char, col });
      totalCells++;
    }
  }

  const svgWidth = gridCols * cellWidth;
  const svgHeight = gridRows * actualCellHeight;

  // build SVG using array accumulation (faster than string concatenation)
  const svgParts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">`,
    `<style>text{font-family:monospace;font-size:${fontSize}px;fill:${color}}</style>`,
  ];

  // output one <text> per row with positioned <tspan> elements
  // this reduces SVG element count dramatically
  for (let row = 0; row < gridRows; row++) {
    const rowCells = rows[row];
    if (rowCells.length === 0) continue;

    const y = (row + 1) * actualCellHeight;
    
    if (rowCells.length === 1) {
      // single char, no need for tspan
      const cell = rowCells[0];
      svgParts.push(`<text x="${cell.col * cellWidth}" y="${y}">${escapeXml(cell.char)}</text>`);
    } else {
      // multiple chars - use tspans
      const tspans = [];
      for (const cell of rowCells) {
        tspans.push(`<tspan x="${cell.col * cellWidth}">${escapeXml(cell.char)}</tspan>`);
      }
      svgParts.push(`<text y="${y}">${tspans.join('')}</text>`);
    }
  }

  svgParts.push('</svg>');

  return { svg: svgParts.join('\n'), cells: totalCells, gridCols, gridRows };
}
