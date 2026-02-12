// ascii character ramp from dense to light
const ASCII_RAMP = '@#%&$8BWM*oahkbdpqwmZO0QLCJUYXzcvunxrjft/|()1{}[]?-_+~<>i!lI;:,"^`. ';

export interface AsciiOptions {
  cellWidth?: number;
  cellHeight?: number;
  maxWidth?: number;
}

export interface AsciiFrame {
  lines: string[];
  width: number;
  height: number;
}

/**
 * converts an image to ascii art by sampling brightness in a grid
 */
export function imageToAscii(
  img: HTMLImageElement,
  options: AsciiOptions = {}
): AsciiFrame {
  const { cellWidth = 6, cellHeight = 9, maxWidth = 120 } = options;

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

  const gridCols = Math.floor(imgWidth / cellWidth);
  const gridRows = Math.floor(imgHeight / cellHeight);

  const lines: string[] = [];

  for (let row = 0; row < gridRows; row++) {
    let line = '';
    for (let col = 0; col < gridCols; col++) {
      const startX = col * cellWidth;
      const startY = row * cellHeight;

      // compute average brightness for this cell
      let totalBrightness = 0;
      let count = 0;

      for (let y = startY; y < startY + cellHeight && y < imgHeight; y++) {
        for (let x = startX; x < startX + cellWidth && x < imgWidth; x++) {
          const idx = (y * imgWidth + x) * 4;
          const r = pixels[idx];
          const g = pixels[idx + 1];
          const b = pixels[idx + 2];
          // luminance formula
          totalBrightness += 0.299 * r + 0.587 * g + 0.114 * b;
          count++;
        }
      }

      const avgBrightness = totalBrightness / count;
      // map brightness (0-255) to ramp index
      // dark pixels -> dense characters (start of ramp)
      // bright pixels -> sparse characters (end of ramp)
      const rampIndex = Math.floor(
        (avgBrightness / 255) * (ASCII_RAMP.length - 1)
      );
      line += ASCII_RAMP[rampIndex];
    }
    lines.push(line);
  }

  return { lines, width: gridCols, height: gridRows };
}

/**
 * generates animation frames with subtle character variations
 */
export function createAsciiAnimation(
  baseFrame: AsciiFrame,
  frameCount: number = 8
): AsciiFrame[] {
  const frames: AsciiFrame[] = [baseFrame];

  for (let f = 1; f < frameCount; f++) {
    const newLines = baseFrame.lines.map((line) => {
      let newLine = '';
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        // 15% chance to shift the character slightly
        if (Math.random() < 0.15 && char !== ' ') {
          const currentIdx = ASCII_RAMP.indexOf(char);
          if (currentIdx >= 0) {
            // shift by -1, 0, or +1
            const shift = Math.floor(Math.random() * 3) - 1;
            const newIdx = Math.max(
              0,
              Math.min(ASCII_RAMP.length - 1, currentIdx + shift)
            );
            newLine += ASCII_RAMP[newIdx];
          } else {
            newLine += char;
          }
        } else {
          newLine += char;
        }
      }
      return newLine;
    });
    frames.push({
      lines: newLines,
      width: baseFrame.width,
      height: baseFrame.height,
    });
  }

  return frames;
}
