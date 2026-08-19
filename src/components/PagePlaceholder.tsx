// Temporary stand-in for a page that hasn't been rebuilt onto HeroUI v3 yet.
// App.tsx's route table is the real, final route structure (ported verbatim
// from the original App.jsx) — routes get their real page component swapped
// in as each one is built. Nothing about routing itself changes later.
export default function PagePlaceholder({ name }: { name: string }) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="text-sm font-medium text-muted">Not yet rebuilt</p>
      <h1 className="text-2xl font-semibold text-foreground">{name}</h1>
      <p className="text-sm text-muted">
        This page is still the old BeerCSS version in the source repo &mdash;
        it&rsquo;ll be rebuilt on HeroUI v3 in an upcoming batch.
      </p>
    </div>
  );
}
