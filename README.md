# ascii motion

turn any image into animated ascii art

## how it works

the conversion takes an image through four stages:

```
                    ┌─────────────┐
                    │  input.png  │
                    └──────┬──────┘
                           │
                           v
              ┌────────────────────────┐
              │   1. load & scale      │
              │                        │
              │   scale the image so   │
              │   it fits within the   │
              │   max column width     │
              └───────────┬────────────┘
                          │
                          v
              ┌────────────────────────┐
              │   2. grid sampling     │
              │                        │
              │   divide into cells    │
              │   (6x9 px default)     │
              │                        │
              │   ┌──┬──┬──┬──┬──┐     │
              │   │  │  │  │  │  │     │
              │   ├──┼──┼──┼──┼──┤     │
              │   │  │  │  │  │  │     │
              │   ├──┼──┼──┼──┼──┤     │
              │   │  │  │  │  │  │     │
              │   └──┴──┴──┴──┴──┘     │
              └───────────┬────────────┘
                          │
                          v
              ┌────────────────────────┐
              │   3. brightness map    │
              │                        │
              │   for each cell:       │
              │   - average pixel      │
              │     brightness using   │
              │     0.299r + 0.587g    │
              │     + 0.114b           │
              │   - check coverage     │
              │     against background │
              │   - skip cells below   │
              │     30% coverage       │
              └───────────┬────────────┘
                          │
                          v
              ┌────────────────────────┐
              │   4. character map     │
              │                        │
              │   brightness -> char   │
              │                        │
              │   dark ■■■ @#%&$8BWM   │
              │        ■■  *oahkbdpq   │
              │        ■   wmZO0QLCJ   │
              │        ░   UYXzcvunx   │
              │   lite ░░  rjft/|()1   │
              │        ░░░ {}[]?-_+~   │
              │            <>i!lI;:,   │
              │   none     "^`.        │
              └───────────┬────────────┘
                          │
                          v
              ┌────────────────────────┐
              │   5. svg output        │
              │                        │
              │   each character is a  │
              │   <text x y> element   │
              │   at its grid position │
              │                        │
              │   the shape comes from │
              │   positions, not the   │
              │   characters — so you  │
              │   can scramble chars   │
              │   and the silhouette   │
              │   stays intact         │
              └───────────┬────────────┘
                          │
                          v
                    ┌─────────────┐
                    │  output.svg │
                    └─────────────┘
```

the key insight: character positions encode the shape. the actual characters encode density/brightness. this means you can swap characters randomly on an interval and get a living, breathing animation while the image stays recognizable.

```
frame 1          frame 2          frame 3
  @#%&             $8BW             #%&$
 oahkb            dpqwm            ahkbd
ZO0QLC           JUYXzc           O0QLCJ
```

## cli

convert any image to an ascii svg from the command line.

```
npm run convert -- <input> [options]
```

### options

```
-o, --output <path>  output svg path (default: <input-name>.svg)
-d, --density <n>    cell width in px, smaller = more detail (default: 6)
-c, --color <hex>    fill color for characters (default: #d4d4d4)
-w, --max-width <n>  max columns of ascii output (default: 120)
-f, --font-size <n>  font size in the svg (default: 8)
-t, --threshold <n>  coverage threshold 0-1 (default: 0.3)
-h, --help           show help
```

### examples

```bash
# basic conversion
npm run convert -- photo.png

# output to a specific path with higher detail
npm run convert -- photo.png -o public/ascii-photo.svg -d 4

# white characters, tighter grid
npm run convert -- photo.png -c "#ffffff" -d 3 -w 200

# lower threshold to capture more subtle details
npm run convert -- photo.png -t 0.15

# or run the script directly
node scripts/convert-images.mjs photo.png -o output.svg
```

### what the options do

**density** controls the cell size. smaller cells = more characters = more detail, but larger svg files.

```
density 8 (coarse)     density 4 (fine)

  @ # % &               @ # % & $ 8 B W
  o a h k               * o a h k b d p
  Z O 0 Q               q w m Z O 0 Q L
                         C J U Y X z c v
                         u n x r j f t /
```

**threshold** controls how much of a cell needs to differ from the background before a character is placed. lower values capture more subtle edges, higher values only show prominent features.

```
threshold 0.5 (strict)    threshold 0.15 (loose)

      @@@@                  ..::@@@@::..
      @##@                 .:;@####@;:.
      @##@                 .:@######@:.
      @@@@                  ..::@@@@::..
```

**color** sets the svg fill color for all characters. use any hex value.

```bash
-c "#d4d4d4"   # light gray (default)
-c "#ffffff"   # white
-c "#00ff41"   # matrix green
```

## api

use the converter programmatically in your own scripts or apps.

```js
import { imageToAsciiSvg } from 'ascii-motion/convert'
```

### imageToAsciiSvg(imagePath, options?)

converts an image file to an ascii svg string.

```js
const { svg, cells, gridCols, gridRows } = await imageToAsciiSvg('photo.png', {
  cellWidth: 4,
  color: '#ffffff',
})
```

**options**

| option | type | default | description |
|---|---|---|---|
| `cellWidth` | number | 6 | cell width in px (smaller = more detail) |
| `cellHeight` | number | cellWidth * 1.5 | cell height in px |
| `maxWidth` | number | 120 | max columns of ascii output |
| `fontSize` | number | 8 | font size in the svg |
| `coverageThreshold` | number | 0.3 | min cell coverage to place a character (0-1) |
| `color` | string | #d4d4d4 | fill color for ascii characters |

**returns** `Promise<object>`

| field | type | description |
|---|---|---|
| `svg` | string | the full svg markup |
| `cells` | number | total characters placed |
| `gridCols` | number | columns in the ascii grid |
| `gridRows` | number | rows in the ascii grid |

### examples

```js
import { imageToAsciiSvg } from 'ascii-motion/convert'
import { writeFileSync } from 'fs'

// basic
const { svg } = await imageToAsciiSvg('photo.png')
writeFileSync('output.svg', svg)

// high detail, white on black
const result = await imageToAsciiSvg('photo.png', {
  cellWidth: 3,
  color: '#ffffff',
  maxWidth: 200,
})
writeFileSync('output.svg', result.svg)
console.log(`${result.cells} characters in ${result.gridCols}x${result.gridRows} grid`)

// loose threshold to capture subtle edges
const { svg: detailed } = await imageToAsciiSvg('photo.png', {
  coverageThreshold: 0.15,
})
```

> requires `sharp` as a peer dependency (included with next.js projects).

## dev

```bash
npm install
npm run dev
```
