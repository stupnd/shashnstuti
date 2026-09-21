/** Generates the PWA icons into public/icons. Run: npm run icons */
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const svg = (size: number, padding = 0) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="${padding ? 0 : 22}" fill="#faf8f4"/>
  <g transform="translate(50 52) scale(${2.6 - padding / 12})" fill="none" stroke="#e0464f" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <path d="M0 8.3c-1-.8-7.6-5.3-8.2-9.9C-8.6-4.9-6.4-7.1-4-6.9c1.6.1 2.9 1 4 2.6 1.1-1.6 2.4-2.5 4-2.6 2.4-.2 4.6 2 4.2 5.3-.6 4.6-7.2 9.1-8.2 9.9Z"/>
  </g>
</svg>`;

async function main() {
  await mkdir("public/icons", { recursive: true });
  const out: [string, number, number][] = [
    ["public/icons/icon-192.png", 192, 0],
    ["public/icons/icon-512.png", 512, 0],
    ["public/icons/maskable-512.png", 512, 10],
    ["public/icons/apple-touch-icon.png", 180, 0],
  ];
  for (const [file, size, pad] of out) {
    await writeFile(file, await sharp(Buffer.from(svg(size, pad))).resize(size, size).png().toBuffer());
    console.log("wrote", file);
  }
  await writeFile("public/favicon.svg", svg(64));
}
main();
