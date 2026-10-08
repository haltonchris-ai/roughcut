export function SiteFooter() {
  return (
    <footer className="border-t border-line py-10">
      <div className="mx-auto max-w-page px-6 text-sm text-muted">
        <p>
          Rough<span className="text-accent">CUT</span> — spec the box, scan the sticker.
        </p>
        <p className="mt-2">© {new Date().getFullYear()} RoughCUT.</p>
      </div>
    </footer>
  );
}
