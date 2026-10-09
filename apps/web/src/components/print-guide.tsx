// The exact label sheets that match the downloadable PDF layout. Kept in one
// place so the Stickers and Pricing pages never disagree.
const STAPLES_AVERY = "https://www.staples.com/avery-trueblock-inkjet-shipping-labels-2-x-4-white-10-labels-sheet-50-sheets-box-8363/product_792115";
const STAPLES_BRAND = "https://www.staples.com/staples-inkjet-laser-shipping-labels-2-x-4-white-10-labels-sheet-100-sheets-pack-18060ct/product_2726400";

export function PrintGuide() {
  return (
    <div className="card p-5 text-sm">
      <h2 className="font-display text-lg font-extrabold">Print your own stickers</h2>
      <p className="mt-2 text-muted">
        The PDF is laid out for standard <strong className="text-ink">2&quot; × 4&quot; white shipping labels, 10 per
        sheet</strong> — Avery 5163 or 8363, or any equivalent. Letter-size sheets, nothing to cut.
      </p>
      <ul className="mt-3 space-y-1.5">
        <li>
          <a href={STAPLES_AVERY} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            Avery 8363 (inkjet) at Staples ↗
          </a>
        </li>
        <li>
          <a href={STAPLES_BRAND} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            Staples brand 2&quot; × 4&quot; (inkjet / laser) at Staples ↗
          </a>
        </li>
      </ul>
      <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-muted">
        <li>Buy white labels that match your printer — inkjet or laser, not both.</li>
        <li>
          Page 1 of the PDF is a &quot;start here&quot; sheet for your crew. Print it on <strong className="text-ink">plain paper</strong>,
          then print pages 2 and up on the label sheets.
        </li>
        <li>
          Print the PDF at <strong className="text-ink">Actual size (100%)</strong> on Letter paper. Turn off
          &quot;Fit to page&quot; and &quot;Scale&quot;, or the labels will not line up.
        </li>
        <li>Print one test sheet first and scan a sticker with the app before printing the whole order.</li>
      </ol>
      <p className="mt-4 text-faint">
        Rough-in boxes get dusty. Wipe the surface before sticking, or use durable (polyester) labels of the same size.
      </p>
    </div>
  );
}
