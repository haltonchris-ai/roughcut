import "server-only";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { buildPublicUrl } from "@roughcut/shared";

export interface PdfLabelInput {
  publicCode: string;
  shortCode: string;
}

// Letter page (8.5x11in) of 2x5in labels: 4 columns x 2 rows = 8 per page.
// Uses pdfkit's built-in Helvetica — no system/bundled font dependency,
// which is the point of this being the "always works" fallback path.
export async function generateLabelsPdf(boxes: PdfLabelInput[], webOrigin: string): Promise<Buffer> {
  const doc = new PDFDocument({ size: "letter", margin: 18 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const PAGE_W = 8.5 * 72;
  const PAGE_H = 11 * 72;
  const LABEL_W = 2 * 72;
  const LABEL_H = 5 * 72;
  const COLS = 4;
  const ROWS = 2;
  const marginX = (PAGE_W - COLS * LABEL_W) / 2;
  const marginY = (PAGE_H - ROWS * LABEL_H) / 2;

  for (let i = 0; i < boxes.length; i++) {
    const posOnPage = i % (COLS * ROWS);
    if (i > 0 && posOnPage === 0) doc.addPage();

    const col = posOnPage % COLS;
    const row = Math.floor(posOnPage / COLS);
    const x = marginX + col * LABEL_W;
    const y = marginY + row * LABEL_H;

    await drawLabel(doc, boxes[i]!, webOrigin, x, y, LABEL_W, LABEL_H);
  }

  doc.end();
  return done;
}

async function drawLabel(
  doc: PDFKit.PDFDocument,
  box: PdfLabelInput,
  webOrigin: string,
  x: number,
  y: number,
  w: number,
  h: number
): Promise<void> {
  // Cut/registration guide.
  doc.rect(x, y, w, h).strokeColor("#cccccc").lineWidth(0.5).stroke();

  const qrSize = Math.min(w, h) * 0.5; // comfortably over the 1in minimum at this page scale
  const qrPng = await QRCode.toBuffer(buildPublicUrl(webOrigin, box.publicCode), {
    margin: 0,
    width: Math.round(qrSize * 4), // oversample for crisper embedding
  });

  const qrX = x + (w - qrSize) / 2;
  const qrY = y + h * 0.18;
  doc.image(qrPng, qrX, qrY, { width: qrSize, height: qrSize });

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor("#000000")
    .text(box.shortCode, x, qrY + qrSize + 14, { width: w, align: "center" });

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#000000")
    .text("RoughCUT", x, y + h - 26, { width: w, align: "center", characterSpacing: 1 });
}
