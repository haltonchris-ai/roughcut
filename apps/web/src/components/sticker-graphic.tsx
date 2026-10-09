import QRCode from "qrcode";

// Hero graphic from the mockup: a tilted white sticker with a QR code on a
// navy panel. The QR is a real, scannable code pointing at the site itself.
export async function StickerGraphic({ url, code = "RC-0021" }: { url: string; code?: string }) {
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 0,
    width: 132,
    color: { dark: "#181B20", light: "#FFFFFF" },
  });

  return (
    <div className="relative flex h-[420px] w-full max-w-[340px] items-end justify-center overflow-hidden rounded-[20px] bg-navy pb-14">
      {/* faint wall-stud shape, as in the mockup */}
      <div className="absolute left-10 top-10 h-[120px] w-[60px] rounded bg-white/5" />
      <div className="absolute right-8 top-16 h-2 w-24 rounded bg-white/5" />
      <div
        className="flex h-[220px] w-[220px] -rotate-3 flex-col items-center justify-center gap-3.5 rounded-2xl border border-line bg-white p-5 shadow-[0_24px_48px_-20px_rgba(20,28,51,0.6)]"
        role="img"
        aria-label={`RoughCUT sticker ${code} with QR code`}
      >
        <div className="h-[132px] w-[132px]" dangerouslySetInnerHTML={{ __html: svg }} />
        <span className="font-display text-xs font-extrabold tracking-[0.08em] text-faint">{code}</span>
      </div>
    </div>
  );
}
