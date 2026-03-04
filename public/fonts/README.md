# PDF Hebrew fonts (Heebo)

PDF export uses **server-side HTML → PDF** (Puppeteer). The HTML template loads fonts from this folder via **absolute URL** (e.g. `https://your-domain.com/fonts/Heebo-Regular.ttf`) so Chromium can fetch them when generating the PDF. Place `Heebo-Regular.ttf` and `Heebo-Bold.ttf` here.

To create or refresh from npm:

```bash
cp node_modules/@fontsource/heebo/files/heebo-hebrew-400-normal.woff Heebo-Regular.woff
cp node_modules/@fontsource/heebo/files/heebo-hebrew-700-normal.woff Heebo-Bold.woff
cp Heebo-Regular.woff Heebo-Regular.ttf
cp Heebo-Bold.woff Heebo-Bold.ttf
```

For best Hebrew rendering you can replace the .ttf files with full TTF from [Google Fonts – Heebo](https://fonts.google.com/specimen/Heebo).
