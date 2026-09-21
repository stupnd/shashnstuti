/**
 * Best-effort date from a photo's filename. Pure — shared by the browser
 * add-moment flow and the Node import script.
 *
 * Handles things like:
 *   IMG_20230915_183012.jpg     PXL_20230915_183012123.jpg
 *   WhatsApp Image 2023-09-15 at 18.30.12.jpeg
 *   Screenshot 2023-09-15 at 6.30.12 PM.png   Screenshot_20230915-183012.png
 *   2023-09-15 18.30.12.jpg     20230915_183012.jpg
 */
const PATTERNS: RegExp[] = [
  // 2023-09-15 or 2023_09_15 or 2023.09.15
  /(20\d{2})[-_.](0[1-9]|1[0-2])[-_.](0[1-9]|[12]\d|3[01])/,
  // 20230915 preceded by a non-digit or start, followed by non-digit/end
  /(?:^|\D)(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?!\d)/,
];

export function dateFromFilename(filename: string): string | null {
  for (const re of PATTERNS) {
    const m = filename.match(re);
    if (!m) continue;
    const [, y, mo, d] = m;
    const year = Number(y);
    // sanity: photos from before digital cameras or from the future are noise
    if (year < 2000 || year > new Date().getFullYear() + 1) continue;
    return `${y}-${mo}-${d}`;
  }
  return null;
}
