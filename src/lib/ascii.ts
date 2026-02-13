// ascii character ramp from dense to light
const ASCII_RAMP = '@#%&$8BWM*oahkbdpqwmZO0QLCJUYXzcvunxrjft/|()1{}[]?-_+~<>i!lI;:,"^`. ';

// characters that need xml escaping in svg
const XML_ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

function escapeXml(char: string): string {
  return XML_ESCAPE[char] ?? char;
}

export interface AsciiOptions {
  cellWidth?: number;
  cellHeight?: number;
  maxWidth?: number;
  fontSize?: number;
  coverageThreshold?: number;
  color?: string;
  removeBackground?: boolean;
}

export interface AsciiCell {
  char: string;
  x: number;
  y: number;
  brightness: number;
}

export interface AsciiSvgResult {
  svg: string;
  cells: AsciiCell[];
  svgWidth: number;
  svgHeight: number;
  gridCols: number;
  gridRows: number;
}

/**
 * converts an image to an svg with individual <text> elements.
 *
 * divides the image into a grid of cells (~6px wide, 9px tall at font-size 8).
 * for each cell, measures average brightness. if enough of the cell is covered
 * (>30% non-background pixels), places a single <text> element with an ascii
 * character. denser/brighter areas get heavier characters like @#%&, while
 * edge/thinner areas get lighter ones like =:.
 */
export function imageToAsciiSvg(
  img: HTMLImageElement,
  options: AsciiOptions = {}
): AsciiSvgResult {
  const {
    cellWidth = 6,
    cellHeight = 9,
    maxWidth = 120,
    fontSize = 8,
    coverageThreshold = 0.3,
    color = '#d4d4d4',
    removeBackground = false,
  } = options;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // scale image so ascii output doesn't exceed maxWidth columns
  let imgWidth = img.naturalWidth;
  let imgHeight = img.naturalHeight;
  const cols = Math.floor(imgWidth / cellWidth);
  if (cols > maxWidth) {
    const scale = maxWidth / cols;
    imgWidth = Math.floor(imgWidth * scale);
    imgHeight = Math.floor(imgHeight * scale);
  }

  canvas.width = imgWidth;
  canvas.height = imgHeight;
  ctx.drawImage(img, 0, 0, imgWidth, imgHeight);

  const imageData = ctx.getImageData(0, 0, imgWidth, imgHeight);
  const pixels = imageData.data;

  // when removeBackground is enabled, detect background color from edges
  // and make matching pixels transparent so they get filtered out
  if (removeBackground) {
    const bgColor = sampleBackgroundColor(pixels, imgWidth, imgHeight);
    const threshold = 50; // color distance threshold
    for (let i = 0; i < pixels.length; i += 4) {
      const dr = pixels[i] - bgColor.r;
      const dg = pixels[i + 1] - bgColor.g;
      const db = pixels[i + 2] - bgColor.b;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);
      if (dist < threshold) {
        pixels[i + 3] = 0; // set alpha to 0
      }
    }
  }

  const gridCols = Math.floor(imgWidth / cellWidth);
  const gridRows = Math.floor(imgHeight / cellHeight);

  // compute background brightness (average of corner cells)
  const bgBrightness = computeBackgroundBrightness(
    pixels, imgWidth, imgHeight, cellWidth, cellHeight
  );

  const cells: AsciiCell[] = [];

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

          // pixel is "covered" if it differs enough from background
          // and is not fully transparent
          if (a > 128 && Math.abs(brightness - bgBrightness) > 30) {
            coveredPixels++;
          }
        }
      }

      const coverage = coveredPixels / totalPixels;

      // only place a character if enough of the cell is covered (>30%)
      if (coverage < coverageThreshold) continue;

      const avgBrightness = totalBrightness / totalPixels;

      // map brightness to ascii character
      // invert: darker areas -> denser characters
      const normalizedBrightness = Math.max(0, Math.min(255, avgBrightness));
      const rampIndex = Math.floor(
        ((255 - normalizedBrightness) / 255) * (ASCII_RAMP.length - 1)
      );
      const char = ASCII_RAMP[rampIndex];

      if (char === ' ') continue;

      cells.push({
        char,
        x: startX,
        y: startY + cellHeight, // svg text y is baseline
        brightness: avgBrightness,
      });
    }
  }

  // build svg string with individual <text> elements
  const svgWidth = gridCols * cellWidth;
  const svgHeight = gridRows * cellHeight;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">\n`;
  svg += `  <style>text { font-family: monospace; font-size: ${fontSize}px; fill: ${color}; }</style>\n`;

  for (const cell of cells) {
    svg += `  <text x="${cell.x}" y="${cell.y}">${escapeXml(cell.char)}</text>\n`;
  }

  svg += `</svg>`;

  return { svg, cells, svgWidth, svgHeight, gridCols, gridRows };
}

/**
 * generates animation frames by varying characters slightly
 */
export function createAsciiSvgAnimation(
  baseResult: AsciiSvgResult,
  frameCount: number = 8,
  options: { fontSize?: number; color?: string } = {}
): string[] {
  const { fontSize = 8, color = '#d4d4d4' } = options;
  const frames: string[] = [baseResult.svg];

  for (let f = 1; f < frameCount; f++) {
    const newCells = baseResult.cells.map((cell) => {
      // 15% chance to shift the character slightly
      if (Math.random() < 0.15) {
        const currentIdx = ASCII_RAMP.indexOf(cell.char);
        if (currentIdx >= 0) {
          const shift = Math.floor(Math.random() * 3) - 1;
          const newIdx = Math.max(
            0,
            Math.min(ASCII_RAMP.length - 1, currentIdx + shift)
          );
          const newChar = ASCII_RAMP[newIdx];
          if (newChar !== ' ') {
            return { ...cell, char: newChar };
          }
        }
      }
      return cell;
    });

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${baseResult.svgWidth}" height="${baseResult.svgHeight}" viewBox="0 0 ${baseResult.svgWidth} ${baseResult.svgHeight}">\n`;
    svg += `  <style>text { font-family: monospace; font-size: ${fontSize}px; fill: ${color}; }</style>\n`;

    for (const cell of newCells) {
      svg += `  <text x="${cell.x}" y="${cell.y}">${escapeXml(cell.char)}</text>\n`;
    }

    svg += `</svg>`;
    frames.push(svg);
  }

  return frames;
}

/**
 * sample background RGB color from the edges of the image
 */
function sampleBackgroundColor(
  pixels: Uint8ClampedArray,
  imgWidth: number,
  imgHeight: number
): { r: number; g: number; b: number } {
  let totalR = 0, totalG = 0, totalB = 0;
  let count = 0;
  const edgeSize = Math.max(8, Math.floor(Math.min(imgWidth, imgHeight) * 0.05));

  for (let y = 0; y < imgHeight; y++) {
    for (let x = 0; x < imgWidth; x++) {
      // only sample pixels along the edges
      if (x >= edgeSize && x < imgWidth - edgeSize && y >= edgeSize && y < imgHeight - edgeSize) continue;
      const idx = (y * imgWidth + x) * 4;
      if (pixels[idx + 3] < 128) continue; // skip transparent
      totalR += pixels[idx];
      totalG += pixels[idx + 1];
      totalB += pixels[idx + 2];
      count++;
    }
  }

  if (count === 0) return { r: 255, g: 255, b: 255 };
  return {
    r: Math.round(totalR / count),
    g: Math.round(totalG / count),
    b: Math.round(totalB / count),
  };
}

/**
 * estimate background brightness from the corners of the image
 */
function computeBackgroundBrightness(
  pixels: Uint8ClampedArray,
  imgWidth: number,
  imgHeight: number,
  cellWidth: number,
  cellHeight: number
): number {
  let total = 0;
  let count = 0;

  // sample from four corners
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
