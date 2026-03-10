import sharp from 'sharp';

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

  const cellList = [];

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

      cellList.push({
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

  for (const cell of cellList) {
    svg += `  <text x="${cell.x}" y="${cell.y}">${escapeXml(cell.char)}</text>\n`;
  }

  svg += `</svg>`;

  return { svg, cells: cellList.length, gridCols, gridRows };
}
