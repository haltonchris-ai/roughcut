import "server-only";
import path from "node:path";
import fs from "node:fs";
import QRCode from "qrcode";
import { Resvg } from "@resvg/resvg-js";
import { buildPublicUrl } from "@roughcut/shared";

// 2 x 5 in at 300 DPI.
const DPI = 300;
const WIDTH = 2 * DPI; // 600
const HEIGHT = 5 * DPI; // 1500
const QR_SIZE = Math.round(1.4 * DPI); // comfortably over the spec's 1in minimum

const FONTS_DIR = path.join(process.cwd(), "src/lib/print/fonts");

export interface LabelInput {
  publicCode: string;
  shortCode: string;
}

// Renders one 2x5in label: white background, QR (>= 1in sq), quiet margin,
// short code under the QR, the word "RoughCUT". No customer/job/spec data —
// the QR payload is just {WEB_ORIGIN}/b/{public_code}, per spec.
export async function generateLabelPng(input: LabelInput, webOrigin: string): Promise<Buffer> {
  const url = buildPublicUrl(webOrigin, input.publicCode);
  const qrDataUrl = await QRCode.toDataURL(url, {
    margin: 0,
    width: QR_SIZE,
    color: { dark: "#000000", light: "#ffffff" },
  });

  const qrX = (WIDTH - QR_SIZE) / 2;
  const qrY = 120;

  const svg = `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="#ffffff" />
      <image x="${qrX}" y="${qrY}" width="${QR_SIZE}" height="${QR_SIZE}" href="${qrDataUrl}" />
      <text x="${WIDTH / 2}" y="${qrY + QR_SIZE + 90}" font-family="DejaVu Sans Bold" font-size="52" font-weight="700" text-anchor="middle" fill="#000000">${esc(input.shortCode)}</text>
      <text x="${WIDTH / 2}" y="${HEIGHT - 70}" font-family="DejaVu Sans Bold" font-size="40" font-weight="700" text-anchor="middle" fill="#000000" letter-spacing="2">RoughCUT</text>
    </svg>
  `.trim();

  const resvg = new Resvg(svg, {
    font: {
      fontFiles: [path.join(FONTS_DIR, "DejaVuSans.ttf"), path.join(FONTS_DIR, "DejaVuSans-Bold.ttf")],
      loadSystemFonts: false,
      defaultFontFamily: "DejaVu Sans Bold",
    },
  });
  const rendered = resvg.render();
  return rendered.asPng();
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// Fails loudly at import time in dev if the bundled fonts didn't ship —
// cheaper to catch than a cryptic blank-text render in production.
if (!fs.existsSync(path.join(FONTS_DIR, "DejaVuSans-Bold.ttf"))) {
  console.warn("print/label-art: bundled font files missing at", FONTS_DIR);
}
