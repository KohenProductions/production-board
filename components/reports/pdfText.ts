/**
 * RTL shaping and line wrapping for Hebrew PDF text.
 * Use rtl() before measuring/drawing so visual order is correct.
 */

/** Time range like 08:00–12:30 or 08:00-12:30 */
const TIME_OR_RANGE = /^\d{1,2}:\d{2}(?:[–\-]\d{1,2}:\d{2})?/;
/** Number with optional decimal */
const NUMBER = /^\d+([.,]\d+)?/;
/** Latin/ASCII word (URLs, emails, numbers already matched) */
const LATIN = /^[A-Za-z0-9@._\-\/:]+/;

function tokenize(s: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < s.length) {
    const rest = s.slice(i);
    let match: RegExpMatchArray | null = null;
    if ((match = rest.match(TIME_OR_RANGE))) {
      tokens.push(match[0]);
      i += match[0].length;
    } else if ((match = rest.match(NUMBER))) {
      tokens.push(match[0]);
      i += match[0].length;
    } else if ((match = rest.match(LATIN))) {
      tokens.push(match[0]);
      i += match[0].length;
    } else {
      tokens.push(rest[0]!);
      i += 1;
    }
  }
  return tokens;
}

function isPreservedToken(t: string): boolean {
  return (
    TIME_OR_RANGE.test(t) ||
    NUMBER.test(t) ||
    LATIN.test(t)
  );
}

/**
 * RTL shaping: reverse token order, preserve numbers/times/latin as-is,
 * reverse characters in Hebrew/punctuation tokens.
 * Apply before measuring and drawing so the string is in visual order.
 */
export function rtl(s: string): string {
  if (!s.trim()) return s;
  const tokens = tokenize(s);
  const reversed = tokens.reverse();
  return reversed
    .map((t) => (isPreservedToken(t) ? t : t.split("").reverse().join("")))
    .join("");
}

export type PDFFont = {
  widthOfTextAtSize: (text: string, size: number) => number;
};

/**
 * Word-wrap text to fit maxWidth. Applies rtl() before measuring.
 * Returns array of lines (each line in visual/rtl form for drawing).
 */
export function wrapLines(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const visual = rtl(text);
  const words = visual.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? current + " " + word : word;
    const w = font.widthOfTextAtSize(candidate, fontSize);
    if (w <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) {
        current = word;
      } else {
        current = "";
        let i = 0;
        while (i < word.length) {
          let chunk = word[i]!;
          while (i + 1 < word.length && font.widthOfTextAtSize(chunk + word[i + 1], fontSize) <= maxWidth) {
            i += 1;
            chunk += word[i];
          }
          lines.push(chunk);
          i += 1;
        }
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}
