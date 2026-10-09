import "server-only";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { buildPublicUrl } from "@roughcut/shared";

export interface PdfLabelInput {
  publicCode: string;
  shortCode: string;
}

// Optional "start here" page printed first, on plain paper, ahead of the
// sticker sheets.
export interface CoverInfo {
  companyName: string;
  quantity: number;
  firstCode: string;
  lastCode: string;
  date: string;
}

// Letter sheets of 2x4in labels, 10 per sheet (2 columns x 5 rows): Avery
// 5163 / 8363 and every equivalent "2 x 4 shipping label" (e.g. Staples
// brand). Measurements are Avery's published template, so the artwork lands
// inside the pre-cut labels when printed at 100% / "Actual size".
// Uses pdfkit's built-in Helvetica — no font files to ship, which is the
// point of this being the "always works" fallback path.
export const SHEET_LAYOUT = {
  name: "Avery 5163 / 8363 (2 x 4 in, 10 per sheet)",
  pageW: 8.5 * 72,
  pageH: 11 * 72,
  labelW: 4 * 72,
  labelH: 2 * 72,
  cols: 2,
  rows: 5,
  marginLeft: 0.15625 * 72, // 5/32"
  marginTop: 0.5 * 72,
  pitchX: 4.1875 * 72, // label width + 3/16" gutter
  pitchY: 2 * 72,
} as const;

const INK = "#181B20";
const RUST = "#C1672B";
const BOLT = "M13 3L4 14h6l-1 7 9-11h-6l1-7z"; // 24x24 lightning-bolt path

export async function generateLabelsPdf(
  boxes: PdfLabelInput[],
  webOrigin: string,
  cover?: CoverInfo
): Promise<Buffer> {
  const L = SHEET_LAYOUT;
  const doc = new PDFDocument({ size: "letter", margin: 0 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  if (cover) await drawCover(doc, webOrigin, cover);

  const perPage = L.cols * L.rows;
  for (let i = 0; i < boxes.length; i++) {
    const pos = i % perPage;
    if ((i > 0 && pos === 0) || (i === 0 && cover)) doc.addPage();
    const col = pos % L.cols;
    const row = Math.floor(pos / L.cols);
    await drawLabel(doc, boxes[i]!, webOrigin, L.marginLeft + col * L.pitchX, L.marginTop + row * L.pitchY);
  }

  doc.end();
  return done;
}

function drawBolt(doc: PDFKit.PDFDocument, x: number, y: number, size: number) {
  doc.save();
  doc.roundedRect(x, y, size, size, size * 0.24).fill(INK);
  const s = (size * 0.56) / 24;
  doc.translate(x + size * 0.22, y + size * 0.22).scale(s);
  doc.path(BOLT).lineWidth(2.2).lineJoin("round").lineCap("round").strokeColor(RUST).stroke();
  doc.restore();
}

// No outline is drawn: the labels are pre-cut, and a printed border would
// show on the finished sticker. The artwork stays inside a safe margin so a
// printer that is a little off still leaves the QR code and its quiet zone
// on the label.
async function drawLabel(
  doc: PDFKit.PDFDocument,
  box: PdfLabelInput,
  webOrigin: string,
  x: number,
  y: number
): Promise<void> {
  const { labelW: w, labelH: h } = SHEET_LAYOUT;
  const pad = 0.16 * 72;

  const qrSize = 1.6 * 72; // 1.6in, well over the 1in minimum
  const qrPng = await QRCode.toBuffer(buildPublicUrl(webOrigin, box.publicCode), {
    margin: 2, // built-in quiet zone, so the code scans even on a dark or busy box
    width: Math.round(qrSize * 4), // oversample for a crisp print
    errorCorrectionLevel: "M", // no logo inside the code: keep every bit of damage tolerance
  });
  const qrX = x + pad;
  const qrY = y + (h - qrSize) / 2;
  doc.image(qrPng, qrX, qrY, { width: qrSize, height: qrSize });

  const textX = qrX + qrSize + pad;
  const textW = x + w - pad - textX;

  doc
    .font("Helvetica-Bold")
    .fontSize(30)
    .fillColor("#000000")
    .text(box.shortCode, textX, y + h / 2 - 34, { width: textW, align: "left", lineBreak: false });

  // Brand mark sits beside the caption, outside the QR code.
  const markSize = 26;
  const markY = y + h / 2 + 6;
  drawBolt(doc, textX, markY, markSize);
  const captionX = textX + markSize + 7;
  const captionW = x + w - pad - captionX;
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#333333")
    .text("Scan with the", captionX, markY + 1, { width: captionW, lineBreak: false })
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("#000000")
    .text("RoughCUT app", captionX, markY + 12, { width: captionW, lineBreak: false });
}

async function qrBuffer(url: string, px: number): Promise<Buffer> {
  return QRCode.toBuffer(url, { margin: 2, width: px, errorCorrectionLevel: "M" });
}

// Page 1: how to get started. Printed on plain paper — the sticker sheets
// start on page 2.
async function drawCover(doc: PDFKit.PDFDocument, webOrigin: string, c: CoverInfo): Promise<void> {
  const M = 54;
  const W = SHEET_LAYOUT.pageW - M * 2;
  const host = webOrigin.replace(/^https?:\/\//, "");

  drawBolt(doc, M, M, 34);
  doc.font("Helvetica-Bold").fontSize(26).fillColor(INK).text("RoughCUT", M + 46, M + 4, { lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(30).fillColor(INK).text("Welcome. Start here.", M, M + 62, { width: W });
  doc
    .font("Helvetica")
    .fontSize(12)
    .fillColor("#444444")
    .text(
      `${c.companyName} · ${c.quantity} stickers (${c.firstCode} to ${c.lastCode}) · ${c.date}`,
      M,
      M + 104,
      { width: W }
    );

  // Two QR codes: the app, and the web login.
  const qrY = M + 150;
  const qr = 118;
  const colW = W / 2;
  const items = [
    { n: "1", title: "Get the app", sub: "Scan with your iPhone camera", url: `${webOrigin}/get` },
    { n: "2", title: "Log in", sub: `Or go to ${host}/login`, url: `${webOrigin}/login` },
  ];
  for (let i = 0; i < items.length; i++) {
    const it = items[i]!;
    const x = M + i * colW;
    doc.circle(x + 11, qrY + 11, 11).fill(INK);
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#FFFFFF").text(it.n, x, qrY + 6, { width: 22, align: "center", lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(15).fillColor(INK).text(it.title, x + 30, qrY + 4, { lineBreak: false });
    doc.image(await qrBuffer(it.url, qr * 4), x, qrY + 34, { width: qr, height: qr });
    doc.font("Helvetica").fontSize(10).fillColor("#444444").text(it.sub, x, qrY + 34 + qr + 6, { width: colW - 16 });
  }

  const steps: Array<[string, string]> = [
    ["3", "Print the stickers. Pages 2 and up are the stickers: load Avery 5163 / 8363 labels (2 x 4 in, white, 10 per sheet) and print at Actual size (100%). Page 1, this page, goes on plain paper."],
    ["4", "Stick one on each box location, then open a job in the app and tap Scan sticker. The first scan of a sticker lets the foreman enter the box type, size, height and notes."],
    ["5", "Installers scan the same sticker later to see the spec, and mark the box installed when it is done."],
  ];
  let y = qrY + 34 + qr + 60;
  for (const [n, text] of steps) {
    doc.circle(M + 11, y + 11, 11).fill(INK);
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#FFFFFF").text(n, M, y + 6, { width: 22, align: "center", lineBreak: false });
    doc.font("Helvetica").fontSize(11.5).fillColor(INK).text(text, M + 34, y + 3, { width: W - 34 });
    y += doc.heightOfString(text, { width: W - 34 }) + 22;
  }

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#666666")
    .text(
      "Log in with the email and password for your RoughCUT account. New crew members can be invited from Team on the website.",
      M,
      SHEET_LAYOUT.pageH - M - 14,
      { width: W }
    );
}
